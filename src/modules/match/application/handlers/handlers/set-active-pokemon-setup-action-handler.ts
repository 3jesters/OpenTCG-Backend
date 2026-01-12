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
  PlayerActionType,
  ActionSummary,
  PokemonPosition,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { CardInstance, PlayerGameState } from '../../../domain/value-objects';
import { v4 as uuidv4 } from 'uuid';
import { IMatchRepository } from '../../../domain/repositories';
import { MatchStateMachineService } from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { ProcessActionUseCase } from '../../use-cases/process-action.use-case';
import { PlayerTypeService } from '../../services';

/**
 * Set Active Pokemon Setup Action Handler
 * Handles setting active Pokemon during initial setup (SELECT_ACTIVE_POKEMON state)
 * Auto-triggers AI players to set active Pokemon if it's their turn
 */
@Injectable()
export class SetActivePokemonSetupActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  private readonly logger = new Logger(SetActivePokemonSetupActionHandler.name);

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
    if (match.state !== MatchState.SELECT_ACTIVE_POKEMON) {
      throw new BadRequestException(
        `This handler only handles SET_ACTIVE_POKEMON in SELECT_ACTIVE_POKEMON state. Current state: ${match.state}`,
      );
    }

    const cardId = (dto.actionData as any)?.cardId;
    if (!cardId) {
      throw new BadRequestException('cardId is required');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Validate that player needs to select active Pokemon
    if (playerState.activePokemon !== null) {
      throw new BadRequestException(
        'Cannot set active Pokemon when one already exists',
      );
    }

    // Check if card is in hand or on bench
    const isInHand = playerState.hand.includes(cardId);
    const benchIndex = playerState.bench.findIndex((p) => p.cardId === cardId);
    const isOnBench = benchIndex !== -1;

    if (!isInHand && !isOnBench) {
      throw new BadRequestException('Card must be in hand or on bench');
    }

    let activePokemon: CardInstance;
    let updatedHand = playerState.hand;
    let updatedBench = playerState.bench;

    if (isInHand) {
      // Card is in hand - create new CardInstance
      const cardEntity = await this.getCardEntity(cardId, cardsMap);
      const cardHp = this.getCardHp(cardEntity);
      activePokemon = new CardInstance(
        uuidv4(),
        cardId,
        PokemonPosition.ACTIVE,
        cardHp,
        cardHp,
        [],
        [], // No status effects for new Pokemon
        [],
        undefined,
        undefined, // evolvedAt - new Pokemon, not evolved
      );
      // Remove from hand
      updatedHand = playerState.hand.filter((id) => id !== cardId);
    } else {
      // Card is on bench - move it to active
      const benchPokemon = playerState.bench[benchIndex];
      // Clear all status effects when Pokemon switches/retreats
      activePokemon = benchPokemon
        .withPosition(PokemonPosition.ACTIVE)
        .withStatusEffectsCleared(); // Clear status effects on switch
      // Remove from bench and renumber positions
      updatedBench = playerState.bench
        .filter((_, i) => i !== benchIndex)
        .map((p, newIndex) => {
          const newPosition = `BENCH_${newIndex}` as PokemonPosition;
          // Clear status effects when Pokemon moves positions (retreat/switch)
          return p.withPosition(newPosition);
        });
    }

    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      updatedHand,
      activePokemon,
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

    // Create action summary (store instanceId and source for reversibility)
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.SET_ACTIVE_POKEMON,
      new Date(),
      {
        cardId,
        instanceId: activePokemon.instanceId,
        source: isInHand ? 'HAND' : `BENCH_${benchIndex}`,
      },
    );

    // Initial setup phase - use setup update method
    match.updateGameStateDuringSetup(updatedGameState);

    // Check if both players have set active Pokemon (only in SELECT_ACTIVE_POKEMON state)
    const player1State = updatedGameState.player1State;
    const player2State = updatedGameState.player2State;

    if (player1State.activePokemon && player2State.activePokemon) {
      // Both players have set active Pokemon, transition to SELECT_BENCH_POKEMON
      // Prize cards should already be set during SET_PRIZE_CARDS phase
      match.transitionToSelectBenchPokemon(updatedGameState);
    }

    const savedMatch = await this.matchRepository.save(match);

    // If match is still in SELECT_ACTIVE_POKEMON state, auto-trigger the OTHER player (if AI) to set active Pokemon
    if (savedMatch.state === MatchState.SELECT_ACTIVE_POKEMON) {
      try {
        // Determine the opponent player identifier
        const opponentIdentifier =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? PlayerIdentifier.PLAYER2
            : PlayerIdentifier.PLAYER1;

        // Get opponent player ID
        const opponentPlayerId =
          opponentIdentifier === PlayerIdentifier.PLAYER1
            ? savedMatch.player1Id
            : savedMatch.player2Id;

        // Get updated game state to check if opponent has set active Pokemon
        const updatedGameStateAfterSave = savedMatch.gameState;
        if (updatedGameStateAfterSave) {
          const opponentState =
            updatedGameStateAfterSave.getPlayerState(opponentIdentifier);
          const opponentHasActivePokemon =
            opponentState?.activePokemon !== null;

          // Auto-trigger opponent AI player if applicable
          if (
            opponentPlayerId &&
            this.playerTypeService.isAiPlayer(opponentPlayerId, savedMatch) &&
            !opponentHasActivePokemon
          ) {
            this.logger.debug(
              `Auto-triggering AI player ${opponentPlayerId} (${opponentIdentifier}) to set active Pokemon for match ${savedMatch.id}`,
            );
            await this.processActionUseCase.execute(
              {
                playerId: opponentPlayerId,
                actionType: PlayerActionType.SET_ACTIVE_POKEMON,
                actionData: {}, // AI will generate the cardId
              },
              savedMatch.id,
            );
            // Reload match after AI sets active Pokemon
            const updatedMatch = await this.matchRepository.findById(
              dto.matchId,
            );
            if (updatedMatch) {
              return updatedMatch;
            }
          }
        }
      } catch (autoSetActiveError) {
        // Log error but don't fail the action - auto-set active is best effort
        this.logger.error(
          `Error during AI auto-set active Pokemon for match ${dto.matchId}: ${autoSetActiveError instanceof Error ? autoSetActiveError.message : String(autoSetActiveError)}`,
          autoSetActiveError instanceof Error
            ? autoSetActiveError.stack
            : undefined,
        );
      }
    }

    return savedMatch;
  }
}
