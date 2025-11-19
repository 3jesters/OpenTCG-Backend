import { Injectable } from '@nestjs/common';
import { Card } from '../../domain/entities/card.entity';
import {
  ICardCache,
  SetMetadata,
} from '../../domain/repositories/card-cache.interface';

/**
 * In-Memory Card Cache Service
 * Stores cards in memory with set tracking
 */
@Injectable()
export class InMemoryCardCacheService implements ICardCache {
  private readonly cards: Map<string, Card> = new Map();
  private readonly loadedSets: Map<string, SetMetadata> = new Map();

  async loadCards(cards: Card[], metadata: SetMetadata): Promise<void> {
    const setKey = this.generateSetKey(metadata.author, metadata.setName, metadata.version);

    // Check if set is already loaded
    if (this.loadedSets.has(setKey)) {
      throw new Error(`Set already loaded: ${setKey}`);
    }

    // Load all cards
    for (const card of cards) {
      this.cards.set(card.cardId, card);
    }

    // Track set metadata
    this.loadedSets.set(setKey, metadata);
  }

  isSetLoaded(author: string, setName: string, version: string): boolean {
    const setKey = this.generateSetKey(author, setName, version);
    return this.loadedSets.has(setKey);
  }

  getCard(cardId: string): Card | null {
    return this.cards.get(cardId) || null;
  }

  getAllCards(): Card[] {
    return Array.from(this.cards.values());
  }

  getCardsBySet(author: string, setName: string, version: string): Card[] {
    const setKey = this.generateSetKey(author, setName, version);
    
    // Get all cards that belong to this set
    return this.getAllCards().filter((card) => {
      // Cards have cardId format: {author}-{setName}-v{version}-...
      const cardSetPrefix = `${this.toKebabCase(author)}-${this.toKebabCase(setName)}-v${version}`;
      return card.cardId.startsWith(cardSetPrefix);
    });
  }

  getSetMetadata(author: string, setName: string, version: string): SetMetadata | null {
    const setKey = this.generateSetKey(author, setName, version);
    return this.loadedSets.get(setKey) || null;
  }

  getAllSetsMetadata(): SetMetadata[] {
    return Array.from(this.loadedSets.values());
  }

  clear(): void {
    this.cards.clear();
    this.loadedSets.clear();
  }

  clearSet(author: string, setName: string, version: string): void {
    const setKey = this.generateSetKey(author, setName, version);

    // Remove all cards from this set
    const cardsToRemove = this.getCardsBySet(author, setName, version);
    for (const card of cardsToRemove) {
      this.cards.delete(card.cardId);
    }

    // Remove set metadata
    this.loadedSets.delete(setKey);
  }

  private generateSetKey(author: string, setName: string, version: string): string {
    return `${author}-${setName}-v${version}`;
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

