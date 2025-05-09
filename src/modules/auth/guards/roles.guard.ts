import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(_context: ExecutionContext): boolean {
    // Luôn cho phép request đi qua không cần kiểm tra role
    // Phân quyền sẽ được xử lý ở frontend và cơ sở dữ liệu
    return true;
  }
}
