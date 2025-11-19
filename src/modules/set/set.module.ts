import { Module } from '@nestjs/common';
import { ISetCache } from './domain/repositories/set-cache.interface';
import { InMemorySetCacheService } from './infrastructure/cache/in-memory-set-cache.service';
import { CreateSetUseCase } from './application/use-cases/create-set.use-case';
import { GetSetsUseCase } from './application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from './application/use-cases/get-set-by-id.use-case';
import { SetController } from './presentation/controllers/set.controller';

@Module({
  controllers: [SetController],
  providers: [
    // Repository implementations
    {
      provide: ISetCache,
      useClass: InMemorySetCacheService,
    },
    // Use cases
    CreateSetUseCase,
    GetSetsUseCase,
    GetSetByIdUseCase,
  ],
  exports: [
    // Export cache so other modules can access sets if needed
    ISetCache,
  ],
})
export class SetModule {}

