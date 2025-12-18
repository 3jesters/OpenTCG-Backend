import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ITournamentRepository } from './domain';
import { JsonTournamentRepository } from './infrastructure/persistence/json-tournament.repository';
import { TypeOrmTournamentRepository } from './infrastructure/persistence/typeorm-tournament.repository';
import { TournamentOrmEntity } from './infrastructure/persistence/entities';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import { CreateTournamentUseCase } from './application/use-cases/create-tournament.use-case';
import { GetTournamentByIdUseCase } from './application/use-cases/get-tournament-by-id.use-case';
import { GetAllTournamentsUseCase } from './application/use-cases/get-all-tournaments.use-case';
import { UpdateTournamentUseCase } from './application/use-cases/update-tournament.use-case';
import { DeleteTournamentUseCase } from './application/use-cases/delete-tournament.use-case';
import { TournamentController } from './presentation/controllers/tournament.controller';

const nodeEnv = process.env.NODE_ENV || 'dev';
const shouldInitializeDb = nodeEnv !== 'dev' && nodeEnv !== 'test';

@Module({
  imports: [
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([TournamentOrmEntity]), DatabaseModule]
      : []),
  ],
  controllers: [TournamentController],
  providers: [
    // Repository implementation (conditional based on environment)
    {
      provide: ITournamentRepository,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? JsonTournamentRepository
          : TypeOrmTournamentRepository,
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
