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
  ValidateMatchDecksUseCase,
  PerformCoinTossUseCase,
  DrawInitialCardsUseCase,
} from './application/use-cases';
import { IMatchRepository } from './domain/repositories';
import { JsonMatchRepository } from './infrastructure/persistence/json-match.repository';
import {
  MatchStateMachineService,
  StartGameRulesValidatorService,
  CoinFlipResolverService,
  AttackCoinFlipParserService,
  AttackEnergyValidatorService,
  TrainerEffectExecutorService,
  TrainerEffectValidatorService,
} from './domain/services';
import { DeckModule } from '../deck/deck.module';
import { CardModule } from '../card/card.module';
import { TournamentModule } from '../tournament/tournament.module';

/**
 * Match Module
 * Manages match lifecycle and gameplay state machine
 */
@Module({
  imports: [DeckModule, CardModule, TournamentModule],
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
    ValidateMatchDecksUseCase,
    PerformCoinTossUseCase,
    DrawInitialCardsUseCase,
    // Domain Services
    MatchStateMachineService,
    StartGameRulesValidatorService,
    CoinFlipResolverService,
    AttackCoinFlipParserService,
    AttackEnergyValidatorService,
    TrainerEffectExecutorService,
    TrainerEffectValidatorService,
    // Repository
    {
      provide: IMatchRepository,
      useClass: JsonMatchRepository,
    },
  ],
  exports: [IMatchRepository],
})
export class MatchModule {}

