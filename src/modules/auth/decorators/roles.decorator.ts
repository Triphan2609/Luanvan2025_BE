/**
 * Decorator giả để duy trì tương thích trong code
 * Phân quyền sẽ được xử lý ở frontend và cơ sở dữ liệu
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Roles = (..._roles: string[]) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_target: object) => {
    // Không làm gì, chỉ để giữ tương thích với code
  };
};
