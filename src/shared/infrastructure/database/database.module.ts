import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Database Module
 * Configures TypeORM with PostgreSQL connection
 * Only initializes TypeORM when NODE_ENV is not 'dev' or 'test'
 *
 * In dev/test mode, this module is imported but TypeORM is not initialized,
 * preventing database connection attempts. File-based repositories are used instead.
 */
const nodeEnv = process.env.NODE_ENV || 'dev';
// TEMPORARY: Force file system mode for all environments (including production)
const shouldInitializeDb = false; // nodeEnv !== 'dev' && nodeEnv !== 'test';

// Conditionally create the TypeORM module configuration
const typeOrmImports = shouldInitializeDb
  ? [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          return {
            type: 'postgres',
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            username: configService.get<string>('DB_USERNAME', 'postgres'),
            password: configService.get<string>('DB_PASSWORD', 'postgres'),
            database: configService.get<string>('DB_DATABASE', 'opentcg'),
            entities: [__dirname + '/../../../**/*.orm-entity{.ts,.js}'],
            synchronize: configService.get<string>('NODE_ENV') === 'staging',
            logging: configService.get<string>('NODE_ENV') === 'staging',
            ssl: {
              rejectUnauthorized: false, // RDS uses self-signed certificates
            },
          };
        },
      }),
    ]
  : [];

@Module({
  imports: typeOrmImports,
  // Only export TypeOrmModule if it was actually imported
  exports: shouldInitializeDb ? [TypeOrmModule] : [],
})
export class DatabaseModule {}
