import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; account: any }> {
    const account = await this.accountsService.findByUsername(username);

    if (!account || account.password !== password) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const payload = { username: account.username, role: account.role };
    const accessToken = this.jwtService.sign(payload);

    // Trả về accessToken và thông tin tài khoản
    return { accessToken, account };
  }
}
