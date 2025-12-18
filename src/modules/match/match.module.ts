import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchController } from './presentation/controllers/match.controller';
import {
  CreateMatchUseCase,
  JoinMatchUseCase,
  StartMatchUseCase,
  ExecuteTurnActionUseCase,
  EndMatchUseCase,
  GetMatchByIdUseCase,
  GetMatchStateUseCase,
  ListMatchesUseCase,
  ValidateMatchDecksUseCase,
  PerformCoinTossUseCase,
  DrawInitialCardsUseCase,
  SetPrizeCardsUseCase,
  CancelMatchUseCase,
} from './application/use-cases';
import { IMatchRepository } from './domain/repositories';
import { FileSystemMatchRepository } from './infrastructure/persistence/filesystem-match.repository';
import { TypeOrmMatchRepository } from './infrastructure/persistence/typeorm-match.repository';
import { MatchOrmEntity } from './infrastructure/persistence/entities';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import {
  MatchStateMachineService,
  StartGameRulesValidatorService,
  CoinFlipResolverService,
  AttackCoinFlipParserService,
  AttackEnergyValidatorService,
  TrainerEffectExecutorService,
  TrainerEffectValidatorService,
  AbilityEffectExecutorService,
  AbilityEffectValidatorService,
} from './domain/services';
import { DeckModule } from '../deck/deck.module';
import { CardModule } from '../card/card.module';
import { TournamentModule } from '../tournament/tournament.module';

const nodeEnv = process.env.NODE_ENV || 'dev';
const shouldInitializeDb = nodeEnv !== 'dev' && nodeEnv !== 'test';

/**
 * Match Module
 * Manages match lifecycle and gameplay state machine
 */
@Module({
  imports: [
    DeckModule,
    CardModule,
    TournamentModule,
    // Conditionally import TypeORM and DatabaseModule for staging/production
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([MatchOrmEntity]), DatabaseModule]
      : []),
  ],
  controllers: [MatchController],
  providers: [
    // Use Cases
    CreateMatchUseCase,
    JoinMatchUseCase,
    StartMatchUseCase,
    ExecuteTurnActionUseCase,
    EndMatchUseCase,
    GetMatchByIdUseCase,
    GetMatchStateUseCase,
    ListMatchesUseCase,
    ValidateMatchDecksUseCase,
    PerformCoinTossUseCase,
    DrawInitialCardsUseCase,
    SetPrizeCardsUseCase,
    CancelMatchUseCase,
    // Domain Services
    MatchStateMachineService,
    StartGameRulesValidatorService,
    CoinFlipResolverService,
    AttackCoinFlipParserService,
    AttackEnergyValidatorService,
    TrainerEffectExecutorService,
    TrainerEffectValidatorService,
    AbilityEffectExecutorService,
    AbilityEffectValidatorService,
    // Repository - conditionally provide based on NODE_ENV
    {
      provide: IMatchRepository,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? FileSystemMatchRepository
          : TypeOrmMatchRepository,
    },
  ],
  exports: [IMatchRepository],
})
export class MatchModule {}
