import { Injectable } from '@nestjs/common';
import { CardInstance, PlayerGameState } from '../../../value-objects';

export interface ApplyActiveDamageParams {
  pokemon: CardInstance;
  damage: number;
}

export interface ApplySelfDamageParams {
  attackerPokemon: CardInstance;
  selfDamage: number;
}

export interface ApplySelfDamageResult {
  updatedPokemon: CardInstance | null;
  isKnockedOut: boolean;
}

export interface ApplyBenchDamageParams {
  bench: CardInstance[];
  benchDamage: number;
}

export interface ApplyBenchDamageResult {
  updatedBench: CardInstance[];
  knockedOutBench: CardInstance[];
}

/**
 * Attack Damage Application Service
 * Applies damage to Pokemon (active, self, bench)
 */
@Injectable()
export class AttackDamageApplicationService {
  /**
   * Apply damage to active Pokemon
   */
  applyActiveDamage(params: ApplyActiveDamageParams): CardInstance {
    const { pokemon, damage } = params;
    const newHp = Math.max(0, pokemon.currentHp - damage);
    return pokemon.withHp(newHp);
  }

  /**
   * Apply self-damage to attacker Pokemon
   */
  applySelfDamage(params: ApplySelfDamageParams): ApplySelfDamageResult {
    const { attackerPokemon, selfDamage } = params;
    const attackerNewHp = Math.max(0, attackerPokemon.currentHp - selfDamage);
    const updatedPokemon = attackerPokemon.withHp(attackerNewHp);
    const isKnockedOut = attackerNewHp === 0;

    return {
      updatedPokemon: isKnockedOut ? null : updatedPokemon,
      isKnockedOut,
    };
  }

  /**
   * Apply bench damage to opponent's bench Pokemon
   */
  applyBenchDamage(params: ApplyBenchDamageParams): ApplyBenchDamageResult {
    const { bench, benchDamage } = params;

    if (benchDamage <= 0 || bench.length === 0) {
      return {
        updatedBench: bench,
        knockedOutBench: [],
      };
    }

    const updatedBench = bench.map((benchPokemon) => {
      const benchNewHp = Math.max(0, benchPokemon.currentHp - benchDamage);
      return benchPokemon.withHp(benchNewHp);
    });

    // Filter out knocked out bench Pokemon
    const knockedOutBench = updatedBench.filter((p) => p.currentHp === 0);
    const remainingBench = updatedBench.filter((p) => p.currentHp > 0);

    return {
      updatedBench: remainingBench,
      knockedOutBench,
    };
  }
}
