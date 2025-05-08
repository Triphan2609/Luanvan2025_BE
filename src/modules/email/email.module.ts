import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
          port: configService.get<number>('EMAIL_PORT', 465),
          secure: configService.get<boolean>('EMAIL_SECURE', true),
          auth: {
            user: configService.get<string>('EMAIL_USER', ''),
            pass: configService.get<string>('EMAIL_PASSWORD', ''),
          },
        },
        defaults: {
          from: `"${configService.get<string>('EMAIL_FROM_NAME', 'Hotel Management')}" <${configService.get<string>('EMAIL_FROM', 'tript2609@gmail.com')}>`,
        },
        template: {
          dir: join(__dirname, './templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
