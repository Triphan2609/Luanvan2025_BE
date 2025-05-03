import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AccountsService } from '../../accounts/accounts.service';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.headers.authorization?.replace('Bearer ', '');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // Verify if refresh token is valid and not revoked
    const isValid = await this.authService.validateRefreshToken(
      refreshToken,
      payload.sub,
    );
    if (!isValid) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // Fetch account
    const account = await this.accountsService.findByUsername(payload.username);
    if (!account) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    return {
      ...account,
      role: payload.role,
      refreshToken,
    };
  }
}
