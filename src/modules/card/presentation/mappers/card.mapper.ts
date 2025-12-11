import { Card } from '../../domain/entities/card.entity';
import { CardSummaryDto } from '../dto/card-summary.dto';
import { CardDetailDto } from '../dto/card-detail.dto';
import { AbilityDto } from '../dto/ability.dto';
import { AbilityEffectDto } from '../dto/ability-effect.dto';
import { AttackDto } from '../dto/attack.dto';
import { WeaknessDto } from '../dto/weakness.dto';
import { ResistanceDto } from '../dto/resistance.dto';
import { TrainerEffectDto } from '../dto/trainer-effect.dto';
import { Ability, Attack, Weakness, Resistance, TrainerEffect, AnyAbilityEffect } from '../../domain/value-objects';
import { AbilityEffectType } from '../../domain/enums/ability-effect-type.enum';

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
      effects: ability.effects.map((effect) => this.mapAbilityEffect(effect as AnyAbilityEffect)),
    };
  }

  /**
   * Map AbilityEffect to AbilityEffectDto
   */
  private static mapAbilityEffect(effect: AnyAbilityEffect): AbilityEffectDto {
    const dto: AbilityEffectDto = {
      effectType: effect.effectType,
    };

    // Common properties
    if (effect.target !== undefined) {
      dto.target = effect.target;
    }

    // Effect-specific properties
    switch (effect.effectType) {
      case AbilityEffectType.HEAL:
        dto.amount = effect.amount;
        break;

      case AbilityEffectType.PREVENT_DAMAGE:
        dto.duration = effect.duration;
        if (effect.amount !== undefined) {
          dto.amount = effect.amount;
        }
        break;

      case AbilityEffectType.STATUS_CONDITION:
        dto.statusCondition = effect.statusCondition;
        break;

      case AbilityEffectType.ENERGY_ACCELERATION:
        dto.source = effect.source;
        dto.count = effect.count;
        if (effect.energyType !== undefined) {
          dto.energyType = effect.energyType;
        }
        if (effect.targetPokemonType !== undefined) {
          dto.targetPokemonType = effect.targetPokemonType;
        }
        if (effect.sourcePokemonType !== undefined) {
          dto.sourcePokemonType = effect.sourcePokemonType;
        }
        if (effect.selector !== undefined) {
          dto.selector = effect.selector;
        }
        break;

      case AbilityEffectType.SWITCH_POKEMON:
        dto.selector = effect.selector;
        dto.with = effect.with;
        break;

      case AbilityEffectType.DRAW_CARDS:
        dto.count = effect.count;
        break;

      case AbilityEffectType.SEARCH_DECK:
        dto.count = effect.count;
        dto.destination = effect.destination;
        if (effect.cardType !== undefined) {
          dto.cardType = effect.cardType;
        }
        if (effect.pokemonType !== undefined) {
          dto.pokemonType = effect.pokemonType;
        }
        if (effect.selector !== undefined) {
          dto.selector = effect.selector;
        }
        break;

      case AbilityEffectType.BOOST_ATTACK:
        dto.modifier = effect.modifier;
        if (effect.affectedTypes !== undefined) {
          dto.affectedTypes = effect.affectedTypes;
        }
        break;

      case AbilityEffectType.BOOST_HP:
        dto.modifier = effect.modifier;
        break;

      case AbilityEffectType.REDUCE_DAMAGE:
        dto.amount = effect.amount;
        if (effect.source !== undefined) {
          // Note: source in REDUCE_DAMAGE is PokemonType, not EnergySource
          // We'll map it to a different field if needed, but for now we'll skip it
          // as it's not in the DTO structure
        }
        break;

      case AbilityEffectType.DISCARD_FROM_HAND:
        dto.count = effect.count;
        dto.selector = effect.selector;
        if (effect.cardType !== undefined) {
          dto.cardType = effect.cardType;
        }
        break;

      case AbilityEffectType.ATTACH_FROM_DISCARD:
        dto.count = effect.count;
        if (effect.energyType !== undefined) {
          dto.energyType = effect.energyType;
        }
        if (effect.selector !== undefined) {
          dto.selector = effect.selector;
        }
        break;

      case AbilityEffectType.RETRIEVE_FROM_DISCARD:
        dto.count = effect.count;
        dto.selector = effect.selector;
        if (effect.cardType !== undefined) {
          dto.cardType = effect.cardType;
        }
        if (effect.pokemonType !== undefined) {
          dto.pokemonType = effect.pokemonType;
        }
        break;
    }

    return dto;
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

