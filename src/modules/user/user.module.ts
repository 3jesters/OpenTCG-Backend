import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './presentation/controllers/user.controller';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { FindOrCreateUserUseCase } from './application/use-cases/find-or-create-user.use-case';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/user.repository';
import { FileSystemUserRepository } from './infrastructure/persistence/filesystem-user.repository';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';

const nodeEnv = process.env.NODE_ENV || 'dev';
// TEMPORARY: Force file system mode for all environments (including production)
const shouldInitializeDb = false; // nodeEnv !== 'dev' && nodeEnv !== 'test';

/**
 * User Module
 * Manages user accounts and profiles
 */
@Module({
  imports: [
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([UserOrmEntity]), DatabaseModule]
      : []),
  ],
  controllers: [UserController],
  providers: [
    // Repository implementation (conditional based on environment)
    {
      provide: IUserRepository,
      useClass:
        // TEMPORARY: Always use file system
        FileSystemUserRepository, // nodeEnv === 'dev' || nodeEnv === 'test' ? FileSystemUserRepository : TypeOrmUserRepository,
    },
    // Use cases
    FindOrCreateUserUseCase,
    GetUserByIdUseCase,
  ],
  exports: [IUserRepository, FindOrCreateUserUseCase, GetUserByIdUseCase],
})
export class UserModule {}
