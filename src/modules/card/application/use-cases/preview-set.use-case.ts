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
      if (dto.level !== undefined) {
        card.setLevel(dto.level);
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
        const resistance = new Resistance(dto.resistance.type, dto.resistance.modifier);
        card.setResistance(resistance);
      }

      // Set ability
      // NOTE: Abilities require at least one effect. If the card data doesn't have
      // structured effects yet, we create a placeholder effect for display purposes.
      // This allows abilities to be sent to the client even without structured effects.
      if (dto.ability) {
        let effects: any[];
        
        if (dto.ability.effects && dto.ability.effects.length > 0) {
          // Convert AbilityEffectImportDto to AbilityEffect
          // The DTO already has the correct structure, just need to map conditions
          effects = dto.ability.effects.map(e => {
            // Convert conditions from DTO to domain objects
            // ConditionImportDto has value as string, but Condition needs ConditionValue object
            const requiredConditions = e.conditions?.map(c => {
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
            
            return {
              effectType: e.effectType,
              target: e.targetType ? (e.targetType as any) : undefined,
              requiredConditions,
              // Include effect-specific properties
              ...(e.value !== undefined && { value: e.value }),
              ...(e.damageModifier && { damageModifier: e.damageModifier }),
              ...(e.permanent !== undefined && { permanent: e.permanent }),
            } as any; // Type assertion needed due to complex union types
          });
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
          const attack = new Attack(
            attackDto.name,
            attackDto.energyCost,
            attackDto.damage,
            attackDto.text,
            undefined,
            undefined,
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
    const level = dto.level !== undefined ? dto.level.toString() : '';

    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${level}-${dto.cardNumber}`;
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
}

