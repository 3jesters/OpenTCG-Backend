import { Injectable } from '@nestjs/common';
import { Card } from '../../../../../card/domain/entities';

/**
 * Weakness Resistance Service
 * Applies weakness multipliers and resistance reductions to damage
 */
@Injectable()
export class WeaknessResistanceService {
  /**
   * Apply weakness multiplier to damage
   * Weakness typically multiplies damage by ×2
   */
  applyWeakness(
    damage: number,
    attackerCard: Card,
    defenderCard: Card,
  ): number {
    if (!defenderCard.weakness || !attackerCard.pokemonType) {
      return damage;
    }

    if (
      defenderCard.weakness.type.toString() ===
      attackerCard.pokemonType.toString()
    ) {
      const modifier = defenderCard.weakness.modifier;
      if (modifier === '×2') {
        return damage * 2;
      }
    }

    return damage;
  }

  /**
   * Apply resistance reduction to damage
   * Resistance typically reduces damage by a fixed amount (e.g., -20, -30)
   */
  applyResistance(
    damage: number,
    attackerCard: Card,
    defenderCard: Card,
  ): number {
    if (!defenderCard.resistance || !attackerCard.pokemonType) {
      return damage;
    }

    if (
      defenderCard.resistance.type.toString() ===
      attackerCard.pokemonType.toString()
    ) {
      const modifier = defenderCard.resistance.modifier;
      const reduction = parseInt(modifier, 10);
      if (!isNaN(reduction)) {
        return Math.max(0, damage + reduction);
      }
    }

    return damage;
  }
}

