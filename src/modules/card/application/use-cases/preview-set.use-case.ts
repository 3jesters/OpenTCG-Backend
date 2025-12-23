import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IFileReader } from '../../domain/ports/file-reader.interface';
import { CardFileDto } from '../dto/card-file.dto';
import { Card } from '../../domain/entities/card.entity';
import { ImportCardDto } from '../dto/import-card.dto';
import { Weakness } from '../../domain/value-objects/weakness.value-object';
import { Resistance } from '../../domain/value-objects/resistance.value-object';
import { Attack } from '../../domain/value-objects/attack.value-object';
import { Ability } from '../../domain/value-objects/ability.value-object';
import { AbilityEffectFactory } from '../../domain/value-objects/ability-effect.value-object';
import { Evolution } from '../../domain/value-objects/evolution.value-object';
import { TrainerEffect } from '../../domain/value-objects/trainer-effect.value-object';
import { EnergyProvision } from '../../domain/value-objects/energy-provision.value-object';
import { CardType, Rarity } from '../../domain/enums';
import { GetCardsResponseDto } from '../../presentation/dto/get-cards-response.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';
import { v4 as uuidv4 } from 'uuid';
import { AttackEffectImportDto } from '../dto/attack-effect-import.dto';
import {
  AttackEffect,
  AttackEffectFactory,
} from '../../domain/value-objects/attack-effect.value-object';
import { AttackEffectType } from '../../domain/enums/attack-effect-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';
import { AbilityEffectNormalizer } from '../../infrastructure/persistence/mappers/ability-effect-normalizer.util';

/**
 * Preview Set Use Case
 * Reads and returns cards from a set file WITHOUT loading into cache
 * Useful for previewing set contents before loading
 */
@Injectable()
export class PreviewSetUseCase {
  constructor(
    @Inject(IFileReader)
    private readonly fileReader: IFileReader,
  ) {}

  async execute(
    author: string,
    setName: string,
    version: string,
  ): Promise<GetCardsResponseDto> {
    try {
      // Construct filename
      const filename = `${author}-${setName}-v${version}.json`;

      // Check if file exists
      const exists = await this.fileReader.fileExists(filename);
      if (!exists) {
        throw new NotFoundException(
          `Set file not found: ${author}-${setName}-v${version}`,
        );
      }

      // Read file
      const rawData = await this.fileReader.readCardFile(filename);

      // Validate and transform data
      const cardFileDto = plainToClass(CardFileDto, rawData);
      const errors = await validate(cardFileDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
      }

      // Convert DTOs to domain entities (without caching)
      const cards = await Promise.all(
        cardFileDto.cards.map((cardDto) =>
          this.convertDtoToEntity(cardDto, author, setName, version),
        ),
      );

      // Map to DTOs
      const cardSummaries = cards.map((card) =>
        CardMapper.toCardSummaryDto(card),
      );

      // Create set metadata response (no loadedAt since it's just a preview)
      const setMetadata = {
        author: cardFileDto.metadata.author,
        setName: cardFileDto.metadata.setName,
        setIdentifier: cardFileDto.metadata.setName,
        version: cardFileDto.metadata.version,
        totalCards: cards.length,
        official: cardFileDto.metadata.official,
        dateReleased: cardFileDto.metadata.dateReleased,
        description: cardFileDto.metadata.description,
        logoUrl: cardFileDto.metadata.logoUrl,
        loadedAt: undefined, // Not loaded yet, just previewing
      };

      return {
        set: setMetadata,
        cards: cardSummaries,
        count: cards.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to preview set: ${error.message}`);
    }
  }

  private async convertDtoToEntity(
    dto: ImportCardDto,
    author: string,
    setName: string,
    version: string,
  ): Promise<Card> {
    // Generate unique IDs
    const instanceId = uuidv4();
    const cardId = this.generateCardId(author, setName, version, dto);

    // Determine card type (default to POKEMON for backward compatibility)
    const cardType = dto.cardType || CardType.POKEMON;
    const pokemonNumber = dto.pokemonNumber || '000'; // Default for non-Pokemon cards

    // Create base card entity based on type
    let card: Card;
    if (cardType === CardType.TRAINER) {
      card = Card.createTrainerCard(
        instanceId,
        cardId,
        pokemonNumber,
        dto.name,
        `${author}-${setName}`,
        dto.cardNumber,
        dto.rarity || Rarity.COMMON,
        dto.description || '',
        dto.artist,
        dto.imageUrl || '',
      );
    } else if (cardType === CardType.ENERGY) {
      card = Card.createEnergyCard(
        instanceId,
        cardId,
        pokemonNumber,
        dto.name,
        `${author}-${setName}`,
        dto.cardNumber,
        dto.rarity || Rarity.COMMON,
        dto.description || '',
        dto.artist,
        dto.imageUrl || '',
      );
    } else {
      // POKEMON card
      card = Card.createPokemonCard(
        instanceId,
        cardId,
        pokemonNumber,
        dto.name,
        `${author}-${setName}`,
        dto.cardNumber,
        dto.rarity || Rarity.COMMON,
        dto.description || '',
        dto.artist,
        dto.imageUrl || '',
      );
    }

    // Set Pokemon-specific properties (only for Pokemon cards)
    if (cardType === CardType.POKEMON) {
      if (dto.pokemonType) {
        card.setPokemonType(dto.pokemonType);
      }
      if (dto.stage) {
        card.setStage(dto.stage);
      }
      if (dto.hp) {
        card.setHp(dto.hp);
      }
      if (dto.retreatCost !== undefined) {
        card.setRetreatCost(dto.retreatCost);
      }

      // Set evolution
      if (dto.evolvesFrom && dto.stage) {
        const evolution = new Evolution(
          '000',
          dto.stage,
          dto.evolvesFrom,
          undefined,
        );
        card.setEvolvesFrom(evolution);
      }

      // Set weakness
      if (dto.weakness) {
        const weakness = new Weakness(dto.weakness.type, dto.weakness.modifier);
        card.setWeakness(weakness);
      }

      // Set resistance
      if (dto.resistance) {
        const resistance = new Resistance(
          dto.resistance.type,
          dto.resistance.modifier,
        );
        card.setResistance(resistance);
      }

      // Set ability
      // NOTE: Abilities require at least one effect. If the card data doesn't have
      // structured effects yet, we create a placeholder effect for display purposes.
      // This allows abilities to be sent to the client even without structured effects.
      if (dto.ability) {
        let effects: any[];

        if (
          dto.ability.effects &&
          Array.isArray(dto.ability.effects) &&
          dto.ability.effects.length > 0 &&
          dto.ability.effects.some((e) => e && e.effectType)
        ) {
          // Convert AbilityEffectImportDto to AbilityEffect
          // The DTO already has the correct structure, just need to map conditions
          effects = dto.ability.effects.map((e) => {
            // Convert conditions from DTO to domain objects
            // ConditionImportDto has value as string, but Condition needs ConditionValue object
            const requiredConditions =
              e.conditions?.map((c) => {
                const condition: any = {
                  type: c.type,
                };

                // Only add value if it's properly structured (for now, skip string values)
                // TODO: Add proper conversion from string to ConditionValue when needed
                if (c.numericValue !== undefined) {
                  condition.value = { minimumAmount: c.numericValue };
                } else if (c.value && c.value !== '') {
                  // For now, skip string values that can't be converted
                  // This will be handled when card data is updated with proper structures
                }

                // Condition interface doesn't have operator, so we skip it
                // If needed in the future, it can be added to the Condition interface

                return condition;
              }) || [];

            // Build effect object with all properties
            const effect: any = {
              effectType: e.effectType,
              target:
                e.target || (e.targetType ? (e.targetType as any) : undefined),
              requiredConditions,
            };

            // Add effect-specific properties based on effect type
            switch (e.effectType) {
              case 'HEAL':
                if (e.amount !== undefined) effect.amount = e.amount;
                break;
              case 'PREVENT_DAMAGE':
                if (e.duration !== undefined) effect.duration = e.duration;
                if (e.amount !== undefined) effect.amount = e.amount;
                break;
              case 'STATUS_CONDITION':
                if (e.statusCondition !== undefined)
                  effect.statusCondition = e.statusCondition;
                break;
              case 'ENERGY_ACCELERATION':
                if (e.source !== undefined) effect.source = e.source;
                if (e.count !== undefined) effect.count = e.count;
                if (e.energyType !== undefined)
                  effect.energyType = e.energyType;
                if (e.targetPokemonType !== undefined)
                  effect.targetPokemonType = e.targetPokemonType;
                if (e.sourcePokemonType !== undefined)
                  effect.sourcePokemonType = e.sourcePokemonType;
                if (e.sourcePokemonTarget !== undefined)
                  effect.sourcePokemonTarget = e.sourcePokemonTarget;
                if (e.selector !== undefined) effect.selector = e.selector;
                break;
              case 'SWITCH_POKEMON':
                if (e.selector !== undefined) effect.selector = e.selector;
                if (e.with !== undefined) effect.with = e.with;
                break;
              case 'DRAW_CARDS':
                if (e.count !== undefined) effect.count = e.count;
                break;
              case 'SEARCH_DECK':
                if (e.count !== undefined) effect.count = e.count;
                if (e.destination !== undefined)
                  effect.destination = e.destination;
                if (e.cardType !== undefined) effect.cardType = e.cardType;
                if (e.pokemonType !== undefined)
                  effect.pokemonType = e.pokemonType;
                if (e.selector !== undefined) effect.selector = e.selector;
                break;
              case 'BOOST_ATTACK':
                if (e.modifier !== undefined) effect.modifier = e.modifier;
                if (e.affectedTypes !== undefined)
                  effect.affectedTypes = e.affectedTypes;
                break;
              case 'BOOST_HP':
                if (e.modifier !== undefined) effect.modifier = e.modifier;
                break;
              case 'REDUCE_DAMAGE':
                if (e.amount !== undefined) effect.amount = e.amount;
                break;
              case 'DISCARD_FROM_HAND':
                if (e.count !== undefined) effect.count = e.count;
                if (e.selector !== undefined) effect.selector = e.selector;
                if (e.cardType !== undefined) effect.cardType = e.cardType;
                break;
              case 'ATTACH_FROM_DISCARD':
                if (e.count !== undefined) effect.count = e.count;
                if (e.energyType !== undefined)
                  effect.energyType = e.energyType;
                if (e.selector !== undefined) effect.selector = e.selector;
                break;
              case 'RETRIEVE_FROM_DISCARD':
                if (e.count !== undefined) effect.count = e.count;
                if (e.selector !== undefined) effect.selector = e.selector;
                if (e.cardType !== undefined) effect.cardType = e.cardType;
                if (e.pokemonType !== undefined)
                  effect.pokemonType = e.pokemonType;
                break;
            }

            // Legacy support for old properties
            if (
              e.value !== undefined &&
              !effect.amount &&
              !effect.count &&
              !effect.modifier
            ) {
              effect.value = e.value;
            }
            if (e.damageModifier) {
              effect.damageModifier = e.damageModifier;
            }
            if (e.permanent !== undefined) {
              effect.permanent = e.permanent;
            }

            return effect;
          });
          
          // Normalize effects to fix invalid targets (e.g., DEFENDING in HEAL effects)
          effects = AbilityEffectNormalizer.normalize(effects);
        } else {
          // Create a placeholder effect for display purposes when no structured effects exist
          // This allows the ability to be sent to the client with name, text, etc.
          // The effect type DRAW_CARDS with count 1 is a placeholder that satisfies validation
          // Note: This effect is only used for display - it won't be executed in gameplay
          effects = [AbilityEffectFactory.drawCards(1)];
        }

        const ability = new Ability(
          dto.ability.name,
          dto.ability.text,
          dto.ability.activationType,
          effects as any,
          dto.ability.triggerEvent,
          dto.ability.usageLimit,
        );
        card.setAbility(ability);
      }

      // Set attacks
      if (dto.attacks && dto.attacks.length > 0) {
        for (const attackDto of dto.attacks) {
          // Convert attack effects from DTO to domain objects
          const effects = attackDto.effects
            ? attackDto.effects.map((effectDto) =>
                this.convertAttackEffect(effectDto),
              )
            : undefined;

          const attack = new Attack(
            attackDto.name,
            attackDto.energyCost,
            attackDto.damage,
            attackDto.text,
            undefined,
            effects,
            attackDto.energyBonusCap,
          );
          card.addAttack(attack);
        }
      }
    }

    // Set Trainer-specific properties (only for Trainer cards)
    if (cardType === CardType.TRAINER) {
      if (dto.trainerType) {
        card.setTrainerType(dto.trainerType);
      }

      // Set trainer effects
      if (dto.trainerEffects && dto.trainerEffects.length > 0) {
        for (const effectDto of dto.trainerEffects) {
          const effect = new TrainerEffect(
            effectDto.effectType,
            effectDto.target,
            effectDto.value,
            effectDto.cardType,
            effectDto.condition,
            effectDto.description,
            effectDto.source,
          );
          card.addTrainerEffect(effect);
        }
      }
    }

    // Set Energy-specific properties (only for Energy cards)
    if (cardType === CardType.ENERGY) {
      if (dto.energyType) {
        card.setEnergyType(dto.energyType);
      }

      // Set energy provision
      if (dto.energyProvision) {
        const provision = new EnergyProvision(
          dto.energyProvision.energyTypes,
          dto.energyProvision.amount,
          dto.energyProvision.isSpecial,
          dto.energyProvision.restrictions,
          dto.energyProvision.additionalEffects,
        );
        card.setEnergyProvision(provision);
      }
    }

    return card;
  }

  private generateCardId(
    author: string,
    setName: string,
    version: string,
    dto: ImportCardDto,
  ): string {
    const authorKebab = this.toKebabCase(author);
    const setNameKebab = this.toKebabCase(setName);
    const cardNameKebab = this.toKebabCase(dto.name);

    // Build card ID and normalize to remove any double dashes
    const cardId = `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${dto.cardNumber}`;
    // Remove any consecutive dashes that might have been created
    return cardId.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD') // Decompose characters (é becomes e + ́)
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
      .replace(/♂/g, '') // Remove male symbol
      .replace(/♀/g, '') // Remove female symbol
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Convert AttackEffectImportDto to AttackEffect domain object
   */
  private convertAttackEffect(effectDto: AttackEffectImportDto): AttackEffect {
    // For now, skip conditions conversion (can be added later if needed)
    const conditions = undefined;

    switch (effectDto.effectType) {
      case AttackEffectType.DISCARD_ENERGY:
        // Use target or targetType (legacy support)
        const target =
          effectDto.target ||
          (effectDto.targetType as TargetType.SELF | TargetType.DEFENDING);
        if (!target) {
          throw new Error('DISCARD_ENERGY effect requires target');
        }
        // Use amount or value (legacy support)
        const amount =
          effectDto.amount !== undefined
            ? effectDto.amount
            : (effectDto.value as number | 'all') || 1;
        return AttackEffectFactory.discardEnergy(
          target as TargetType.SELF | TargetType.DEFENDING,
          amount,
          effectDto.energyType,
          conditions,
        );

      case AttackEffectType.STATUS_CONDITION:
        if (!effectDto.statusCondition) {
          throw new Error('STATUS_CONDITION effect requires statusCondition');
        }
        return AttackEffectFactory.statusCondition(
          effectDto.statusCondition as
            | 'PARALYZED'
            | 'POISONED'
            | 'BURNED'
            | 'ASLEEP'
            | 'CONFUSED',
          conditions,
        );

      case AttackEffectType.DAMAGE_MODIFIER:
        const modifier =
          effectDto.modifier !== undefined
            ? effectDto.modifier
            : parseInt(effectDto.damageModifier || '0', 10);
        return AttackEffectFactory.damageModifier(modifier, conditions);

      case AttackEffectType.HEAL:
        const healAmount =
          effectDto.healAmount !== undefined
            ? effectDto.healAmount
            : (effectDto.value as number);
        if (healAmount === undefined) {
          throw new Error('HEAL effect requires healAmount or value');
        }
        const healTarget =
          effectDto.target ||
          (effectDto.targetType as TargetType.SELF | TargetType.DEFENDING);
        if (!healTarget) {
          throw new Error('HEAL effect requires target');
        }
        return AttackEffectFactory.heal(
          healTarget as TargetType.SELF | TargetType.DEFENDING,
          healAmount,
          conditions,
        );

      case AttackEffectType.PREVENT_DAMAGE:
        const preventTarget =
          effectDto.target ||
          (effectDto.targetType as TargetType.SELF | TargetType.DEFENDING);
        if (!preventTarget) {
          throw new Error('PREVENT_DAMAGE effect requires target');
        }
        const preventAmount =
          effectDto.amount !== undefined
            ? effectDto.amount
            : (effectDto.value as number | 'all');
        if (!effectDto.duration) {
          throw new Error('PREVENT_DAMAGE effect requires duration');
        }
        return AttackEffectFactory.preventDamage(
          preventTarget as TargetType.SELF | TargetType.DEFENDING,
          effectDto.duration as 'next_turn' | 'this_turn',
          preventAmount,
          conditions,
        );

      case AttackEffectType.RECOIL_DAMAGE:
        const recoilAmount = effectDto.value as number;
        if (recoilAmount === undefined) {
          throw new Error('RECOIL_DAMAGE effect requires value');
        }
        return AttackEffectFactory.recoilDamage(recoilAmount, conditions);

      default:
        throw new Error(
          `Unsupported attack effect type: ${effectDto.effectType}`,
        );
    }
  }
}
