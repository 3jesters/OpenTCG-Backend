import { Injectable, Inject } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IFileReader } from '../../domain/ports/file-reader.interface';
import { ICardCache, SetMetadata } from '../../domain/repositories/card-cache.interface';
import { Card } from '../../domain/entities/card.entity';
import { CardFileDto } from '../dto/card-file.dto';
import { ImportCardDto } from '../dto/import-card.dto';
import { Weakness } from '../../domain/value-objects/weakness.value-object';
import { Resistance } from '../../domain/value-objects/resistance.value-object';
import { Attack } from '../../domain/value-objects/attack.value-object';
import { Ability } from '../../domain/value-objects/ability.value-object';
import { Evolution } from '../../domain/value-objects/evolution.value-object';
import { CardType, Rarity } from '../../domain/enums';
import { v4 as uuidv4 } from 'uuid';

export interface LoadCardsResult {
  success: boolean;
  loaded: number;
  author: string;
  setName: string;
  version: string;
  error?: string;
}

@Injectable()
export class LoadCardsFromFileUseCase {
  constructor(
    @Inject(IFileReader)
    private readonly fileReader: IFileReader,
    @Inject(ICardCache)
    private readonly cardCache: ICardCache,
  ) {}

  async execute(
    author: string,
    setName: string,
    version: string,
  ): Promise<LoadCardsResult> {
    try {
      // Check if set is already loaded
      if (this.cardCache.isSetLoaded(author, setName, version)) {
        throw new Error(`Set already loaded: ${author}-${setName}-v${version}`);
      }

      // Construct filename
      const filename = `${author}-${setName}-v${version}.json`;

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

      // Convert DTOs to domain entities
      const cards = await Promise.all(
        cardFileDto.cards.map((cardDto) =>
          this.convertDtoToEntity(cardDto, cardFileDto.metadata.author, setName, version),
        ),
      );

      // Prepare metadata
      const metadata: SetMetadata = {
        author: cardFileDto.metadata.author,
        setName: cardFileDto.metadata.setName,
        version: cardFileDto.metadata.version,
        totalCards: cards.length,
        loadedAt: new Date(),
        official: cardFileDto.metadata.official,
        dateReleased: cardFileDto.metadata.dateReleased,
        description: cardFileDto.metadata.description,
      };

      // Load cards into cache
      await this.cardCache.loadCards(cards, metadata);

      return {
        success: true,
        loaded: cards.length,
        author: cardFileDto.metadata.author,
        setName: cardFileDto.metadata.setName,
        version: cardFileDto.metadata.version,
      };
    } catch (error) {
      throw error;
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

    // Create base card entity
    const card = Card.createPokemonCard(
      instanceId,
      cardId,
      dto.pokemonNumber,
      dto.name,
      `${author}-${setName}`, // Use as set name for now
      dto.cardNumber,
      dto.rarity || Rarity.COMMON, // Default to common if not specified
      dto.description || '',
      dto.artist,
      dto.imageUrl || '',
    );

    // Set Pokemon-specific properties
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
      // For now, use a simple mapping - in production you'd look up the pokemon number
      const evolution = new Evolution(
        '000', // Placeholder pokemon number
        dto.stage,
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
    if (dto.ability) {
      // For now, pass empty array for effects
      // In production, you'd convert DTOs to domain value objects
      const ability = new Ability(
        dto.ability.name,
        dto.ability.text,
        dto.ability.activationType,
        [], // effects - to be implemented
        dto.ability.triggerEvent,
        dto.ability.usageLimit,
      );
      card.setAbility(ability);
    }

    // Set attacks
    if (dto.attacks && dto.attacks.length > 0) {
      for (const attackDto of dto.attacks) {
        // For now, pass empty arrays for preconditions and effects
        // In production, you'd convert DTOs to domain value objects
        const attack = new Attack(
          attackDto.name,
          attackDto.energyCost,
          attackDto.damage,
          attackDto.text,
          undefined, // preconditions - to be implemented
          undefined, // effects - to be implemented
        );
        card.addAttack(attack);
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

