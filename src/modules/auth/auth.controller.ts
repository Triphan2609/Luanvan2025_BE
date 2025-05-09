import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAccountDto } from '../accounts/dto/create-account.dto';
import { Public } from './guards/public.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: any;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() createAccountDto: CreateAccountDto) {
    return this.authService.signup(createAccountDto);
  }

  @Public()
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      const result = await this.authService.login(body.username, body.password);

      return result;
    } catch (error) {
      console.error(`Login failed for user ${body.username}: ${error.message}`);
      throw error;
    }
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: RequestWithUser,
  ) {
    const accountId = req.user.id;
    return this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      accountId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: RequestWithUser) {
    const accountId = req.user.id;
    const refreshToken = req.body?.refreshToken;
    return this.authService.logout(accountId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: RequestWithUser) {
    return {
      account: {
        id: req.user.id,
        username: req.user.username,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role?.name || 'No Role',
        status: req.user.status,
        lastLogin: req.user.lastLogin,
      },
    };
  }
}
