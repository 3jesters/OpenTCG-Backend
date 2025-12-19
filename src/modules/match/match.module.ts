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
    StatusEffectProcessorService,
} from './domain/services';
import {
  EnergyAttachmentExecutionService,
  EvolutionExecutionService,
  PlayPokemonExecutionService,
  AttackExecutionService,
  CoinFlipExecutionService,
} from './application/services';
import { DeckModule } from '../deck/deck.module';
import { CardModule } from '../card/card.module';
import { TournamentModule } from '../tournament/tournament.module';
import { ActionHandlerFactory } from './application/handlers/action-handler-factory';
import {
  ConcedeActionHandler,
  ApproveMatchActionHandler,
  DrawInitialCardsActionHandler,
  SetPrizeCardsActionHandler,
  SetActivePokemonSetupActionHandler,
  PlayPokemonSetupActionHandler,
  CompleteInitialSetupActionHandler,
  ConfirmFirstPlayerActionHandler,
  DrawCardActionHandler,
  SelectPrizeActionHandler,
  PlayTrainerActionHandler,
  UseAbilityActionHandler,
  EndTurnActionHandler,
  GenerateCoinFlipActionHandler,
  AttackActionHandler,
} from './application/handlers/handlers';
import { PlayerActionType } from './domain/enums';

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
    StatusEffectProcessorService,
    // Execution Services
    EnergyAttachmentExecutionService,
    EvolutionExecutionService,
    PlayPokemonExecutionService,
    AttackExecutionService,
    CoinFlipExecutionService,
    // Action Handlers (Strategy Pattern)
    ActionHandlerFactory,
    ConcedeActionHandler,
    ApproveMatchActionHandler,
    DrawInitialCardsActionHandler,
    SetPrizeCardsActionHandler,
    SetActivePokemonSetupActionHandler,
    PlayPokemonSetupActionHandler,
    CompleteInitialSetupActionHandler,
    ConfirmFirstPlayerActionHandler,
    DrawCardActionHandler,
    SelectPrizeActionHandler,
    PlayTrainerActionHandler,
    UseAbilityActionHandler,
    EndTurnActionHandler,
    GenerateCoinFlipActionHandler,
    AttackActionHandler,
    StatusEffectProcessorService,
    // Register handlers in factory
    {
      provide: 'ACTION_HANDLER_REGISTRATION',
      useFactory: (
        factory: ActionHandlerFactory,
        concedeHandler: ConcedeActionHandler,
        approveMatchHandler: ApproveMatchActionHandler,
        drawInitialCardsHandler: DrawInitialCardsActionHandler,
        setPrizeCardsHandler: SetPrizeCardsActionHandler,
        setActivePokemonSetupHandler: SetActivePokemonSetupActionHandler,
        playPokemonSetupHandler: PlayPokemonSetupActionHandler,
        completeInitialSetupHandler: CompleteInitialSetupActionHandler,
        confirmFirstPlayerHandler: ConfirmFirstPlayerActionHandler,
        drawCardHandler: DrawCardActionHandler,
        selectPrizeHandler: SelectPrizeActionHandler,
        playTrainerHandler: PlayTrainerActionHandler,
        useAbilityHandler: UseAbilityActionHandler,
        endTurnHandler: EndTurnActionHandler,
        generateCoinFlipHandler: GenerateCoinFlipActionHandler,
        attackHandler: AttackActionHandler,
      ) => {
        factory.registerHandler(PlayerActionType.CONCEDE, concedeHandler);
        factory.registerHandler(
          PlayerActionType.APPROVE_MATCH,
          approveMatchHandler,
        );
        factory.registerHandler(
          PlayerActionType.DRAW_INITIAL_CARDS,
          drawInitialCardsHandler,
        );
        factory.registerHandler(
          PlayerActionType.SET_PRIZE_CARDS,
          setPrizeCardsHandler,
        );
        factory.registerHandler(
          PlayerActionType.SET_ACTIVE_POKEMON,
          setActivePokemonSetupHandler,
        );
        factory.registerHandler(
          PlayerActionType.PLAY_POKEMON,
          playPokemonSetupHandler,
        );
        factory.registerHandler(
          PlayerActionType.COMPLETE_INITIAL_SETUP,
          completeInitialSetupHandler,
        );
        factory.registerHandler(
          PlayerActionType.CONFIRM_FIRST_PLAYER,
          confirmFirstPlayerHandler,
        );
        factory.registerHandler(PlayerActionType.DRAW_CARD, drawCardHandler);
        factory.registerHandler(
          PlayerActionType.SELECT_PRIZE,
          selectPrizeHandler,
        );
        factory.registerHandler(
          PlayerActionType.DRAW_PRIZE,
          selectPrizeHandler,
        ); // Alias
        factory.registerHandler(
          PlayerActionType.PLAY_TRAINER,
          playTrainerHandler,
        );
        factory.registerHandler(PlayerActionType.USE_ABILITY, useAbilityHandler);
        factory.registerHandler(PlayerActionType.END_TURN, endTurnHandler);
        factory.registerHandler(
          PlayerActionType.GENERATE_COIN_FLIP,
          generateCoinFlipHandler,
        );
        factory.registerHandler(PlayerActionType.ATTACK, attackHandler);
        return true;
      },
      inject: [
        ActionHandlerFactory,
        ConcedeActionHandler,
        ApproveMatchActionHandler,
        DrawInitialCardsActionHandler,
        SetPrizeCardsActionHandler,
        SetActivePokemonSetupActionHandler,
        PlayPokemonSetupActionHandler,
        CompleteInitialSetupActionHandler,
        ConfirmFirstPlayerActionHandler,
        DrawCardActionHandler,
        SelectPrizeActionHandler,
        PlayTrainerActionHandler,
        UseAbilityActionHandler,
        EndTurnActionHandler,
        GenerateCoinFlipActionHandler,
        AttackActionHandler,
      ],
    },
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
