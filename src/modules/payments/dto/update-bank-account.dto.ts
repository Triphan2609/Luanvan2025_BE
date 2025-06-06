import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBankAccountDto {
  @ApiProperty({ description: 'Bank name', required: false })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ description: 'Account number', required: false })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiProperty({ description: 'Account name', required: false })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiProperty({ description: 'Bank branch', required: false })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiProperty({
    description: 'Swift code for international transfers',
    required: false,
  })
  @IsString()
  @IsOptional()
  swiftCode?: string;

  @ApiProperty({ description: 'Account description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the account is active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'URL to the bank logo', required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
