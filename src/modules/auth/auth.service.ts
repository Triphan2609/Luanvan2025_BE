import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAccountDto } from '../accounts/dto/create-account.dto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async signup(
    createAccountDto: CreateAccountDto,
  ): Promise<{ message: string }> {
    // Kiểm tra tài khoản đã tồn tại
    const existingAccount = await this.accountsService.findByUsername(
      createAccountDto.username,
    );
    if (existingAccount) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    // Tạo tài khoản mới
    await this.accountsService.create(createAccountDto);

    return { message: 'Đăng ký tài khoản thành công' };
  }

  async login(username: string, password: string): Promise<any> {
    const account = await this.accountsService.findByUsername(username);
    if (!account) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    if (account.status === 'locked') {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    account.lastLogin = new Date();
    await this.accountsService.updateLastLogin(account.id, account.lastLogin);

    // Generate tokens
    const tokens = await this.getTokens(account);

    // Save refresh token
    await this.saveRefreshToken(account.id, tokens.refreshToken);

    // Trả về thông tin tài khoản cùng với tokens
    return {
      ...tokens,
      account: {
        id: account.id,
        username: account.username,
        fullName: account.fullName,
        email: account.email,
        role: account.role?.name || 'No Role',
        status: account.status,
        lastLogin: account.lastLogin,
      },
    };
  }

  async refreshTokens(refreshToken: string, accountId: string): Promise<any> {
    const account = await this.accountsService.findById(accountId);
    if (!account) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    // Verify refresh token validity
    const isValid = await this.validateRefreshToken(refreshToken, accountId);
    if (!isValid) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // Revoke old refresh token
    await this.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const tokens = await this.getTokens(account);

    // Save new refresh token
    await this.saveRefreshToken(account.id, tokens.refreshToken);

    return tokens;
  }

  async logout(
    accountId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    // Revoke all refresh tokens for the account
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    } else {
      await this.revokeAllRefreshTokens(accountId);
    }

    return { message: 'Đăng xuất thành công' };
  }

  async validateUser(username: string, password: string): Promise<any> {
    const account = await this.accountsService.findByUsername(username);

    if (!account) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return account;
  }

  async validateRefreshToken(
    token: string,
    accountId: string,
  ): Promise<boolean> {
    try {
      // Find token in database
      const refreshToken = await this.refreshTokenRepository.findOne({
        where: {
          token,
          accountId,
          isRevoked: false,
        },
      });

      if (!refreshToken) {
        return false;
      }

      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        await this.revokeRefreshToken(token);
        return false;
      }

      // Verify JWT signature
      await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  private async getTokens(
    account: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: account.id,
      username: account.username,
      role: account.role?.name || 'No Role',
    };

    // Create access token with short expiry
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });

    // Create refresh token with longer expiry
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(
    accountId: string,
    token: string,
  ): Promise<RefreshToken> {
    // Calculate expiration date based on config
    const expiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const expiresAt = this.calculateExpiryDate(expiresIn);

    // Create and save token
    const refreshToken = this.refreshTokenRepository.create({
      token,
      accountId,
      expiresAt,
      isRevoked: false,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update({ token }, { isRevoked: true });
  }

  private async revokeAllRefreshTokens(accountId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { accountId },
      { isRevoked: true },
    );
  }

  private calculateExpiryDate(expiresIn: string): Date {
    const date = new Date();
    const match = expiresIn.match(/^(\d+)(d|h|m|s)$/);

    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'd': // days
          date.setDate(date.getDate() + value);
          break;
        case 'h': // hours
          date.setHours(date.getHours() + value);
          break;
        case 'm': // minutes
          date.setMinutes(date.getMinutes() + value);
          break;
        case 's': // seconds
          date.setSeconds(date.getSeconds() + value);
          break;
      }
    } else {
      // Default: 7 days
      date.setDate(date.getDate() + 7);
    }

    return date;
  }
}
