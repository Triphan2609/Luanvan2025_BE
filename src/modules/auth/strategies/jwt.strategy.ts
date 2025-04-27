import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from '../../accounts/accounts.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService, // Inject ConfigService để lấy JWT_SECRET
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'), // Lấy JWT_SECRET từ biến môi trường
    });
  }

  async validate(payload: any) {
    const account = await this.accountsService.findByUsername(payload.username);
    if (!account) {
      throw new Error('Tài khoản không tồn tại');
    }
    return { ...account, role: payload.role };
  }
}
