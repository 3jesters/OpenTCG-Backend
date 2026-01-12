import { DataSource } from 'typeorm';
import { SetOrmEntity } from '../src/modules/set/infrastructure/persistence/entities/set.orm-entity';

/**
 * Migration script to add ownerId column to sets table
 * Sets all existing sets to ownerId = 'system' (making them global)
 */
async function migrateSetsAddOwner() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'opentcg',
    entities: [SetOrmEntity],
    synchronize: false, // Never use synchronize in migrations
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if ownerId column already exists
      const table = await queryRunner.getTable('sets');
      const hasOwnerIdColumn = table?.columns.some(
        (col) => col.name === 'ownerId',
      );

      if (hasOwnerIdColumn) {
        console.log('⚠️  ownerId column already exists, skipping migration');
        await queryRunner.rollbackTransaction();
        return;
      }

      // Add ownerId column
      console.log('📝 Adding ownerId column to sets table...');
      await queryRunner.query(`
        ALTER TABLE "sets" 
        ADD COLUMN "ownerId" VARCHAR NOT NULL DEFAULT 'system'
      `);

      // Update existing sets to have ownerId = 'system' and official = true
      console.log('📝 Updating existing sets to be global (ownerId = system, official = true)...');
      await queryRunner.query(`
        UPDATE "sets" 
        SET "ownerId" = 'system', "official" = true
        WHERE "ownerId" IS NULL OR "ownerId" = ''
      `);

      // Add index on ownerId for query performance
      console.log('📝 Adding index on ownerId...');
      await queryRunner.query(`
        CREATE INDEX "IDX_sets_ownerId" ON "sets" ("ownerId")
      `);

      await queryRunner.commitTransaction();
      console.log('✅ Migration completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateSetsAddOwner()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateSetsAddOwner };
