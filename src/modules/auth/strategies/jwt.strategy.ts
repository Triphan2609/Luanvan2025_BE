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
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    // Find the account by id (sub) instead of username
    const account = await this.accountsService.findById(payload.sub);

    if (!account) {
      throw new Error('Tài khoản không tồn tại');
    }

    // Xử lý trường hợp thiếu role trong payload nhưng account có role
    let role = payload.role;

    if (!role && account.role) {
      role = account.role.name;
    }

    return {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      email: account.email,
      role: role,
      status: account.status,
      lastLogin: account.lastLogin,
    };
  }
}
