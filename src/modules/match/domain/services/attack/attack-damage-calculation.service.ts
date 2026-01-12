import { Injectable } from '@nestjs/common';
import { GameState, PlayerGameState } from '../../value-objects';
import { PlayerIdentifier } from '../../enums';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects/attack.value-object';
import { DamageModifierEffect } from '../../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../../../card/domain/enums/attack-effect-type.enum';
import { AttackDamageCalculatorService } from './damage-bonuses/attack-damage-calculator.service';
import { WeaknessResistanceService } from './damage-modifiers/weakness-resistance.service';
import { DamagePreventionService } from './damage-modifiers/damage-prevention.service';

export interface CalculateFinalDamageParams {
  baseDamage: number;
  attack: Attack;
  attackerCard: Card;
  defenderCard: Card;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  playerState: PlayerGameState;
  opponentState: PlayerGameState;
  calculateMinusDamageReduction: (
    damage: number,
    attack: Attack,
    attackText: string,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ) => number;
  calculatePlusDamageBonus: (
    attack: Attack,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    attackText: string,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ) => Promise<number>;
  evaluateEffectConditions: (
    conditions: any[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ) => Promise<boolean>;
}

/**
 * Attack Damage Calculation Service
 * Orchestrates all damage calculations including modifiers, weakness, resistance, and prevention
 */
@Injectable()
export class AttackDamageCalculationService {
  constructor(
    private readonly attackDamageCalculator: AttackDamageCalculatorService,
    private readonly weaknessResistance: WeaknessResistanceService,
    private readonly damagePrevention: DamagePreventionService,
  ) {}

  /**
   * Calculate final damage after all modifiers, weakness, resistance, and prevention
   */
  async calculateFinalDamage(
    params: CalculateFinalDamageParams,
  ): Promise<number> {
    const {
      baseDamage,
      attack,
      attackerCard,
      defenderCard,
      gameState,
      playerIdentifier,
      playerState,
      opponentState,
      calculateMinusDamageReduction,
      calculatePlusDamageBonus,
      evaluateEffectConditions,
    } = params;

    let damage = baseDamage;

    // Apply minus damage reduction
    damage = calculateMinusDamageReduction(
      damage,
      attack,
      attack.text || '',
      attackerCard.name,
      playerState,
      opponentState,
    );

    // Apply damage modifiers
    let finalDamage = damage;

    // Handle "+" damage attacks
    if (attack.damage && attack.damage.endsWith('+')) {
      const plusDamageBonus = await calculatePlusDamageBonus(
        attack,
        attackerCard.name,
        playerState,
        opponentState,
        attack.text || '',
        gameState,
        playerIdentifier,
      );
      finalDamage += plusDamageBonus;
    }

    // Apply structured damage modifiers from attack effects
    if (attack.hasEffects()) {
      const damageModifiers = attack.getEffectsByType(
        AttackEffectType.DAMAGE_MODIFIER,
      );
      for (const modifierEffect of damageModifiers as DamageModifierEffect[]) {
        const conditionsMet = await evaluateEffectConditions(
          modifierEffect.requiredConditions || [],
          gameState,
          playerIdentifier,
          playerState,
          opponentState,
        );
        if (conditionsMet) {
          finalDamage += modifierEffect.modifier;
        }
      }
    }

    finalDamage = Math.max(0, finalDamage);

    // Apply weakness
    finalDamage = this.weaknessResistance.applyWeakness(
      finalDamage,
      attackerCard,
      defenderCard,
    );

    // Apply resistance
    finalDamage = this.weaknessResistance.applyResistance(
      finalDamage,
      attackerCard,
      defenderCard,
    );

    // Apply damage prevention
    if (!opponentState.activePokemon) {
      throw new Error('Opponent active Pokemon is null');
    }
    const opponentIdentifier =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? PlayerIdentifier.PLAYER2
        : PlayerIdentifier.PLAYER1;

    finalDamage = this.damagePrevention.applyDamagePrevention(
      finalDamage,
      gameState,
      opponentIdentifier,
      opponentState.activePokemon.instanceId,
    );

    // Apply damage reduction
    if (!opponentState.activePokemon) {
      throw new Error('Opponent active Pokemon is null');
    }
    finalDamage = this.damagePrevention.applyDamageReduction(
      finalDamage,
      gameState,
      opponentIdentifier,
      opponentState.activePokemon.instanceId,
    );

    return finalDamage;
  }
}
