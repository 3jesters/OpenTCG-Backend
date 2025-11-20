import { Module } from '@nestjs/common';
import { ITournamentRepository } from './domain';
import { JsonTournamentRepository } from './infrastructure/persistence/json-tournament.repository';
import { CreateTournamentUseCase } from './application/use-cases/create-tournament.use-case';
import { GetTournamentByIdUseCase } from './application/use-cases/get-tournament-by-id.use-case';
import { GetAllTournamentsUseCase } from './application/use-cases/get-all-tournaments.use-case';
import { UpdateTournamentUseCase } from './application/use-cases/update-tournament.use-case';
import { DeleteTournamentUseCase } from './application/use-cases/delete-tournament.use-case';
import { TournamentController } from './presentation/controllers/tournament.controller';

@Module({
  controllers: [TournamentController],
  providers: [
    // Repository implementation
    {
      provide: ITournamentRepository,
      useClass: JsonTournamentRepository,
    },
    // Use cases
    CreateTournamentUseCase,
    GetTournamentByIdUseCase,
    GetAllTournamentsUseCase,
    UpdateTournamentUseCase,
    DeleteTournamentUseCase,
  ],
  exports: [
    // Export repository if other modules need access
    ITournamentRepository,
  ],
})
export class TournamentModule {}

