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
import { Evolution } from '../../domain/value-objects/evolution.value-object';
import { TrainerEffect } from '../../domain/value-objects/trainer-effect.value-object';
import { EnergyProvision } from '../../domain/value-objects/energy-provision.value-object';
import { CardType, Rarity } from '../../domain/enums';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';
import { v4 as uuidv4 } from 'uuid';

/**
 * Preview Card Use Case
 * Reads and returns a specific card from a set file WITHOUT loading into cache
 * Useful for previewing card details before loading the set
 */
@Injectable()
export class PreviewCardUseCase {
  constructor(
    @Inject(IFileReader)
    private readonly fileReader: IFileReader,
  ) {}

  async execute(
    author: string,
    setName: string,
    version: string,
    cardNumber: string,
  ): Promise<CardDetailDto> {
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

      // Find the specific card by card number
      const cardDto = cardFileDto.cards.find(
        (c) => c.cardNumber === cardNumber,
      );

      if (!cardDto) {
        throw new NotFoundException(
          `Card #${cardNumber} not found in set ${author}-${setName}-v${version}`,
        );
      }

      // Convert DTO to domain entity
      const card = await this.convertDtoToEntity(
        cardDto,
        author,
        setName,
        version,
      );

      // Map to detailed DTO
      return CardMapper.toCardDetailDto(card);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to preview card: ${error.message}`);
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
    const pokemonNumber = dto.pokemonNumber || '000';

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

    // Set Pokemon-specific properties
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

      if (dto.evolvesFrom && dto.stage) {
        const evolution = new Evolution(
          '000',
          dto.stage,
          dto.evolvesFrom,
          undefined,
        );
        card.setEvolvesFrom(evolution);
      }

      if (dto.weakness) {
        const weakness = new Weakness(dto.weakness.type, dto.weakness.modifier);
        card.setWeakness(weakness);
      }

      if (dto.resistance) {
        const resistance = new Resistance(
          dto.resistance.type,
          dto.resistance.modifier,
        );
        card.setResistance(resistance);
      }

      if (dto.ability) {
        const ability = new Ability(
          dto.ability.name,
          dto.ability.text,
          dto.ability.activationType,
          [],
          dto.ability.triggerEvent,
          dto.ability.usageLimit,
        );
        card.setAbility(ability);
      }

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

    // Set Trainer-specific properties
    if (cardType === CardType.TRAINER) {
      if (dto.trainerType) {
        card.setTrainerType(dto.trainerType);
      }

      if (dto.trainerEffects && dto.trainerEffects.length > 0) {
        for (const effectDto of dto.trainerEffects) {
          const effect = new TrainerEffect(
            effectDto.effectType,
            effectDto.target,
            effectDto.value,
            effectDto.cardType,
            effectDto.condition,
            effectDto.description,
          );
          card.addTrainerEffect(effect);
        }
      }
    }

    // Set Energy-specific properties
    if (cardType === CardType.ENERGY) {
      if (dto.energyType) {
        card.setEnergyType(dto.energyType);
      }

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
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

