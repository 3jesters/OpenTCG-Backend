import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IFileReader } from '../../domain/ports/file-reader.interface';
import { GetAvailableSetsUseCase } from './get-available-sets.use-case';
import { PreviewSetUseCase } from './preview-set.use-case';
import { PreviewCardUseCase } from './preview-card.use-case';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { Card } from '../../domain/entities/card.entity';

/**
 * Get Card By ID Use Case
 * Retrieves full card details by cardId
 */
@Injectable()
export class GetCardByIdUseCase {
  constructor(
    @Inject(IFileReader)
    private readonly fileReader: IFileReader,
    private readonly getAvailableSetsUseCase: GetAvailableSetsUseCase,
    private readonly previewSetUseCase: PreviewSetUseCase,
    private readonly previewCardUseCase: PreviewCardUseCase,
  ) {}

  async execute(cardId: string): Promise<CardDetailDto> {
    // Get all available sets
    const availableSets = await this.getAvailableSetsUseCase.execute();

    // Search through each set for the card
    for (const set of availableSets.sets) {
      try {
        // Get all cards in this set (as summaries)
        const setCards = await this.previewSetUseCase.execute(
          set.author,
          set.setName,
          set.version,
        );

        // Find the card with matching cardId
        const cardSummary = setCards.cards.find((c) => c.cardId === cardId);

        if (cardSummary) {
          // Found the card, now get full details using PreviewCardUseCase
          return await this.previewCardUseCase.execute(
            set.author,
            set.setName,
            set.version,
            cardSummary.cardNumber,
          );
        }
      } catch (error) {
        // Skip sets that can't be loaded
        console.error(
          `Failed to load set ${set.author}-${set.setName}-v${set.version}:`,
          error.message,
        );
        continue;
      }
    }

    throw new NotFoundException(`Card with ID ${cardId} not found`);
  }

  /**
   * Get Card domain entity by cardId (for internal use when domain entity is needed)
   */
  async getCardEntity(cardId: string): Promise<Card> {
    // Get all available sets
    const availableSets = await this.getAvailableSetsUseCase.execute();

    // Search through each set for the card
    for (const set of availableSets.sets) {
      try {
        // Get all cards in this set (as summaries)
        const setCards = await this.previewSetUseCase.execute(
          set.author,
          set.setName,
          set.version,
        );

        // Find the card with matching cardId
        const cardSummary = setCards.cards.find((c) => c.cardId === cardId);

        if (cardSummary) {
          // Use PreviewCardUseCase's new getCardEntity method
          return await this.previewCardUseCase.getCardEntity(
            set.author,
            set.setName,
            set.version,
            cardSummary.cardNumber,
          );
        }
      } catch (error) {
        // Skip sets that can't be loaded
        continue;
      }
    }

    throw new NotFoundException(`Card with ID ${cardId} not found`);
  }
}

