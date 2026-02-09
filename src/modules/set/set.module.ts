import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ISetCache, ISetRepository } from './domain/repositories';
import { InMemorySetCacheService } from './infrastructure/cache/in-memory-set-cache.service';
import { FileSystemSetRepository } from './infrastructure/persistence/filesystem-set.repository';
import { TypeOrmSetRepository } from './infrastructure/persistence/typeorm-set.repository';
import { SetOrmEntity } from './infrastructure/persistence/entities';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import { CreateSetUseCase } from './application/use-cases/create-set.use-case';
import { GetSetsUseCase } from './application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from './application/use-cases/get-set-by-id.use-case';
import { UpdateSetUseCase } from './application/use-cases/update-set.use-case';
import { DeleteSetUseCase } from './application/use-cases/delete-set.use-case';
import { SetController } from './presentation/controllers/set.controller';

const nodeEnv = process.env.NODE_ENV || 'dev';
// TEMPORARY: Force file system mode for all environments (including production)
const shouldInitializeDb = false; // nodeEnv !== 'dev' && nodeEnv !== 'test';

@Module({
  imports: [
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([SetOrmEntity]), DatabaseModule]
      : []),
  ],
  controllers: [SetController],
  providers: [
    // Cache service (still needed for some use cases)
    {
      provide: ISetCache,
      useClass: InMemorySetCacheService,
    },
    // Repository implementation (conditional based on environment)
    {
      provide: ISetRepository,
      useClass:
        // TEMPORARY: Always use file system
        FileSystemSetRepository, // nodeEnv === 'dev' || nodeEnv === 'test' ? FileSystemSetRepository : TypeOrmSetRepository,
    },
    // Use cases
    CreateSetUseCase,
    GetSetsUseCase,
    GetSetByIdUseCase,
    UpdateSetUseCase,
    DeleteSetUseCase,
  ],
  exports: [
    // Export cache and repository so other modules can access sets if needed
    ISetCache,
    ISetRepository,
  ],
})
export class SetModule {}
