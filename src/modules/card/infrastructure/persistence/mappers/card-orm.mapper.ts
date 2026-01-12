import { Card } from '../../../domain/entities';
import { CardOrmEntity } from '../entities';
import {
  Attack,
  Ability,
  Weakness,
  Resistance,
  Evolution,
  CardRule,
  TrainerEffect,
  EnergyProvision,
} from '../../../domain/value-objects';
import {
  CardType,
  EnergyType,
  PokemonType,
  EvolutionStage,
  AbilityActivationType,
  AbilityEffectType,
  TrainerEffectType,
  TargetType,
} from '../../../domain/enums';
import { AbilityEffectFactory } from '../../../domain/value-objects/ability-effect.value-object';
import { AbilityEffectNormalizer } from './ability-effect-normalizer.util';

/**
 * Card ORM Mapper
 * Converts between CardOrmEntity and Card domain entity
 * Handles complex value objects serialization/deserialization
 */
export class CardOrmMapper {
  static toDomain(ormEntity: CardOrmEntity): Card {
    // Create base card - handle nullable pokemonNumber
    const card = new Card(
      ormEntity.instanceId,
      ormEntity.cardId,
      ormEntity.pokemonNumber || undefined, // Convert null to undefined
      ormEntity.name,
      ormEntity.setName,
      ormEntity.cardNumber,
      ormEntity.rarity,
      ormEntity.cardType,
      ormEntity.description,
      ormEntity.artist,
      ormEntity.imageUrl,
    );

    // Set optional fields
    if (ormEntity.pokemonType) {
      card.setPokemonType(ormEntity.pokemonType);
    }

    if (ormEntity.stage) {
      card.setStage(ormEntity.stage);
    }

    ormEntity.subtypes.forEach((subtype) => {
      if (subtype) card.addSubtype(subtype);
    });

    // Evolution - handle both string and object formats
    if (ormEntity.evolvesFrom) {
      // If evolvesFrom is a string (legacy format), skip it as we need pokemonNumber
      if (typeof ormEntity.evolvesFrom === 'string') {
        // Skip string format - Evolution requires pokemonNumber
      } else if (ormEntity.evolvesFrom.pokemonNumber) {
        // Object format with pokemonNumber
        const evolution = new Evolution(
          ormEntity.evolvesFrom.pokemonNumber,
          ormEntity.evolvesFrom.stage,
          ormEntity.evolvesFrom.condition,
        );
        card.setEvolvesFrom(evolution);
      }
    }

    ormEntity.evolvesTo.forEach((evo: any) => {
      // Skip evolution entries without pokemonNumber (required by Evolution value object)
      // Also skip if evo is a string (legacy format)
      if (typeof evo === 'string' || !evo.pokemonNumber) {
        return;
      }
      const evolution = new Evolution(
        evo.pokemonNumber,
        evo.stage as EvolutionStage,
        evo.condition,
      );
      card.addEvolvesTo(evolution);
    });

    // Battle stats
    if (ormEntity.hp !== null) {
      card.setHp(ormEntity.hp);
    }

    if (ormEntity.retreatCost !== null) {
      card.setRetreatCost(ormEntity.retreatCost);
    }

    // Combat modifiers - Weakness and Resistance use EnergyType
    if (ormEntity.weakness) {
      const weakness = new Weakness(
        ormEntity.weakness.type as unknown as EnergyType, // Cast through unknown
        ormEntity.weakness.modifier,
      );
      card.setWeakness(weakness);
    }

    if (ormEntity.resistance) {
      const resistance = new Resistance(
        ormEntity.resistance.type as unknown as EnergyType, // Cast through unknown
        ormEntity.resistance.modifier,
      );
      card.setResistance(resistance);
    }

    // Attacks
    ormEntity.attacks.forEach((attackJson: any) => {
      const attack = new Attack(
        attackJson.name,
        (attackJson.energyCost || []).map((e: string) => e as EnergyType),
        (attackJson.damage || 0).toString(),
        attackJson.description || attackJson.text || '',
      );
      card.addAttack(attack);
    });

    // Ability
    if (ormEntity.ability) {
      const abilityData = ormEntity.ability as any;
      // Ability requires at least one effect - use placeholder if none provided
      let effects =
        abilityData.effects && abilityData.effects.length > 0
          ? abilityData.effects
          : [AbilityEffectFactory.drawCards(1)]; // Placeholder effect

      // Normalize effects to fix invalid targets (e.g., DEFENDING in HEAL effects)
      effects = AbilityEffectNormalizer.normalize(effects);

      const ability = new Ability(
        abilityData.name,
        abilityData.description || abilityData.text || '',
        (abilityData.type ||
          abilityData.activationType) as AbilityActivationType,
        effects,
        abilityData.triggerEvent,
        abilityData.usageLimit,
      );
      card.setAbility(ability);
    }

    // Rules text
    if (ormEntity.rulesText) {
      card.setRulesText(ormEntity.rulesText);
    }

    // Trainer type
    if (ormEntity.trainerType) {
      card.setTrainerType(ormEntity.trainerType);
    }

    // Trainer effects
    ormEntity.trainerEffects.forEach((effectJson: any) => {
      if (effectJson && effectJson.effectType) {
        const effect = new TrainerEffect(
          effectJson.effectType as TrainerEffectType,
          effectJson.target as TargetType,
          effectJson.value,
          effectJson.cardType,
          effectJson.condition,
          effectJson.description,
          effectJson.source,
        );
        card.addTrainerEffect(effect);
      }
    });

    // Energy type
    if (ormEntity.energyType) {
      card.setEnergyType(ormEntity.energyType);
    }

    // Energy provision
    if (ormEntity.energyProvision) {
      const provision = ormEntity.energyProvision as any;
      const energyProvision = new EnergyProvision(
        (
          provision.energyTypes ||
          provision.provides || [provision.energyType]
        ).map((e: string) => e as EnergyType),
        provision.amount || 1,
        provision.isSpecial || false,
        provision.restrictions,
        provision.additionalEffects || provision.specialEffect,
      );
      card.setEnergyProvision(energyProvision);
    }

    // Regulation mark
    if (ormEntity.regulationMark) {
      card.setRegulationMark(ormEntity.regulationMark);
    }

    // Editor metadata
    if (
      ormEntity.isEditorCreated &&
      ormEntity.createdBy &&
      ormEntity.createdAt
    ) {
      card.setEditorMetadata(ormEntity.createdBy, ormEntity.createdAt);
    }

    return card;
  }

  static toOrm(domainEntity: Card): CardOrmEntity {
    const ormEntity = new CardOrmEntity();

    // Identity & Cataloging
    ormEntity.instanceId = domainEntity.instanceId;
    ormEntity.cardId = domainEntity.cardId;
    ormEntity.pokemonNumber = domainEntity.pokemonNumber || null; // Convert undefined to null
    ormEntity.name = domainEntity.name;
    ormEntity.setName = domainEntity.setName;
    ormEntity.cardNumber = domainEntity.cardNumber;
    ormEntity.rarity = domainEntity.rarity;

    // Card Type & Classification
    ormEntity.cardType = domainEntity.cardType;
    ormEntity.pokemonType = domainEntity.pokemonType || null;
    ormEntity.stage = domainEntity.stage || null;
    ormEntity.subtypes = domainEntity.subtypes;

    // Evolution Chain
    if (domainEntity.evolvesFrom) {
      ormEntity.evolvesFrom = {
        pokemonNumber: domainEntity.evolvesFrom.pokemonNumber,
        stage: domainEntity.evolvesFrom.stage,
        condition: domainEntity.evolvesFrom.condition,
      } as any;
    } else {
      ormEntity.evolvesFrom = null;
    }

    ormEntity.evolvesTo = domainEntity.evolvesTo.map((evo) => ({
      pokemonNumber: evo.pokemonNumber,
      stage: evo.stage,
      condition: evo.condition,
    })) as any[];

    // Battle Stats
    ormEntity.hp = domainEntity.hp || null;
    ormEntity.retreatCost = domainEntity.retreatCost || null;

    // Combat Modifiers
    if (domainEntity.weakness) {
      ormEntity.weakness = {
        type: domainEntity.weakness.type,
        modifier: domainEntity.weakness.modifier,
      } as any;
    } else {
      ormEntity.weakness = null;
    }

    if (domainEntity.resistance) {
      ormEntity.resistance = {
        type: domainEntity.resistance.type,
        modifier: domainEntity.resistance.modifier,
      } as any;
    } else {
      ormEntity.resistance = null;
    }

    // Attacks
    ormEntity.attacks = domainEntity.attacks.map((attack) => ({
      name: attack.name,
      energyCost: attack.energyCost,
      damage: parseInt(attack.damage) || 0,
      description: attack.text,
      text: attack.text,
    })) as any[];

    // Ability
    if (domainEntity.ability) {
      ormEntity.ability = {
        name: domainEntity.ability.name,
        description: domainEntity.ability.text,
        text: domainEntity.ability.text,
        type: domainEntity.ability.activationType,
        activationType: domainEntity.ability.activationType,
      } as any;
    } else {
      ormEntity.ability = null;
    }

    // Rules & Effects
    ormEntity.rulesText = domainEntity.rulesText || null;
    ormEntity.cardRules = (domainEntity.cardRules || []).map((rule) => ({
      ruleType: rule.ruleType,
      text: rule.text,
      priority: rule.priority,
      conditions: rule.conditions,
      metadata: rule.metadata,
    })) as any[];

    // Trainer Card Specific
    ormEntity.trainerType = domainEntity.trainerType || null;
    ormEntity.trainerEffects = domainEntity.trainerEffects.map((effect) => ({
      effectType: effect.effectType,
      target: effect.target,
      value: effect.value,
      cardType: effect.cardType,
      condition: effect.condition,
      description: effect.description,
      source: effect.source,
    })) as any[];

    // Energy Card Specific
    ormEntity.energyType = domainEntity.energyType || null;
    if (domainEntity.energyProvision) {
      ormEntity.energyProvision = {
        energyTypes: domainEntity.energyProvision.energyTypes,
        amount: domainEntity.energyProvision.amount,
        isSpecial: domainEntity.energyProvision.isSpecial,
        restrictions: domainEntity.energyProvision.restrictions,
        additionalEffects: domainEntity.energyProvision.additionalEffects,
      } as any;
    } else {
      ormEntity.energyProvision = null;
    }

    // Metadata
    ormEntity.description = domainEntity.description;
    ormEntity.artist = domainEntity.artist;
    ormEntity.imageUrl = domainEntity.imageUrl;
    ormEntity.regulationMark = domainEntity.regulationMark || null;

    // Editor metadata
    ormEntity.createdBy = domainEntity.createdBy || null;
    ormEntity.createdAt = domainEntity.createdAt || null;
    ormEntity.isEditorCreated = domainEntity.isEditorCreated;

    return ormEntity;
  }
}
