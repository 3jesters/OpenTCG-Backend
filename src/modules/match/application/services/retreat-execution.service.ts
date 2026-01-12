import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  ActionSummary,
  StatusEffect,
  PokemonPosition,
} from '../../domain';
import { PlayerGameState, CardInstance } from '../../domain/value-objects';
import { IMatchRepository } from '../../domain/repositories';
import { CardHelperService } from './card-helper.service';
import { Card } from '../../../card/domain/entities';
import { CardRuleType } from '../../../card/domain/enums/card-rule-type.enum';
import { v4 as uuidv4 } from 'uuid';

export interface RetreatParams {
  dto: any; // ExecuteActionDto
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  cardsMap: Map<string, Card>;
}

@Injectable()
export class RetreatExecutionService {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly cardHelper: CardHelperService,
  ) {}

  /**
   * Execute retreat action
   */
  async executeRetreat(params: RetreatParams): Promise<Match> {
    const { dto, match, gameState, playerIdentifier, cardsMap } = params;

    // RETREAT must come after ATTACK in the current turn (if ATTACK was performed)
    this.validateRetreatRequest(gameState, playerIdentifier);

    const playerState = gameState.getPlayerState(playerIdentifier);
    const actionData = dto.actionData;

    // Validate active Pokemon exists
    if (!playerState.activePokemon) {
      throw new BadRequestException('No active Pokemon to retreat');
    }

    const activePokemon = playerState.activePokemon;

    // 1. Check if Pokemon is paralyzed
    if (activePokemon.hasStatusEffect(StatusEffect.PARALYZED)) {
      throw new BadRequestException('Cannot retreat while Paralyzed');
    }

    // 2. Get card entity for retreat cost and rules
    const cardEntity = await this.cardHelper.getCardEntity(
      activePokemon.cardId,
      cardsMap,
    );

    // 3. Check if card has CANNOT_RETREAT rule
    if (!cardEntity.canRetreat()) {
      throw new BadRequestException('This Pokemon cannot retreat');
    }

    // 4. Validate target bench position
    const target = actionData?.target;
    if (!target) {
      throw new BadRequestException('target is required in actionData');
    }

    // Validate target format (BENCH_0, BENCH_1, etc.)
    if (!target.startsWith('BENCH_')) {
      throw new BadRequestException(
        `Invalid bench position format: ${target}. Must be BENCH_0, BENCH_1, etc.`,
      );
    }

    const benchIndex = parseInt(target.replace('BENCH_', ''), 10);
    if (isNaN(benchIndex) || benchIndex < 0 || benchIndex >= 5) {
      throw new BadRequestException(
        `Invalid bench index: ${benchIndex}. Must be between 0 and 4`,
      );
    }

    // Check if bench position has a Pokemon
    if (benchIndex >= playerState.bench.length) {
      throw new BadRequestException(
        `No Pokemon at bench position ${benchIndex}`,
      );
    }

    // 5. Calculate retreat cost
    let retreatCost = 0;
    if (cardEntity.hasRuleType(CardRuleType.FREE_RETREAT)) {
      retreatCost = 0;
    } else {
      retreatCost = cardEntity.retreatCost || 0;
    }

    // 6. Validate energy availability and selection
    const selectedEnergyIds = actionData?.selectedEnergyIds || [];

    if (retreatCost > 0) {
      // Check if enough energy is attached
      if (activePokemon.attachedEnergy.length < retreatCost) {
        throw new BadRequestException(
          `Insufficient energy to retreat. Requires ${retreatCost} Energy card(s), but only ${activePokemon.attachedEnergy.length} attached`,
        );
      }

      // If no energy selection provided, request it
      if (!selectedEnergyIds || selectedEnergyIds.length === 0) {
        throw new BadRequestException(
          JSON.stringify({
            error: 'ENERGY_SELECTION_REQUIRED',
            message: `This Pokemon requires discarding ${retreatCost} Energy card(s) to retreat`,
            requirement: {
              amount: retreatCost,
              energyType: null, // Retreat accepts any energy type
              target: 'self',
            },
            availableEnergy: activePokemon.attachedEnergy,
          }),
        );
      }

      // Validate energy selection
      const validationError = await this.validateEnergySelection(
        selectedEnergyIds,
        retreatCost,
        activePokemon,
      );
      if (validationError) {
        throw new BadRequestException(validationError);
      }
    } else if (selectedEnergyIds && selectedEnergyIds.length > 0) {
      // If retreat cost is 0, no energy should be selected
      throw new BadRequestException(
        'No energy selection needed for Pokemon with free retreat',
      );
    }

    // 7. Execute retreat
    return await this.performRetreat(
      match,
      gameState,
      playerIdentifier,
      playerState,
      activePokemon,
      benchIndex,
      selectedEnergyIds,
      retreatCost,
    );
  }

  /**
   * Validate energy selection for retreat
   */
  private async validateEnergySelection(
    selectedEnergyIds: string[],
    retreatCost: number,
    pokemon: CardInstance,
  ): Promise<string | null> {
    // Check that all selected energy IDs are actually attached
    for (const energyId of selectedEnergyIds) {
      if (!pokemon.attachedEnergy.includes(energyId)) {
        return `Energy card ${energyId} is not attached to this Pokemon`;
      }
    }

    // Check amount - must match retreat cost exactly
    if (selectedEnergyIds.length !== retreatCost) {
      return `Must select exactly ${retreatCost} energy card(s) to retreat, but ${selectedEnergyIds.length} were selected`;
    }

    // No energy type restriction for retreat (unlike attacks)
    return null;
  }

  /**
   * Perform the retreat action
   */
  private async performRetreat(
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    activePokemon: CardInstance,
    benchIndex: number,
    selectedEnergyIds: string[],
    retreatCost: number,
  ): Promise<Match> {
    // 1. Discard energy if retreat cost > 0
    let updatedActivePokemon = activePokemon;
    let updatedDiscardPile = playerState.discardPile;

    if (retreatCost > 0 && selectedEnergyIds.length > 0) {
      // Remove energy one by one to handle duplicates correctly
      // This ensures we only remove the first occurrence of each selected energy ID
      const updatedAttachedEnergy = [...activePokemon.attachedEnergy];
      for (const energyId of selectedEnergyIds) {
        const energyIndex = updatedAttachedEnergy.indexOf(energyId);
        if (energyIndex === -1) {
          throw new BadRequestException(
            `Energy card ${energyId} is not attached to this Pokemon`,
          );
        }
        updatedAttachedEnergy.splice(energyIndex, 1);
      }
      updatedActivePokemon = activePokemon.withAttachedEnergy(
        updatedAttachedEnergy,
      );
      updatedDiscardPile = [...playerState.discardPile, ...selectedEnergyIds];
    }

    // 2. Get bench Pokemon to move to active
    const benchPokemon = playerState.bench[benchIndex];

    // 3. Move active Pokemon to bench (clear status effects)
    const retreatingPokemon = updatedActivePokemon
      .withPosition(`BENCH_${benchIndex}` as PokemonPosition)
      .withStatusEffectsCleared();

    // 4. Move bench Pokemon to active (clear status effects)
    const newActivePokemon = benchPokemon
      .withPosition(PokemonPosition.ACTIVE)
      .withStatusEffectsCleared();

    // 5. Update bench array (remove moved Pokemon, add retreating Pokemon, renumber)
    // First, remove the Pokemon that's moving to active
    const benchWithoutMoved = playerState.bench.filter(
      (_, i) => i !== benchIndex,
    );

    // Insert retreating Pokemon at the target position
    const benchWithRetreating = [
      ...benchWithoutMoved.slice(0, benchIndex),
      retreatingPokemon,
      ...benchWithoutMoved.slice(benchIndex),
    ];

    // Renumber all bench positions to be sequential
    const updatedBench = benchWithRetreating.map((p, idx) => {
      const newPosition = `BENCH_${idx}` as PokemonPosition;
      return p.withPosition(newPosition);
    });

    // 6. Create updated player state
    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      playerState.hand,
      newActivePokemon,
      updatedBench,
      playerState.prizeCards,
      updatedDiscardPile,
      playerState.hasAttachedEnergyThisTurn,
    );

    // 7. Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    // 8. Create action summary
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.RETREAT,
      new Date(),
      {
        activePokemonInstanceId: activePokemon.instanceId,
        activePokemonCardId: activePokemon.cardId,
        benchPokemonInstanceId: benchPokemon.instanceId,
        benchPokemonCardId: benchPokemon.cardId,
        target: `BENCH_${benchIndex}`,
        selectedEnergyIds:
          selectedEnergyIds.length > 0 ? selectedEnergyIds : undefined,
        retreatCost,
      },
    );

    // 9. Update match
    const finalGameState = updatedGameState.withAction(actionSummary);
    match.updateGameState(finalGameState);
    return await this.matchRepository.save(match);
  }

  /**
   * Validate retreat request
   */
  private validateRetreatRequest(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): void {
    const hasAttack = this.hasAttackInCurrentTurn(gameState, playerIdentifier);
    if (hasAttack) {
      // If ATTACK was performed, ensure RETREAT comes after it
      const currentTurnActions = this.getCurrentTurnActions(
        gameState,
        playerIdentifier,
      );
      // Find last ATTACK index
      let lastAttackIndex = -1;
      for (let i = currentTurnActions.length - 1; i >= 0; i--) {
        if (currentTurnActions[i].actionType === PlayerActionType.ATTACK) {
          lastAttackIndex = i;
          break;
        }
      }

      // Check if there's a RETREAT before the last ATTACK
      if (lastAttackIndex >= 0) {
        const hasRetreatBeforeAttack = currentTurnActions
          .slice(0, lastAttackIndex)
          .some((action) => action.actionType === PlayerActionType.RETREAT);

        if (hasRetreatBeforeAttack) {
          throw new BadRequestException(
            'Cannot retreat. RETREAT must come after ATTACK in the action sequence.',
          );
        }
      }
    }
  }

  /**
   * Check if player has performed an attack in current turn
   */
  private hasAttackInCurrentTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const currentTurnActions = this.getCurrentTurnActions(
      gameState,
      playerIdentifier,
    );
    return currentTurnActions.some(
      (action) => action.actionType === PlayerActionType.ATTACK,
    );
  }

  /**
   * Get actions performed by player in current turn
   */
  private getCurrentTurnActions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): any[] {
    // Filter actions by current turn number and player
    return gameState.actionHistory.filter(
      (action) =>
        action.playerId === playerIdentifier &&
        // Assuming action has turnNumber property or we track it differently
        // This is a simplified version - adjust based on actual implementation
        true,
    );
  }
}
