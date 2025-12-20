import { Injectable } from '@nestjs/common';
import { GameState, PlayerGameState, CardInstance, CoinFlipResult } from '../../../value-objects';
import { PlayerIdentifier, StatusEffect } from '../../../enums';
import { Attack } from '../../../../../card/domain/value-objects/attack.value-object';
import { StatusConditionEffect } from '../../../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../../../../card/domain/enums/attack-effect-type.enum';
import { CoinFlipContext } from '../../../enums/coin-flip-context.enum';

export interface ApplyStatusEffectsParams {
  attack: Attack;
  attackText: string;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  playerState: PlayerGameState;
  opponentState: PlayerGameState;
  targetPokemon: CardInstance;
  evaluateEffectConditions: (
    conditions: any[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    coinFlipResults?: CoinFlipResult[],
  ) => Promise<boolean>;
  parseStatusEffectFromAttackText: (attackText: string) => StatusEffect | null;
}

export interface ApplyStatusEffectsResult {
  updatedPokemon: CardInstance;
  statusApplied: boolean;
  appliedStatus: StatusEffect | null;
}

/**
 * Attack Status Effect Service
 * Applies status effects from attacks to target Pokemon
 */
@Injectable()
export class AttackStatusEffectService {
  /**
   * Apply status effects from attack to target Pokemon
   */
  async applyStatusEffects(
    params: ApplyStatusEffectsParams,
  ): Promise<ApplyStatusEffectsResult> {
    const {
      attack,
      attackText,
      gameState,
      playerIdentifier,
      playerState,
      opponentState,
      targetPokemon,
      evaluateEffectConditions,
      parseStatusEffectFromAttackText,
    } = params;

    let updatedPokemon = targetPokemon;
    let statusApplied = false;
    let appliedStatus: StatusEffect | null = null;

    // Get coin flip results from game state if available (for ATTACK context coin flips)
    let attackCoinFlipResults: CoinFlipResult[] = [];
    if (
      gameState.coinFlipState?.context === CoinFlipContext.ATTACK &&
      gameState.coinFlipState.results.length > 0
    ) {
      attackCoinFlipResults = gameState.coinFlipState.results;
    }

    // Apply status effects from structured attack effects
    if (attack.hasEffects()) {
      const statusEffects = attack.getEffectsByType(
        AttackEffectType.STATUS_CONDITION,
      );
      for (const statusEffect of statusEffects as StatusConditionEffect[]) {
        const conditionsMet = await evaluateEffectConditions(
          statusEffect.requiredConditions || [],
          gameState,
          playerIdentifier,
          playerState,
          opponentState,
          attackCoinFlipResults,
        );

        if (conditionsMet) {
          const statusToApply = this.mapStatusConditionToStatusEffect(
            statusEffect.statusCondition,
          );
          if (statusToApply) {
            // Use withStatusEffectAdded to preserve existing status effects
            // Pokemon can have multiple status effects simultaneously (e.g., CONFUSED + POISONED)
            // Default poison damage is 10 if not specified
            updatedPokemon = updatedPokemon.withStatusEffectAdded(
              statusToApply,
              statusToApply === StatusEffect.POISONED ? 10 : undefined,
            );
            statusApplied = true;
            appliedStatus = statusToApply;
          }
        }
      }
    }

    // Fallback: parse status effect from attack text if not in structured effects
    if (!statusApplied) {
      const parsedStatus = parseStatusEffectFromAttackText(attackText);
      if (parsedStatus) {
        // Use withStatusEffectAdded to preserve existing status effects
        updatedPokemon = updatedPokemon.withStatusEffectAdded(parsedStatus);
        statusApplied = true;
        appliedStatus = parsedStatus;
      }
    }

    return {
      updatedPokemon,
      statusApplied,
      appliedStatus,
    };
  }

  /**
   * Map status condition string to StatusEffect enum
   */
  private mapStatusConditionToStatusEffect(
    statusCondition: string,
  ): StatusEffect | null {
    switch (statusCondition) {
      case StatusEffect.PARALYZED:
      case 'PARALYZED':
        return StatusEffect.PARALYZED;
      case StatusEffect.POISONED:
      case 'POISONED':
        return StatusEffect.POISONED;
      case StatusEffect.BURNED:
      case 'BURNED':
        return StatusEffect.BURNED;
      case StatusEffect.ASLEEP:
      case 'ASLEEP':
        return StatusEffect.ASLEEP;
      case StatusEffect.CONFUSED:
      case 'CONFUSED':
        return StatusEffect.CONFUSED;
      default:
        return null;
    }
  }
}

