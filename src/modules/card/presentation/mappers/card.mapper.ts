import { Card } from '../../domain/entities/card.entity';
import { CardSummaryDto } from '../dto/card-summary.dto';
import { CardDetailDto } from '../dto/card-detail.dto';
import { AbilityDto } from '../dto/ability.dto';
import { AttackDto } from '../dto/attack.dto';
import { WeaknessDto } from '../dto/weakness.dto';
import { ResistanceDto } from '../dto/resistance.dto';
import { TrainerEffectDto } from '../dto/trainer-effect.dto';
import { Ability, Attack, Weakness, Resistance, TrainerEffect } from '../../domain/value-objects';

/**
 * Card Mapper
 * Maps Card domain entities to DTOs
 */
export class CardMapper {
  /**
   * Map Card to CardSummaryDto (for list views)
   */
  static toCardSummaryDto(card: Card): CardSummaryDto {
    return {
      cardId: card.cardId,
      instanceId: card.instanceId,
      name: card.name,
      cardNumber: card.cardNumber,
      setName: card.setName,
      cardType: card.cardType,
      pokemonType: card.pokemonType,
      rarity: card.rarity,
      hp: card.hp,
      imageUrl: card.imageUrl,
    };
  }

  /**
   * Map Card to CardDetailDto (full details)
   */
  static toCardDetailDto(card: Card): CardDetailDto {
    return {
      cardId: card.cardId,
      instanceId: card.instanceId,
      name: card.name,
      pokemonNumber: card.pokemonNumber,
      cardNumber: card.cardNumber,
      setName: card.setName,
      cardType: card.cardType,
      pokemonType: card.pokemonType,
      rarity: card.rarity,
      hp: card.hp,
      stage: card.stage,
      level: card.level,
      evolvesFrom: card.evolvesFrom?.name,
      ability: card.ability ? this.mapAbility(card.ability) : undefined,
      attacks: card.attacks.map((attack) => this.mapAttack(attack)),
      weakness: card.weakness ? this.mapWeakness(card.weakness) : undefined,
      resistance: card.resistance ? this.mapResistance(card.resistance) : undefined,
      retreatCost: card.retreatCost,
      artist: card.artist,
      description: card.description || undefined,
      imageUrl: card.imageUrl,
      regulationMark: card.regulationMark,
      energyType: card.energyType,
      trainerType: card.trainerType,
      trainerEffects: card.trainerEffects.length > 0
        ? card.trainerEffects.map((effect) => this.mapTrainerEffect(effect))
        : undefined,
    };
  }

  /**
   * Map Ability value object to AbilityDto
   */
  private static mapAbility(ability: Ability): AbilityDto {
    return {
      name: ability.name,
      text: ability.text,
      activationType: ability.activationType,
      triggerEvent: ability.triggerEvent,
      usageLimit: ability.usageLimit,
    };
  }

  /**
   * Map Attack value object to AttackDto
   */
  private static mapAttack(attack: Attack): AttackDto {
    return {
      name: attack.name,
      energyCost: attack.energyCost,
      damage: attack.damage,
      text: attack.text,
    };
  }

  /**
   * Map Weakness value object to WeaknessDto
   */
  private static mapWeakness(weakness: Weakness): WeaknessDto {
    return {
      type: weakness.type,
      modifier: weakness.modifier,
    };
  }

  /**
   * Map Resistance value object to ResistanceDto
   */
  private static mapResistance(resistance: Resistance): ResistanceDto {
    return {
      type: resistance.type,
      modifier: resistance.modifier,
    };
  }

  /**
   * Map TrainerEffect value object to TrainerEffectDto
   */
  private static mapTrainerEffect(effect: TrainerEffect): TrainerEffectDto {
    return {
      effectType: effect.effectType,
      target: effect.target,
      value: effect.value,
      cardType: effect.cardType,
      condition: effect.condition,
      description: effect.description,
      source: effect.source,
    };
  }
}

