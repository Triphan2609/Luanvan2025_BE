import * as bcrypt from 'bcrypt';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAccountDto } from '../accounts/dto/create-account.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly jwtService: JwtService,
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

    const payload = {
      username: account.username,
      role: account.role?.name || 'No Role',
    };
    const accessToken = this.jwtService.sign(payload);

    // Trả về thông tin tài khoản cùng với accessToken
    return {
      accessToken,
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
}
