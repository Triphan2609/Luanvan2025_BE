import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find();
  }

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    // Kiểm tra tài khoản đã tồn tại
    const existingAccount = await this.accountsRepository.findOne({
      where: [
        { username: createAccountDto.username },
        { email: createAccountDto.email },
      ],
    });

    if (existingAccount) {
      throw new ConflictException('Tên đăng nhập hoặc email đã tồn tại');
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(createAccountDto.password, 10);

    // Tạo tài khoản mới
    const newAccount = this.accountsRepository.create({
      ...createAccountDto,
      password: hashedPassword,
    });

    return this.accountsRepository.save(newAccount);
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Kiểm tra trùng lặp username hoặc email
    if (updateAccountDto.username || updateAccountDto.email) {
      const existingAccount = await this.accountsRepository.findOne({
        where: [
          { username: updateAccountDto.username },
          { email: updateAccountDto.email },
        ],
      });

      if (existingAccount && existingAccount.id !== id) {
        throw new ConflictException('Tên đăng nhập hoặc email đã tồn tại');
      }
    }

    // Cập nhật thông tin tài khoản
    Object.assign(account, updateAccountDto);
    return this.accountsRepository.save(account);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    account.password = hashedPassword;

    await this.accountsRepository.save(account);
  }

  async toggleStatus(id: string): Promise<Account> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    account.status = account.status === 'active' ? 'locked' : 'active';
    return this.accountsRepository.save(account);
  }

  async findByUsername(username: string): Promise<Account | null> {
    return this.accountsRepository.findOne({ where: { username } });
  }
}
