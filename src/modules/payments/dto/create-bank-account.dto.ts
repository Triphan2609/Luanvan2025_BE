import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Bank name' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ description: 'Account number' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

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

  @ApiProperty({ description: 'Whether the account is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'URL to the bank logo', required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
