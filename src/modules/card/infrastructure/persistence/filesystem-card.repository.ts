import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Card } from '../../domain/entities';
import { ICardRepository } from '../../domain/repositories';
import { v4 as uuidv4 } from 'uuid';

/**
 * File-based Card Repository
 * Stores cards grouped by set as JSON files in data/cards directory
 * Used for dev and test environments
 */
@Injectable()
export class FileSystemCardRepository implements ICardRepository {
  private readonly dataDirectory = join(process.cwd(), 'data', 'cards');

  /**
   * Ensure the data directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDirectory);
    } catch {
      await fs.mkdir(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Get file path for a set
   */
  private getSetFilePath(setName: string): string {
    return join(this.dataDirectory, `${setName}.json`);
  }

  /**
   * Load all cards from a set file
   */
  private async loadSetCards(setName: string): Promise<Card[]> {
    try {
      const filePath = this.getSetFilePath(setName);
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data);
      
      // Handle both old format (array) and new format (object with metadata)
      const cardsData = Array.isArray(json) ? json : json.cards || [];
      const metadata = Array.isArray(json) ? null : json.metadata || null;
      
      // Extract metadata for cardId generation
      const author = metadata?.author || 'pokemon';
      const version = metadata?.version || '1.0';
      const metadataSetName = metadata?.setName || setName;
      
      return cardsData.map((cardData: any) => 
        this.jsonToCard(cardData, author, metadataSetName, version)
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save all cards for a set
   */
  private async saveSetCards(setName: string, cards: Card[]): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getSetFilePath(setName);
    const json = cards.map((card) => this.cardToJson(card));
    await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
  }

  async findById(instanceId: string): Promise<Card | null> {
    const allCards = await this.findAll();
    return allCards.find((card) => card.instanceId === instanceId) || null;
  }

  async findByCardId(cardId: string): Promise<Card | null> {
    const allCards = await this.findAll();
    const normalizedSearchId = this.normalizeCardId(cardId);
    return allCards.find((card) => this.normalizeCardId(card.cardId) === normalizedSearchId) || null;
  }

  async findByCardIds(cardIds: string[]): Promise<Card[]> {
    if (cardIds.length === 0) {
      return [];
    }

    const allCards = await this.findAll();
    const normalizedSearchIds = new Set(cardIds.map(id => this.normalizeCardId(id)));
    return allCards.filter((card) => normalizedSearchIds.has(this.normalizeCardId(card.cardId)));
  }

  async findBySetNameAndCardNumber(
    setName: string,
    cardNumber: string,
  ): Promise<Card | null> {
    const cards = await this.loadSetCards(setName);
    return cards.find((card) => card.cardNumber === cardNumber) || null;
  }

  async findBySetName(setName: string): Promise<Card[]> {
    return await this.loadSetCards(setName);
  }

  async getDistinctSetNames(): Promise<string[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));
      return jsonFiles.map((file) => file.replace('.json', ''));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async findAll(): Promise<Card[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const allCards: Card[] = [];
      for (const file of jsonFiles) {
        const setName = file.replace('.json', '');
        const cards = await this.loadSetCards(setName);
        allCards.push(...cards);
      }

      return allCards;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async save(card: Card): Promise<Card> {
    const cards = await this.loadSetCards(card.setName);
    const existingIndex = cards.findIndex(
      (c) => c.instanceId === card.instanceId,
    );

    if (existingIndex >= 0) {
      cards[existingIndex] = card;
    } else {
      cards.push(card);
    }

    await this.saveSetCards(card.setName, cards);
    return card;
  }

  async saveMany(cards: Card[]): Promise<Card[]> {
    if (cards.length === 0) {
      return [];
    }

    // Group cards by set
    const cardsBySet = new Map<string, Card[]>();
    for (const card of cards) {
      if (!cardsBySet.has(card.setName)) {
        cardsBySet.set(card.setName, []);
      }
      cardsBySet.get(card.setName)!.push(card);
    }

    // Save each set
    for (const [setName, setCards] of cardsBySet.entries()) {
      const existingCards = await this.loadSetCards(setName);
      
      // Merge new cards with existing ones
      const mergedCards = [...existingCards];
      for (const newCard of setCards) {
        const existingIndex = mergedCards.findIndex(
          (c) => c.instanceId === newCard.instanceId,
        );
        if (existingIndex >= 0) {
          mergedCards[existingIndex] = newCard;
        } else {
          mergedCards.push(newCard);
        }
      }

      await this.saveSetCards(setName, mergedCards);
    }

    return cards;
  }

  async delete(instanceId: string): Promise<void> {
    const card = await this.findById(instanceId);
    if (!card) {
      return;
    }

    const cards = await this.loadSetCards(card.setName);
    const filteredCards = cards.filter((c) => c.instanceId !== instanceId);
    await this.saveSetCards(card.setName, filteredCards);
  }

  async exists(instanceId: string): Promise<boolean> {
    const card = await this.findById(instanceId);
    return card !== null;
  }

  /**
   * Convert JSON to Card domain entity (simplified)
   * Generates cardId if missing using the same logic as PreviewCardUseCase
   */
  private jsonToCard(
    json: any,
    author?: string,
    setName?: string,
    version?: string,
  ): Card {
    // Generate cardId if missing (cards in JSON files don't have cardId stored)
    let cardId = json.cardId;
    if (!cardId && author && setName && version && json.name && json.cardNumber) {
      cardId = this.generateCardId(author, setName, version, json.name, json.cardNumber);
    }

    // This is a simplified version that focuses on data storage
    // Full domain reconstruction happens in the mapper
    const card = new Card(
      json.instanceId || uuidv4(),
      cardId || '', // Fallback to empty string if cardId still can't be generated
      json.pokemonNumber || '000',
      json.name,
      json.setName || setName || '',
      json.cardNumber,
      json.rarity,
      json.cardType,
      json.description || '',
      json.artist || 'Unknown',
      json.imageUrl || '',
    );

    // Set additional fields as needed
    return card;
  }

  /**
   * Generate cardId using the same logic as PreviewCardUseCase
   * Format: {author}-{setName}-v{version}-{cardName}-{cardNumber}
   */
  private generateCardId(
    author: string,
    setName: string,
    version: string,
    cardName: string,
    cardNumber: string,
  ): string {
    const authorKebab = this.toKebabCase(author);
    const setNameKebab = this.toKebabCase(setName);
    const cardNameKebab = this.toKebabCase(cardName);

    // Build card ID and normalize to remove any double dashes
    const cardId = `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${cardNumber}`;
    // Remove any consecutive dashes that might have been created
    return cardId.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Convert string to kebab-case (same logic as PreviewCardUseCase)
   */
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
   * Normalize card ID by removing consecutive dashes and trimming
   * This handles cases where card IDs might have double dashes or formatting inconsistencies
   * (same logic as GetCardByIdUseCase.normalizeCardId)
   */
  private normalizeCardId(cardId: string): string {
    if (!cardId) return cardId;
    // Replace consecutive dashes with single dash, then trim leading/trailing dashes
    return cardId.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Convert Card domain entity to JSON
   */
  private cardToJson(card: Card): any {
    return {
      instanceId: card.instanceId,
      cardId: card.cardId,
      pokemonNumber: card.pokemonNumber,
      name: card.name,
      setName: card.setName,
      cardNumber: card.cardNumber,
      rarity: card.rarity,
      cardType: card.cardType,
      description: card.description,
      artist: card.artist,
      imageUrl: card.imageUrl,
      // Add more fields as needed
    };
  }
}

