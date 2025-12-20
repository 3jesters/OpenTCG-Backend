import { Injectable } from '@nestjs/common';
import { Attack } from '../../../../../card/domain/value-objects/attack.value-object';
import { PlayerGameState, CardInstance, GameState } from '../../../value-objects';
import { PlayerIdentifier } from '../../../enums';
import { EnergyType } from '../../../../../card/domain/enums/energy-type.enum';
import { Card } from '../../../../../card/domain/entities';
import { AttackTextParserService } from './attack-text-parser.service';

/**
 * Attack Damage Calculator Service
 * Calculates damage bonuses and reductions for attacks
 */
@Injectable()
export class AttackDamageCalculatorService {
  constructor(
    private readonly attackTextParser: AttackTextParserService,
  ) {}

  /**
   * Calculate plus damage bonus for "+" damage attacks
   * Handles various types: Water Energy-based (with cap), defending energy, damage counters, bench, coin flip, conditional
   */
  async calculatePlusDamageBonus(
    attack: Attack,
    attackerCardName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    attackText: string,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    const text = attackText.toLowerCase();

    // 1. Water Energy-based attacks (with cap)
    if (text.includes('water energy') && text.includes('but not used to pay')) {
      return await this.calculateWaterEnergyBonus(
        attack,
        playerState,
        attackText,
        getCardEntity,
      );
    }

    // 2. Defending Energy-based attacks (no cap)
    if (
      text.includes('for each energy card attached to the defending pokémon')
    ) {
      return await this.calculateDefendingEnergyBonus(
        opponentState,
        attackText,
      );
    }

    // 3. Damage counter-based attacks (no cap)
    if (text.includes('for each damage counter')) {
      return this.calculateDamageCounterBonus(
        attack,
        attackText,
        attackerCardName,
        playerState,
        opponentState,
      );
    }

    // 4. Bench-based attacks (no cap)
    if (text.includes('for each of your benched pokémon')) {
      return this.calculateBenchBonus(playerState, attackText);
    }

    // 5. Coin flip-based attacks (handled separately in coin flip logic, return 0 here)
    if (text.includes('flip a coin') && text.includes('if heads')) {
      return 0; // Coin flip bonuses are handled in coin flip resolver
    }

    // 6. Conditional attacks (handled separately, return 0 here)
    if (text.includes('if ') && text.includes('this attack does')) {
      return 0; // Conditional bonuses are handled via structured effects
    }

    return 0;
  }

  /**
   * Calculate Water Energy-based bonus damage with cap enforcement
   */
  private async calculateWaterEnergyBonus(
    attack: Attack,
    playerState: PlayerGameState,
    attackText: string,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    if (!attack.energyBonusCap) {
      return 0; // No cap set, shouldn't happen for Water Energy attacks
    }

    // Extract damage per energy (usually 10)
    const text = attackText.toLowerCase();
    const damagePerEnergyMatch = text.match(
      /plus\s+(\d+)\s+more\s+damage\s+for\s+each/i,
    );
    if (!damagePerEnergyMatch) {
      return 0;
    }
    const damagePerEnergy = parseInt(damagePerEnergyMatch[1], 10);

    // Count Water Energy attached to attacker
    if (!playerState.activePokemon) {
      return 0;
    }

    let waterEnergyCount = 0;
    for (const energyId of playerState.activePokemon.attachedEnergy) {
      try {
        const energyCard = await getCardEntity(energyId);
        if (energyCard.energyType === EnergyType.WATER) {
          waterEnergyCount++;
        }
      } catch {
        // Skip if card lookup fails
      }
    }

    // Count Water Energy required for attack cost
    const waterEnergyRequired = attack.getEnergyCountByType(EnergyType.WATER);

    // Calculate extra Water Energy (beyond attack cost)
    const extraWaterEnergy = Math.max(
      0,
      waterEnergyCount - waterEnergyRequired,
    );

    // Apply cap
    const cappedExtraEnergy = Math.min(extraWaterEnergy, attack.energyBonusCap);

    // Calculate bonus damage
    return cappedExtraEnergy * damagePerEnergy;
  }

  /**
   * Calculate defending Energy-based bonus damage (no cap)
   */
  private async calculateDefendingEnergyBonus(
    opponentState: PlayerGameState,
    attackText: string,
  ): Promise<number> {
    // Extract damage per energy (usually 10)
    const text = attackText.toLowerCase();
    const damagePerEnergyMatch = text.match(
      /plus\s+(\d+)\s+more\s+damage\s+for\s+each/i,
    );
    if (!damagePerEnergyMatch) {
      return 0;
    }
    const damagePerEnergy = parseInt(damagePerEnergyMatch[1], 10);

    // Count all Energy attached to defending Pokemon
    if (!opponentState.activePokemon) {
      return 0;
    }

    const energyCount = opponentState.activePokemon.attachedEnergy.length;

    return energyCount * damagePerEnergy;
  }

  /**
   * Calculate damage counter-based bonus damage (no cap)
   */
  private calculateDamageCounterBonus(
    attack: Attack,
    attackText: string,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ): number {
    const text = attackText.toLowerCase();

    // Extract damage per counter (usually 10)
    const damagePerCounterMatch = text.match(
      /plus\s+(\d+)\s+more\s+damage\s+for\s+each\s+damage\s+counter/i,
    );
    if (!damagePerCounterMatch) {
      return 0;
    }
    const damagePerCounter = parseInt(damagePerCounterMatch[1], 10);

    // Determine target (self or defending)
    let targetPokemon: CardInstance | null = null;
    if (text.includes(`on ${attackerName.toLowerCase()}`)) {
      targetPokemon = playerState.activePokemon;
    } else if (text.includes('on the defending pokémon')) {
      targetPokemon = opponentState.activePokemon;
    } else {
      // Try to infer from context
      targetPokemon = opponentState.activePokemon;
    }

    if (!targetPokemon) {
      return 0;
    }

    // Calculate damage counters (each 10 HP = 1 damage counter)
    const totalDamage = targetPokemon.getDamageCounters();
    const damageCounters = Math.floor(totalDamage / 10);

    return damageCounters * damagePerCounter;
  }

  /**
   * Calculate bench-based bonus damage (no cap)
   */
  private calculateBenchBonus(
    playerState: PlayerGameState,
    attackText: string,
  ): number {
    const text = attackText.toLowerCase();

    // Extract damage per benched Pokemon (usually 10)
    const damagePerBenchMatch = text.match(
      /plus\s+(\d+)\s+more\s+damage\s+for\s+each/i,
    );
    if (!damagePerBenchMatch) {
      return 0;
    }
    const damagePerBench = parseInt(damagePerBenchMatch[1], 10);

    // Count benched Pokemon
    const benchCount = playerState.bench.length;

    return benchCount * damagePerBench;
  }

  /**
   * Apply minus damage reduction based on damage counters
   * For attacks like "Does 50 damage minus 10 damage for each damage counter on Machoke"
   */
  calculateMinusDamageReduction(
    baseDamage: number,
    attack: Attack,
    attackText: string,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ): number {
    // Check if attack has "-" damage pattern
    if (!attack.damage || !attack.damage.endsWith('-')) {
      return baseDamage;
    }

    // Parse minus damage reduction info
    const minusInfo = this.attackTextParser.parseMinusDamageReduction(
      attackText,
      attackerName,
    );
    if (!minusInfo) {
      return baseDamage; // Couldn't parse, return base damage
    }

    // Get target Pokemon
    const targetPokemon =
      minusInfo.target === 'self'
        ? playerState.activePokemon
        : opponentState.activePokemon;

    if (!targetPokemon) {
      return baseDamage;
    }

    // Calculate damage counters (each 10 HP = 1 damage counter)
    const totalDamage = targetPokemon.getDamageCounters(); // Returns maxHp - currentHp
    const damageCounters = Math.floor(totalDamage / 10);

    // Calculate reduction
    const reduction = damageCounters * minusInfo.reductionPerCounter;

    // Apply reduction (ensure damage doesn't go below 0)
    return Math.max(0, baseDamage - reduction);
  }
}

