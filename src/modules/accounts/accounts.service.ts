import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>, // Thêm roleRepository
  ) {}

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find({
      relations: ['role'], // Lấy kèm thông tin role
    });
  }

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const { roleId, password, ...accountData } = createAccountDto;

    console.log(`Creating account with roleId: ${roleId}`);

    // Kiểm tra vai trò
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      console.log(`Role not found with ID: ${roleId}`);
      throw new NotFoundException('Vai trò không tồn tại');
    }

    console.log(
      `Role found: ${JSON.stringify({
        id: role.id,
        name: role.name,
      })}`,
    );

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo tài khoản
    const account = this.accountsRepository.create({
      ...accountData,
      password: hashedPassword,
      role,
    });

    console.log(
      `Account created with data: ${JSON.stringify({
        username: account.username,
        fullName: account.fullName,
        email: account.email,
        roleId: role.id,
        roleName: role.name,
      })}`,
    );

    const savedAccount = await this.accountsRepository.save(account);

    console.log(`Account saved with ID: ${savedAccount.id}`);

    // Load the account with relationship again to ensure everything is properly saved
    const accountWithRelations = await this.accountsRepository.findOne({
      where: { id: savedAccount.id },
      relations: ['role'],
    });

    if (!accountWithRelations) {
      // Trả về tài khoản đã lưu nếu không thể tải lại với relations
      return savedAccount;
    }

    console.log(
      `Account loaded with relationships: ${JSON.stringify({
        id: accountWithRelations.id,
        username: accountWithRelations.username,
        role: accountWithRelations.role
          ? {
              id: accountWithRelations.role.id,
              name: accountWithRelations.role.name,
            }
          : null,
      })}`,
    );

    return accountWithRelations;
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<Account> {
    const { roleId, ...accountData } = updateAccountDto;

    const account = await this.accountsRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    if (roleId) {
      const role = await this.roleRepository.findOne({ where: { id: roleId } });
      if (!role) {
        throw new NotFoundException('Vai trò không tồn tại');
      }
      account.role = role;
    }

    Object.assign(account, accountData);
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

  async updateLastLogin(id: string, lastLogin: Date): Promise<void> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    account.lastLogin = lastLogin;
    await this.accountsRepository.save(account);
  }

  // Khóa hoặc mở khóa tài khoản
  async toggleStatus(id: string): Promise<Account> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    account.status = account.status === 'active' ? 'locked' : 'active';
    return this.accountsRepository.save(account);
  }

  // Xóa tài khoản
  async deleteAccount(id: string): Promise<void> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    await this.accountsRepository.remove(account);
  }

  async findByUsername(username: string): Promise<Account | null> {
    return this.accountsRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<Account | null> {
    return this.accountsRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }
}
