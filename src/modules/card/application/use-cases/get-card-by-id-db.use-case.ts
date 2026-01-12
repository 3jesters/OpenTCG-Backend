import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICardRepository } from '../../domain/repositories';
import { Card } from '../../domain/entities';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Get Card By ID Use Case (Database Version)
 * Retrieves a card by its cardId from the database
 */
@Injectable()
export class GetCardByIdDbUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  async execute(cardId: string): Promise<CardDetailDto> {
    // Find the card by cardId
    const card = await this.cardRepository.findByCardId(cardId);

    if (!card) {
      throw new NotFoundException(`Card not found: ${cardId}`);
    }

    // Map to DTO
    return CardMapper.toCardDetailDto(card);
  }

  /**
   * Get the Card domain entity (for internal use)
   */
  async getCardEntity(cardId: string) {
    const card = await this.cardRepository.findByCardId(cardId);

    if (!card) {
      throw new NotFoundException(`Card not found: ${cardId}`);
    }

    return card;
  }

  /**
   * Get multiple cards by their cardIds (for batch loading)
   * Returns a Map keyed by cardId for O(1) lookup
   * Cards not found in database are omitted from the map
   *
   * IMPORTANT: Uses the original search cardId as the map key (not the found card's cardId)
   * to handle cases where deck cardIds have different formatting (e.g., double dashes)
   */
  async getCardsByIds(cardIds: string[]): Promise<Map<string, Card>> {
    if (cardIds.length === 0) {
      return new Map();
    }

    const cards = await this.cardRepository.findByCardIds(cardIds);
    const cardsMap = new Map<string, Card>();

    // Create a map from normalized cardId to original search cardIds
    // This handles cases where multiple search cardIds normalize to the same value
    const normalizedToOriginal = new Map<string, string[]>();
    for (const originalId of cardIds) {
      const normalized = this.normalizeCardId(originalId);
      if (!normalizedToOriginal.has(normalized)) {
        normalizedToOriginal.set(normalized, []);
      }
      normalizedToOriginal.get(normalized)!.push(originalId);
    }

    // Match found cards back to their original search cardIds
    for (const card of cards) {
      const normalizedCardId = this.normalizeCardId(card.cardId);
      const originalIds = normalizedToOriginal.get(normalizedCardId);
      if (originalIds) {
        // Use the first matching original cardId as the key
        // (in practice, there should only be one)
        cardsMap.set(originalIds[0], card);
      }
    }

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
