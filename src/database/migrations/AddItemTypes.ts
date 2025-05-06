import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddItemTypes1718625841234 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm kiểu enum itemType
    await queryRunner.query(`
      CREATE TYPE "item_type_enum" AS ENUM ('long_term', 'single_use', 'multiple_use')
    `);

    // Thêm cột itemType vào bảng items
    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN "itemType" "item_type_enum" NOT NULL DEFAULT 'long_term'
    `);

    // Thêm cột inUseQuantity, maxUses, currentUses
    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN "inUseQuantity" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN "maxUses" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN "currentUses" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa các cột mới thêm
    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN "currentUses"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN "maxUses"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN "inUseQuantity"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN "itemType"
    `);

    // Xóa enum type
    await queryRunner.query(`
      DROP TYPE "item_type_enum"
    `);
  }
}
