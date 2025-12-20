import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  ActionSummary,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { EvolutionExecutionService } from './evolution-execution.service';
import { CardHelperService } from './card-helper.service';
import { Card } from '../../../card/domain/entities';
import { CardInstance } from '../../domain/value-objects';
import { CardType, EvolutionStage } from '../../../card/domain/enums';
import { v4 as uuidv4 } from 'uuid';

export interface EvolvePokemonPlayerTurnParams {
  dto: any; // ExecuteActionDto
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  cardsMap: Map<string, Card>;
}

@Injectable()
export class EvolvePokemonPlayerTurnService {
  constructor(
    private readonly evolutionExecutionService: EvolutionExecutionService,
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly cardHelper: CardHelperService,
  ) {}

  /**
   * Execute evolve Pokemon action in PLAYER_TURN state
   */
  async executeEvolvePokemon(
    params: EvolvePokemonPlayerTurnParams,
  ): Promise<Match> {
    const {
      dto,
      match,
      gameState,
      playerIdentifier,
      cardsMap,
    } = params;

    // Validate request
    const { evolutionCardId, target } = this.validateEvolvePokemonRequest(
      dto.actionData,
    );

    // Find target Pokemon to validate
    const playerState = gameState.getPlayerState(playerIdentifier);
    let targetPokemon: CardInstance | null = null;

    if (target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon to evolve');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      // BENCH_0, BENCH_1, etc.
      const benchIndex = parseInt(target.replace('BENCH_', ''));
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(`Invalid bench position: ${target}`);
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    // Validate that this Pokemon hasn't been evolved this turn
    this.validatePokemonNotEvolvedThisTurn(
      gameState,
      playerIdentifier,
      targetPokemon.instanceId,
      targetPokemon.cardId,
    );

    // Validate evolution chain
    await this.validateEvolution(targetPokemon.cardId, evolutionCardId, cardsMap);

    // Execute evolution using execution service
    const result =
      await this.evolutionExecutionService.executeEvolvePokemon({
        evolutionCardId,
        target,
        gameState,
        playerIdentifier,
        cardsMap,
      });

    // Create action summary
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.EVOLVE_POKEMON,
      new Date(),
      {
        evolutionCardId,
        target,
        instanceId: result.targetInstanceId,
      },
    );

    const finalGameState = result.updatedGameState.withAction(actionSummary);

    // Update match
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }

  /**
   * Validate evolve Pokemon request
   */
  private validateEvolvePokemonRequest(actionData: any): {
    evolutionCardId: string;
    target: string;
  } {
    const evolutionCardId = actionData?.evolutionCardId;
    const target = actionData?.target;

    if (!evolutionCardId) {
      throw new BadRequestException('evolutionCardId is required');
    }
    if (!target) {
      throw new BadRequestException('target is required');
    }

    return { evolutionCardId, target };
  }

  /**
   * Validate that a Pokemon hasn't been evolved this turn
   * @param gameState The current game state
   * @param playerIdentifier The player attempting to evolve
   * @param instanceId The instance ID of the Pokemon to evolve
   * @param cardId The card ID of the Pokemon (for error message)
   * @throws BadRequestException if the Pokemon has already been evolved this turn
   *
   * Why we check both lastAction and actionHistory:
   * - When withAction() is called, the action is added to BOTH lastAction AND actionHistory
   * - lastAction is a direct reference to the most recent action (fast check)
   * - actionHistory contains all actions, and we iterate in reverse to find earlier evolutions in the same turn
   * - We check lastAction first for efficiency (most common case: Pokemon was just evolved)
   * - We check actionHistory in reverse to catch evolutions from earlier in the turn, stopping at END_TURN (turn boundary)
   * - This ensures we only check actions from the current turn, not previous turns
   */
  private validatePokemonNotEvolvedThisTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    instanceId: string,
    cardId: string,
  ): void {
    // Find the Pokemon instance to check its evolvedAt field
    const playerState = gameState.getPlayerState(playerIdentifier);
    let targetPokemon: CardInstance | null = null;

    // Check active Pokemon
    if (playerState.activePokemon?.instanceId === instanceId) {
      targetPokemon = playerState.activePokemon;
    } else {
      // Check bench Pokemon
      targetPokemon =
        playerState.bench.find((p) => p.instanceId === instanceId) || null;
    }

    // Primary check: Use evolvedAt field if available (new approach)
    if (targetPokemon && targetPokemon.evolvedAt !== undefined) {
      if (targetPokemon.evolvedAt === gameState.turnNumber) {
        throw new BadRequestException(
          `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
        );
      }
      // If evolvedAt is set but from a different turn, allow evolution
      return;
    }

    // Fallback: Check action history for backward compatibility with existing matches
    // This handles cases where evolvedAt is not set (old matches or edge cases)
    // Check lastAction first (most recent action, definitely from current turn if from current player)
    if (
      gameState.lastAction &&
      gameState.lastAction.playerId === playerIdentifier
    ) {
      if (gameState.lastAction.actionType === PlayerActionType.EVOLVE_POKEMON) {
        const actionData = gameState.lastAction.actionData as any;
        if (actionData.instanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
          );
        }
      } else if (
        gameState.lastAction.actionType === PlayerActionType.PLAY_TRAINER
      ) {
        const actionData = gameState.lastAction.actionData as any;
        if (actionData.evolutionCardId && actionData.target) {
          let targetInstanceId: string | null = null;

          if (actionData.target === 'ACTIVE') {
            targetInstanceId = playerState.activePokemon?.instanceId || null;
          } else if (actionData.target.startsWith('BENCH_')) {
            const benchIndex = parseInt(
              actionData.target.replace('BENCH_', ''),
              10,
            );
            if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
              targetInstanceId =
                playerState.bench[benchIndex]?.instanceId || null;
            }
          }

          if (targetInstanceId === instanceId) {
            throw new BadRequestException(
              `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
            );
          }
        }
      }
    }

    // Check action history in reverse order (most recent first)
    // Stop when we hit an END_TURN action (turn boundary) or an action from a different player
    for (let i = gameState.actionHistory.length - 1; i >= 0; i--) {
      const action = gameState.actionHistory[i];

      // Stop if we hit an END_TURN action (turn boundary)
      if (action.actionType === PlayerActionType.END_TURN) {
        break;
      }

      // Only check actions from the current player
      if (action.playerId !== playerIdentifier) {
        continue;
      }

      // Check EVOLVE_POKEMON actions
      if (action.actionType === PlayerActionType.EVOLVE_POKEMON) {
        const actionData = action.actionData as any;
        if (actionData.instanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
          );
        }
      }

      // Check PLAY_TRAINER actions that might have evolved this Pokemon
      if (action.actionType === PlayerActionType.PLAY_TRAINER) {
        const actionData = action.actionData as any;
        if (actionData.evolutionCardId && actionData.target) {
          let targetInstanceId: string | null = null;

          if (actionData.target === 'ACTIVE') {
            targetInstanceId = playerState.activePokemon?.instanceId || null;
          } else if (actionData.target.startsWith('BENCH_')) {
            const benchIndex = parseInt(
              actionData.target.replace('BENCH_', ''),
              10,
            );
            if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
              targetInstanceId =
                playerState.bench[benchIndex]?.instanceId || null;
            }
          }

          if (targetInstanceId === instanceId) {
            throw new BadRequestException(
              `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
            );
          }
        }
      }
    }
  }

  /**
   * Validate that an evolution card can evolve from the current Pokemon
   * @param currentPokemonCardId The card ID of the Pokemon to evolve
   * @param evolutionCardId The card ID of the evolution card
   * @param cardsMap Map of card IDs to Card entities
   * @throws BadRequestException if the evolution is invalid
   */
  private async validateEvolution(
    currentPokemonCardId: string,
    evolutionCardId: string,
    cardsMap: Map<string, Card>,
  ): Promise<void> {
    // Get both card entities
    const currentPokemonCard =
      await this.cardHelper.getCardEntity(currentPokemonCardId, cardsMap);
    const evolutionCard =
      await this.cardHelper.getCardEntity(evolutionCardId, cardsMap);

    // Validate that both are Pokemon cards
    if (currentPokemonCard.cardType !== CardType.POKEMON) {
      throw new BadRequestException(
        `Cannot evolve non-Pokemon card. The selected card is not a Pokemon.`,
      );
    }
    if (evolutionCard.cardType !== CardType.POKEMON) {
      throw new BadRequestException(
        `Evolution card must be a Pokemon card. The selected evolution card is not a Pokemon.`,
      );
    }

    // Validate that evolution card has evolvesFrom
    if (!evolutionCard.evolvesFrom) {
      throw new BadRequestException(
        `Cannot evolve to ${evolutionCard.name}. This card cannot be used for evolution.`,
      );
    }

    // Validate that the current Pokemon's name matches the evolution's evolvesFrom name
    const currentPokemonName = currentPokemonCard.name;
    const evolvesFromName = evolutionCard.evolvesFrom.name;

    if (!evolvesFromName) {
      throw new BadRequestException(
        `Cannot evolve to ${evolutionCard.name}. Evolution information is missing.`,
      );
    }

    // Check if current Pokemon name exactly matches the evolvesFrom name (case-insensitive)
    // The name must exactly match (e.g., "Charmeleon" must equal "Charmeleon" or "charmeleon")
    // This prevents "Dark basicCharmeleon" from evolving to Charizard (requires "Charmeleon")
    if (currentPokemonName.toLowerCase() !== evolvesFromName.toLowerCase()) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName} to ${evolutionCard.name}. ` +
          `Evolution requires ${evolvesFromName}, but current Pokemon is ${currentPokemonName}`,
      );
    }

    // Validate stage progression: BASIC -> STAGE_1 -> STAGE_2
    const currentStage = currentPokemonCard.stage;
    const evolutionStage = evolutionCard.stage;

    if (!currentStage) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName}. This Pokemon does not have a valid evolution stage.`,
      );
    }
    if (!evolutionStage) {
      throw new BadRequestException(
        `Cannot evolve to ${evolutionCard.name}. The evolution card does not have a valid stage.`,
      );
    }

    // Define valid stage progression
    const stageProgression: Record<EvolutionStage, EvolutionStage | null> = {
      [EvolutionStage.BASIC]: EvolutionStage.STAGE_1,
      [EvolutionStage.STAGE_1]: EvolutionStage.STAGE_2,
      [EvolutionStage.STAGE_2]: null, // STAGE_2 cannot evolve further
      [EvolutionStage.VMAX]: null,
      [EvolutionStage.VSTAR]: null,
      [EvolutionStage.GX]: null,
      [EvolutionStage.EX]: null,
      [EvolutionStage.MEGA]: null,
      [EvolutionStage.BREAK]: null,
      [EvolutionStage.LEGEND]: null,
    };

    const expectedNextStage = stageProgression[currentStage];
    if (expectedNextStage === null) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName}. Pokemon at stage ${currentStage} cannot evolve further.`,
      );
    }

    if (evolutionStage !== expectedNextStage) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName} to ${evolutionCard.name}. ` +
          `Invalid evolution stage: ${currentPokemonName} is ${currentStage}, ` +
          `but ${evolutionCard.name} is ${evolutionStage}. Expected ${expectedNextStage}.`,
      );
    }
  }
}

