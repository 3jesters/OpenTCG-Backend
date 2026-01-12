import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IFileReader } from '../../domain/ports/file-reader.interface';
import {
  IGetAvailableSetsUseCase,
  IPreviewSetUseCase,
  IPreviewCardUseCase,
} from '../ports/card-use-cases.interface';
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
    @Inject(IGetAvailableSetsUseCase)
    private readonly getAvailableSetsUseCase: IGetAvailableSetsUseCase,
    @Inject(IPreviewSetUseCase)
    private readonly previewSetUseCase: IPreviewSetUseCase,
    @Inject(IPreviewCardUseCase)
    private readonly previewCardUseCase: IPreviewCardUseCase,
  ) {}

  async execute(cardId: string): Promise<CardDetailDto> {
    // Normalize the search cardId to handle double dashes and formatting issues
    const normalizedSearchId = this.normalizeCardId(cardId);

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

        // Find the card with matching cardId (normalize both for comparison)
        const cardSummary = setCards.cards.find(
          (c) => this.normalizeCardId(c.cardId) === normalizedSearchId,
        );

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
    // Normalize the search cardId to handle double dashes and formatting issues
    const normalizedSearchId = this.normalizeCardId(cardId);

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

        // Find the card with matching cardId (normalize both for comparison)
        const cardSummary = setCards.cards.find(
          (c) => this.normalizeCardId(c.cardId) === normalizedSearchId,
        );

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

  /**
   * Get multiple cards by their cardIds (for batch loading)
   * Returns a Map keyed by cardId for O(1) lookup
   * Cards not found are omitted from the map
   * Note: File-based implementation does individual lookups (acceptable for dev/test)
   *
   * IMPORTANT: Uses the original search cardId as the map key (not the found card's cardId)
   * to handle cases where deck cardIds have different formatting (e.g., double dashes)
   */
  async getCardsByIds(cardIds: string[]): Promise<Map<string, Card>> {
    const cardsMap = new Map<string, Card>();

    // For file-based implementation, do individual lookups
    // This is acceptable for dev/test environments
    await Promise.all(
      cardIds.map(async (cardId) => {
        try {
          const card = await this.getCardEntity(cardId);
          // Use the original search cardId as the key, not the found card's cardId
          // This ensures the map key matches what the deck uses (e.g., with double dashes)
          cardsMap.set(cardId, card);
        } catch (error) {
          // Card not found, skip it
        }
      }),
    );

    return cardsMap;
  }

  /**
   * Normalize card ID by removing consecutive dashes and trimming
   * This handles cases where card IDs might have double dashes or formatting inconsistencies
   */
  private normalizeCardId(cardId: string): string {
    if (!cardId) return cardId;
    // Replace consecutive dashes with single dash, then trim leading/trailing dashes
    return cardId.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }
}
