import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1782489600000 implements MigrationInterface {
  name = 'InitialSchema1782489600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "department" AS ENUM ('EFM', 'FSS', 'AVS', 'ASS')`,
    );

    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "parent_id" uuid,
        "name" varchar(255) NOT NULL,
        "location_number" varchar(64) NOT NULL,
        "department" "department",
        "capacity" int,
        "open_hours" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_locations_parent" FOREIGN KEY ("parent_id")
          REFERENCES "locations"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_locations_capacity"
          CHECK ("capacity" IS NULL OR "capacity" > 0)
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_locations_location_number" ON "locations" ("location_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_locations_parent_id" ON "locations" ("parent_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "location_id" uuid NOT NULL,
        "department" "department" NOT NULL,
        "attendee_count" int NOT NULL,
        "start_at" timestamptz NOT NULL,
        "end_at" timestamptz NOT NULL,
        "booked_by" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_location" FOREIGN KEY ("location_id")
          REFERENCES "locations"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_bookings_attendee_count" CHECK ("attendee_count" > 0),
        CONSTRAINT "CHK_bookings_time_range" CHECK ("end_at" > "start_at")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_bookings_location_id" ON "bookings" ("location_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_time_range" ON "bookings" ("location_id", "start_at", "end_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_bookings_time_range"`);
    await queryRunner.query(`DROP INDEX "idx_bookings_location_id"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP INDEX "idx_locations_parent_id"`);
    await queryRunner.query(`DROP INDEX "idx_locations_location_number"`);
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TYPE "department"`);
  }
}
