import { Module } from '@nestjs/common';

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

// Presentation
import { DeckController } from './presentation/controllers';

// Import TournamentModule for validation use case
import { TournamentModule } from '../tournament/tournament.module';

/**
 * Deck Module
 * Handles deck management and validation
 */
@Module({
  imports: [
    TournamentModule, // For tournament validation
  ],
  providers: [
    // Repository
    {
      provide: IDeckRepository,
      useClass: JsonDeckRepository,
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

