import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain
import { IDeckRepository } from './domain/repositories';

// Application
import {
  CreateDeckUseCase,
  GetDeckByIdUseCase,
  ListDecksUseCase,
  UpdateDeckUseCase,
  DeleteDeckUseCase,
  ValidateDeckAgainstTournamentUseCase,
} from './application/use-cases';

// Infrastructure
import { JsonDeckRepository } from './infrastructure/persistence';
import { TypeOrmDeckRepository } from './infrastructure/persistence/typeorm-deck.repository';
import { DeckOrmEntity } from './infrastructure/persistence/entities';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';

// Presentation
import { DeckController } from './presentation/controllers';

// Import TournamentModule for validation use case
import { TournamentModule } from '../tournament/tournament.module';
// Import CardModule for card details
import { CardModule } from '../card/card.module';

const nodeEnv = process.env.NODE_ENV || 'dev';
const shouldInitializeDb = nodeEnv !== 'dev' && nodeEnv !== 'test';

/**
 * Deck Module
 * Handles deck management and validation
 */
@Module({
  imports: [
    TournamentModule, // For tournament validation
    CardModule, // For card details
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([DeckOrmEntity]), DatabaseModule]
      : []),
  ],
  providers: [
    // Repository (conditional based on environment)
    {
      provide: IDeckRepository,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? JsonDeckRepository
          : TypeOrmDeckRepository,
    },
    // Use Cases
    CreateDeckUseCase,
    GetDeckByIdUseCase,
    ListDecksUseCase,
    UpdateDeckUseCase,
    DeleteDeckUseCase,
    ValidateDeckAgainstTournamentUseCase,
  ],
  controllers: [DeckController],
  exports: [
    IDeckRepository,
    CreateDeckUseCase,
    GetDeckByIdUseCase,
    ListDecksUseCase,
    UpdateDeckUseCase,
    DeleteDeckUseCase,
    ValidateDeckAgainstTournamentUseCase,
  ],
})
export class DeckModule {}
