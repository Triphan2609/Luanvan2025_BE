import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default_access_token_secret_key',
  refreshSecret:
    process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret_key',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
}));
