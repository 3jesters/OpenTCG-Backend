import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ICardRepository } from '../../domain/repositories/card.repository.interface';
import { ISetRepository } from '../../../set/domain/repositories/set.repository.interface';
import { IGetCardByIdUseCase } from '../ports/card-use-cases.interface';
import { Card } from '../../domain/entities/card.entity';
import { CardType } from '../../domain/enums';
import { Set } from '../../../set/domain/entities/set.entity';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Use Case: Duplicate a card from any set into a user's private set
 */
@Injectable()
export class DuplicateCardUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  async execute(
    sourceCardId: string,
    userId: string,
    targetSetId?: string,
    targetSetName?: string,
  ): Promise<CardDetailDto> {
    // 1. Load source card from any set (global or private)
    const sourceCard =
      await this.getCardByIdUseCase.getCardEntity(sourceCardId);

    // 2. Get or create target set
    let targetSet: Set;
    if (targetSetId) {
      const foundSet = await this.setRepository.findById(targetSetId);
      if (!foundSet) {
        throw new NotFoundException(
          `Target set with ID ${targetSetId} not found`,
        );
      }
      targetSet = foundSet;
      // Verify user owns the target set
      if (!targetSet.isOwnedBy(userId)) {
        throw new ForbiddenException(
          `You do not have permission to add cards to set ${targetSetId}`,
        );
      }
    } else {
      // Auto-create a private set for the user
      const defaultSetName = targetSetName || 'My Custom Set';
      const defaultSetId = this.generateSetId(userId, defaultSetName);

      // Check if set already exists
      const existingSet = await this.setRepository.findById(defaultSetId);
      if (existingSet) {
        targetSet = existingSet;
      } else {
        // Create new set
        targetSet = new Set(
          defaultSetId,
          defaultSetName,
          'custom', // series
          new Date().toISOString().split('T')[0], // releaseDate
          0, // totalCards (will be updated when card is saved)
          userId, // ownerId
        );
        targetSet.setOfficial(false);
        await this.setRepository.save(targetSet);
      }
    }

    // 3. Create new card instance with new instanceId and updated cardId/setName
    const newInstanceId = uuidv4();
    const newCardId = this.generateCardIdForSet(
      userId,
      targetSet.name,
      sourceCard.name,
      sourceCard.cardNumber,
    );

    // Create new card using the same factory method as source card
    // We need to determine card type and use appropriate factory
    // Use default pokemonNumber if undefined
    const pokemonNumber = sourceCard.pokemonNumber || '000';

    let newCard: Card;
    if (sourceCard.cardType === CardType.TRAINER) {
      newCard = Card.createTrainerCard(
        newInstanceId,
        newCardId,
        pokemonNumber,
        sourceCard.name,
        targetSet.name, // new setName
        sourceCard.cardNumber,
        sourceCard.rarity,
        sourceCard.description,
        sourceCard.artist,
        sourceCard.imageUrl,
      );
    } else if (sourceCard.cardType === CardType.ENERGY) {
      newCard = Card.createEnergyCard(
        newInstanceId,
        newCardId,
        pokemonNumber,
        sourceCard.name,
        targetSet.name, // new setName
        sourceCard.cardNumber,
        sourceCard.rarity,
        sourceCard.description,
        sourceCard.artist,
        sourceCard.imageUrl,
      );
    } else {
      // POKEMON card
      newCard = Card.createPokemonCard(
        newInstanceId,
        newCardId,
        pokemonNumber,
        sourceCard.name,
        targetSet.name, // new setName
        sourceCard.cardNumber,
        sourceCard.rarity,
        sourceCard.description,
        sourceCard.artist,
        sourceCard.imageUrl,
      );
    }

    // Copy all properties from source card
    this.copyCardProperties(sourceCard, newCard);

    // 4. Save card to target set
    const savedCard = await this.cardRepository.save(newCard);

    // 5. Update set totalCards count
    targetSet.updateTotalCards(
      (await this.cardRepository.findBySetName(targetSet.name)).length,
    );
    await this.setRepository.save(targetSet);

    // 6. Return new card DTO
    return CardMapper.toCardDetailDto(savedCard);
  }

  /**
   * Copy all properties from source card to target card
   */
  private copyCardProperties(sourceCard: Card, targetCard: Card): void {
    // Copy Pokemon-specific properties
    if (sourceCard.pokemonType) {
      targetCard.setPokemonType(sourceCard.pokemonType);
    }
    if (sourceCard.stage) {
      targetCard.setStage(sourceCard.stage);
    }
    if (sourceCard.hp !== undefined) {
      targetCard.setHp(sourceCard.hp);
    }
    if (sourceCard.retreatCost !== undefined) {
      targetCard.setRetreatCost(sourceCard.retreatCost);
    }
    if (sourceCard.weakness) {
      targetCard.setWeakness(sourceCard.weakness);
    }
    if (sourceCard.resistance) {
      targetCard.setResistance(sourceCard.resistance);
    }
    sourceCard.subtypes.forEach((subtype) => targetCard.addSubtype(subtype));

    // Copy attacks
    sourceCard.attacks.forEach((attack) => targetCard.addAttack(attack));

    // Copy ability
    if (sourceCard.ability) {
      targetCard.setAbility(sourceCard.ability);
    }

    // Copy evolution chain
    if (sourceCard.evolvesFrom) {
      targetCard.setEvolvesFrom(sourceCard.evolvesFrom);
    }
    sourceCard.evolvesTo.forEach((evolution) =>
      targetCard.addEvolvesTo(evolution),
    );

    // Copy Trainer-specific properties
    if (sourceCard.trainerType) {
      targetCard.setTrainerType(sourceCard.trainerType);
    }
    sourceCard.trainerEffects.forEach((effect) =>
      targetCard.addTrainerEffect(effect),
    );

    // Copy Energy-specific properties
    if (sourceCard.energyType) {
      targetCard.setEnergyType(sourceCard.energyType);
    }
    if (sourceCard.energyProvision) {
      targetCard.setEnergyProvision(sourceCard.energyProvision);
    }

    // Copy rules
    if (sourceCard.rulesText) {
      targetCard.setRulesText(sourceCard.rulesText);
    }
    if (sourceCard.cardRules && sourceCard.cardRules.length > 0) {
      targetCard.setCardRules(sourceCard.cardRules);
    }
  }

  /**
   * Generate a cardId for a card in a user's private set
   * Format: {userId}-{setName}-v1.0-{cardName}-{cardNumber}
   */
  private generateCardIdForSet(
    userId: string,
    setName: string,
    cardName: string,
    cardNumber: string,
  ): string {
    const toKebabCase = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const userIdKebab = toKebabCase(userId);
    const setNameKebab = toKebabCase(setName);
    const cardNameKebab = toKebabCase(cardName);

    const cardId = `${userIdKebab}-${setNameKebab}-v1.0-${cardNameKebab}-${cardNumber}`;
    return cardId.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Generate a set ID for a user's private set
   */
  private generateSetId(userId: string, setName: string): string {
    const toKebabCase = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    return `${toKebabCase(userId)}-${toKebabCase(setName)}`;
  }
}
