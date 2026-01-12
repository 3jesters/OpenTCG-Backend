import { Injectable } from '@nestjs/common';
import { GameState } from '../../../value-objects';
import { PlayerIdentifier } from '../../../enums';

/**
 * Damage Prevention Service
 * Applies damage prevention and reduction effects from game state
 */
@Injectable()
export class DamagePreventionService {
  /**
   * Apply damage prevention effects
   * Prevention can be 'all' or a specific number
   */
  applyDamagePrevention(
    damage: number,
    gameState: GameState,
    opponentIdentifier: PlayerIdentifier,
    pokemonInstanceId: string,
  ): number {
    const preventionEffect = gameState.getDamagePrevention(
      opponentIdentifier,
      pokemonInstanceId,
    );

    if (!preventionEffect) {
      return damage;
    }

    if (preventionEffect.amount === 'all') {
      return 0;
    }

    if (typeof preventionEffect.amount === 'number') {
      if (damage <= preventionEffect.amount) {
        return 0;
      }
    }

    return damage;
  }

  /**
   * Apply damage reduction effects
   * Reduction subtracts a fixed amount from damage
   */
  applyDamageReduction(
    damage: number,
    gameState: GameState,
    opponentIdentifier: PlayerIdentifier,
    pokemonInstanceId: string,
  ): number {
    const reductionAmount = gameState.getDamageReduction(
      opponentIdentifier,
      pokemonInstanceId,
    );

    if (reductionAmount > 0) {
      return Math.max(0, damage - reductionAmount);
    }

    return damage;
  }
}
