import { Module } from '@nestjs/common';
import { MatchController } from './presentation/controllers/match.controller';
import {
  CreateMatchUseCase,
  JoinMatchUseCase,
  StartMatchUseCase,
  ExecuteTurnActionUseCase,
  EndMatchUseCase,
  GetMatchStateUseCase,
  ListMatchesUseCase,
} from './application/use-cases';
import { IMatchRepository } from './domain/repositories';
import { JsonMatchRepository } from './infrastructure/persistence/json-match.repository';
import { MatchStateMachineService } from './domain/services';

/**
 * Match Module
 * Manages match lifecycle and gameplay state machine
 */
@Module({
  controllers: [MatchController],
  providers: [
    // Use Cases
    CreateMatchUseCase,
    JoinMatchUseCase,
    StartMatchUseCase,
    ExecuteTurnActionUseCase,
    EndMatchUseCase,
    GetMatchStateUseCase,
    ListMatchesUseCase,
    // Domain Services
    MatchStateMachineService,
    // Repository
    {
      provide: IMatchRepository,
      useClass: JsonMatchRepository,
    },
  ],
  exports: [IMatchRepository],
})
export class MatchModule {}

