import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ICardRepository } from './domain/repositories';
import { IFileReader } from './domain/ports/file-reader.interface';
import { FileSystemCardRepository } from './infrastructure/persistence/filesystem-card.repository';
import { TypeOrmCardRepository } from './infrastructure/persistence/typeorm-card.repository';
import { CardOrmEntity } from './infrastructure/persistence/entities';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import { FileReaderService } from './infrastructure/file-system/file-reader.service';

// File-based use cases (dev/test)
import { GetCardByIdUseCase } from './application/use-cases/get-card-by-id.use-case';
import { GetAvailableSetsUseCase } from './application/use-cases/get-available-sets.use-case';
import { PreviewCardUseCase } from './application/use-cases/preview-card.use-case';
import { PreviewSetUseCase } from './application/use-cases/preview-set.use-case';

// Database-based use cases (staging/production)
import { GetCardByIdDbUseCase } from './application/use-cases/get-card-by-id-db.use-case';
import { GetAvailableSetsDbUseCase } from './application/use-cases/get-available-sets-db.use-case';
import { PreviewCardDbUseCase } from './application/use-cases/preview-card-db.use-case';
import { PreviewSetDbUseCase } from './application/use-cases/preview-set-db.use-case';

import { CardController } from './presentation/controllers/card.controller';
import { SetModule } from '../set/set.module';
import {
  IGetCardByIdUseCase,
  IGetAvailableSetsUseCase,
  IPreviewCardUseCase,
  IPreviewSetUseCase,
  ICalculateCardStrengthUseCase,
} from './application/ports/card-use-cases.interface';
import { CardStrengthCalculatorService } from './domain/services/card-strength-calculator.service';
import { CalculateCardStrengthUseCase } from './application/use-cases/calculate-card-strength.use-case';

const nodeEnv = process.env.NODE_ENV || 'dev';
const shouldInitializeDb = nodeEnv !== 'dev' && nodeEnv !== 'test';

/**
 * Card Module
 * Handles card management and persistence
 * - Dev/Test: Uses file-based access (IFileReader + JSON files)
 * - Staging/Prod: Uses database access (ICardRepository + PostgreSQL)
 */
@Module({
  imports: [
    SetModule,
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([CardOrmEntity]), DatabaseModule]
      : []),
  ],
  controllers: [CardController],
  providers: [
    // Repository (conditional based on environment)
    {
      provide: ICardRepository,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? FileSystemCardRepository
          : TypeOrmCardRepository,
    },
    // Use case providers with interfaces (conditional based on environment)
    {
      provide: IGetCardByIdUseCase,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? GetCardByIdUseCase
          : GetCardByIdDbUseCase,
    },
    {
      provide: IGetAvailableSetsUseCase,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? GetAvailableSetsUseCase
          : GetAvailableSetsDbUseCase,
    },
    {
      provide: IPreviewCardUseCase,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? PreviewCardUseCase
          : PreviewCardDbUseCase,
    },
    {
      provide: IPreviewSetUseCase,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? PreviewSetUseCase
          : PreviewSetDbUseCase,
    },
    {
      provide: ICalculateCardStrengthUseCase,
      useClass: CalculateCardStrengthUseCase,
    },
    // File reader only for dev/test
    ...(nodeEnv === 'dev' || nodeEnv === 'test'
      ? [
          {
            provide: IFileReader,
            useClass: FileReaderService,
          },
        ]
      : []),
    // Domain services
    CardStrengthCalculatorService,
  ],
  exports: [
    ICardRepository,
    IGetCardByIdUseCase,
    IGetAvailableSetsUseCase,
    IPreviewCardUseCase,
    IPreviewSetUseCase,
    ICalculateCardStrengthUseCase,
  ],
})
export class CardModule {}
