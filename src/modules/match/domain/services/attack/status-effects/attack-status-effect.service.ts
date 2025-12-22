import { Injectable } from '@nestjs/common';
import { GameState, PlayerGameState, CardInstance, CoinFlipResult } from '../../../value-objects';
import { PlayerIdentifier, StatusEffect } from '../../../enums';
import { Attack } from '../../../../../card/domain/value-objects/attack.value-object';
import { StatusConditionEffect } from '../../../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../../../../card/domain/enums/attack-effect-type.enum';
import { CoinFlipContext } from '../../../enums/coin-flip-context.enum';

/**
 * Calculate the turn number when paralysis should be cleared for a given player
 * Paralysis is removed at the end of the affected player's next turn.
 * 
 * Player 1's turns are odd (1, 3, 5, 7...)
 * Player 2's turns are even (2, 4, 6, 8...)
 * 
 * @param currentTurn The current turn number
 * @param affectedPlayer The player whose Pokemon is paralyzed
 * @returns The turn number when paralysis should be cleared
 */
function calculateParalysisClearTurn(
  currentTurn: number,
  affectedPlayer: PlayerIdentifier,
): number {
  if (affectedPlayer === PlayerIdentifier.PLAYER1) {
    // Player 1's next turn is the next odd turn >= currentTurn + 1
    // If currentTurn is odd (Player 1's turn), next is currentTurn + 2
    // If currentTurn is even (Player 2's turn), next is currentTurn + 1
    return currentTurn % 2 === 1 ? currentTurn + 2 : currentTurn + 1;
  } else {
    // Player 2's next turn is the next even turn >= currentTurn + 1
    // If currentTurn is even (Player 2's turn), next is currentTurn + 2
    // If currentTurn is odd (Player 1's turn), next is currentTurn + 1
    return currentTurn % 2 === 0 ? currentTurn + 2 : currentTurn + 1;
  }
}

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
            // Calculate paralysis clear turn if applying PARALYZED
            // The target Pokemon belongs to the opponent (not the attacker)
            const targetPlayer = playerIdentifier === PlayerIdentifier.PLAYER1
              ? PlayerIdentifier.PLAYER2
              : PlayerIdentifier.PLAYER1;
            const paralysisClearsAtTurn = statusToApply === StatusEffect.PARALYZED
              ? calculateParalysisClearTurn(gameState.turnNumber, targetPlayer)
              : undefined;
            
            // Use withStatusEffectAdded to preserve existing status effects
            // Pokemon can have multiple status effects simultaneously (e.g., CONFUSED + POISONED)
            // Default poison damage is 10 if not specified
            updatedPokemon = updatedPokemon.withStatusEffectAdded(
              statusToApply,
              statusToApply === StatusEffect.POISONED ? 10 : undefined,
              paralysisClearsAtTurn,
            );
            statusApplied = true;
            appliedStatus = statusToApply;
          }
        }
      }
    }

    // Fallback: parse status effect from attack text if not in structured effects
    // Only use fallback if there are no structured effects with conditions
    // (if structured effects exist but conditions failed, don't apply via fallback)
    const hasStructuredStatusEffects = attack.hasEffects() &&
      attack.getEffectsByType(AttackEffectType.STATUS_CONDITION).length > 0;
    
    if (!statusApplied && !hasStructuredStatusEffects) {
      const parsedStatus = parseStatusEffectFromAttackText(attackText);
      if (parsedStatus) {
        // Check if attack text mentions coin flip requirement
        const attackTextLower = attackText.toLowerCase();
        const requiresHeads = attackTextLower.includes('if heads');
        const requiresTails = attackTextLower.includes('if tails');
        
        // If coin flip is required, check results before applying status
        if (requiresHeads || requiresTails) {
          if (attackCoinFlipResults.length === 0) {
            // No coin flip results available, don't apply status
            return {
              updatedPokemon,
              statusApplied: false,
              appliedStatus: null,
            };
          }
          
          // Check if coin flip condition is met
          const hasHeads = attackCoinFlipResults.some((result) => result.isHeads());
          const hasTails = attackCoinFlipResults.some((result) => result.isTails());
          
          const conditionMet = requiresHeads ? hasHeads : hasTails;
          
          if (!conditionMet) {
            // Coin flip condition not met, don't apply status
            return {
              updatedPokemon,
              statusApplied: false,
              appliedStatus: null,
            };
          }
        }
        
        // Calculate paralysis clear turn if applying PARALYZED
        // The target Pokemon belongs to the opponent (not the attacker)
        const targetPlayer = playerIdentifier === PlayerIdentifier.PLAYER1
          ? PlayerIdentifier.PLAYER2
          : PlayerIdentifier.PLAYER1;
        const paralysisClearsAtTurn = parsedStatus === StatusEffect.PARALYZED
          ? calculateParalysisClearTurn(gameState.turnNumber, targetPlayer)
          : undefined;
        
        // Use withStatusEffectAdded to preserve existing status effects
        updatedPokemon = updatedPokemon.withStatusEffectAdded(
          parsedStatus,
          undefined,
          paralysisClearsAtTurn,
        );
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

