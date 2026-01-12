import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  MatchState,
  PokemonPosition,
  PlayerActionType,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { CardInstance, PlayerGameState } from '../../../domain/value-objects';
import { CardType } from '../../../../card/domain/enums/card-type.enum';
import { EvolutionStage } from '../../../../card/domain/enums/evolution-stage.enum';
import { TrainerEffectType } from '../../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { v4 as uuidv4 } from 'uuid';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { ProcessActionUseCase } from '../../use-cases/process-action.use-case';
import { PlayerTypeService } from '../../services';

/**
 * Play Pokemon Setup Action Handler
 * Handles playing Pokemon to bench during initial setup (SELECT_BENCH_POKEMON state)
 * Auto-triggers AI players to take their next action (play pokemon or complete setup)
 */
@Injectable()
export class PlayPokemonSetupActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  private readonly logger = new Logger(PlayPokemonSetupActionHandler.name);

  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly playerTypeService: PlayerTypeService,
  ) {
    super(matchRepository, stateMachineService, getCardByIdUseCase);
  }
  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    // Only handle setup phase
    if (match.state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new BadRequestException(
        `This handler only handles PLAY_POKEMON in SELECT_BENCH_POKEMON state. Current state: ${match.state}`,
      );
    }

    const cardId = (dto.actionData as any)?.cardId;
    if (!cardId) {
      throw new BadRequestException('cardId is required');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if card is in hand
    if (!playerState.hand.includes(cardId)) {
      throw new BadRequestException('Card must be in hand');
    }

    // Validate that only Basic Pokemon can be played directly
    // Exception: Trainer cards with PUT_INTO_PLAY effect (source: HAND, target: SELF) can be played as Basic Pokemon
    // Examples: Clefairy Doll, Mysterious Fossil
    const cardEntity = await this.getCardEntity(cardId, cardsMap);

    // Check if it's a special trainer card that can be played as Basic Pokemon
    const isSpecialTrainerCard =
      cardEntity.cardType === CardType.TRAINER &&
      cardEntity.trainerEffects.some(
        (effect) =>
          effect.effectType === TrainerEffectType.PUT_INTO_PLAY &&
          effect.source === 'HAND' &&
          effect.target === TargetType.SELF,
      );

    if (!isSpecialTrainerCard) {
      // For non-special trainer cards, must be a Basic Pokemon
      if (cardEntity.cardType !== CardType.POKEMON) {
        throw new BadRequestException(
          'Only Pokemon cards can be played to the bench',
        );
      }
      if (cardEntity.stage !== EvolutionStage.BASIC) {
        throw new BadRequestException(
          `Cannot play ${cardEntity.stage} Pokemon directly. Only Basic Pokemon can be played to the bench. Evolved Pokemon must be evolved from their pre-evolution.`,
        );
      }
    }

    // Check bench space (max 5)
    if (playerState.bench.length >= 5) {
      throw new BadRequestException('Bench is full (max 5 Pokemon)');
    }

    // Load card details to get HP
    const cardHp = this.getCardHp(cardEntity);

    // Create CardInstance for bench Pokemon
    const benchPosition =
      `BENCH_${playerState.bench.length}` as PokemonPosition;
    const benchPokemon = new CardInstance(
      uuidv4(),
      cardId,
      benchPosition,
      cardHp,
      cardHp,
      [],
      [], // No status effects for new Pokemon
      [],
      undefined, // poisonDamageAmount
      undefined, // evolvedAt - new Pokemon, not evolved
    );

    // Remove card from hand and add to bench
    const updatedHand = playerState.hand.filter((id) => id !== cardId);
    const updatedBench = [...playerState.bench, benchPokemon];
    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      updatedHand,
      playerState.activePokemon,
      updatedBench,
      playerState.prizeCards,
      playerState.discardPile,
      playerState.hasAttachedEnergyThisTurn,
    );

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    match.updateGameStateDuringSetup(updatedGameState);

    const savedMatch = await this.matchRepository.save(match);

    // If match is still in SELECT_BENCH_POKEMON state, handle AI auto-triggering
    if (savedMatch.state === MatchState.SELECT_BENCH_POKEMON) {
      try {
        const currentPlayerId = dto.playerId;
        const isCurrentPlayerAi =
          currentPlayerId &&
          this.playerTypeService.isAiPlayer(currentPlayerId, savedMatch);

        // If the current player is AI and just played a Pokemon, trigger AI again to decide next action
        // (play more Pokemon or complete setup)
        if (isCurrentPlayerAi) {
          this.logger.debug(
            `Auto-triggering AI player ${currentPlayerId} to decide next action after playing Pokemon for match ${savedMatch.id}`,
          );
          // Trigger AI to generate and execute action - ProcessActionUseCase will detect AI
          // and generate the appropriate action (PLAY_POKEMON or COMPLETE_INITIAL_SETUP)
          await this.processActionUseCase.execute(
            {
              playerId: currentPlayerId,
              actionType: PlayerActionType.PLAY_POKEMON, // Placeholder - AI will generate its own action
              actionData: {},
            },
            savedMatch.id,
          );
          // Reload match after AI action
          const updatedMatch = await this.matchRepository.findById(dto.matchId);
          if (updatedMatch) {
            return updatedMatch;
          }
        } else {
          // If current player is human, trigger the opponent AI (if applicable) to take action
          const opponentIdentifier =
            playerIdentifier === PlayerIdentifier.PLAYER1
              ? PlayerIdentifier.PLAYER2
              : PlayerIdentifier.PLAYER1;

          const opponentPlayerId =
            opponentIdentifier === PlayerIdentifier.PLAYER1
              ? savedMatch.player1Id
              : savedMatch.player2Id;

          // Auto-trigger opponent AI player if applicable
          // The AI will generate the appropriate action (PLAY_POKEMON or COMPLETE_INITIAL_SETUP)
          if (
            opponentPlayerId &&
            this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch)
          ) {
            this.logger.debug(
              `Auto-triggering AI player ${opponentPlayerId} (${opponentIdentifier}) to take action in SELECT_BENCH_POKEMON for match ${savedMatch.id}`,
            );
            // Trigger AI to generate and execute action - ProcessActionUseCase will detect AI
            // and generate the appropriate action (PLAY_POKEMON or COMPLETE_INITIAL_SETUP)
            // We pass PLAY_POKEMON as a placeholder, but AI will generate its own action
            await this.processActionUseCase.execute(
              {
                playerId: opponentPlayerId,
                actionType: PlayerActionType.PLAY_POKEMON, // Placeholder - AI will generate its own action
                actionData: {},
              },
              savedMatch.id,
            );
            // Reload match after AI action
            const updatedMatch = await this.matchRepository.findById(
              dto.matchId,
            );
            if (updatedMatch) {
              return updatedMatch;
            }
          }
        }
      } catch (autoActionError) {
        // Log error but don't fail the action - auto-action is best effort
        this.logger.error(
          `Error during AI auto-action in SELECT_BENCH_POKEMON for match ${dto.matchId}: ${autoActionError instanceof Error ? autoActionError.message : String(autoActionError)}`,
          autoActionError instanceof Error ? autoActionError.stack : undefined,
        );
      }
    }

    return savedMatch;
  }
}
