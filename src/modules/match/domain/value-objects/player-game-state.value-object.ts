import { CardInstance } from './card-instance.value-object';
import { StatusEffect } from '../enums';

/**
 * Player Game State Value Object
 * Represents the complete game state for a single player
 * Immutable value object
 */
export class PlayerGameState {
  constructor(
    public readonly deck: string[], // Array of card IDs remaining in deck
    public readonly hand: string[], // Array of card IDs in hand
    public readonly activePokemon: CardInstance | null, // Active Pokemon or null
    public readonly bench: CardInstance[], // Benched Pokemon (max 5)
    public readonly prizeCards: string[], // Array of prize card IDs (6 initially)
    public readonly discardPile: string[], // Array of discarded card IDs
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.bench.length > 5) {
      throw new Error('Bench cannot have more than 5 Pokemon');
    }
    if (this.prizeCards.length > 6) {
      throw new Error('Cannot have more than 6 prize cards');
    }
    if (this.activePokemon && this.activePokemon.position !== 'ACTIVE') {
      throw new Error('Active Pokemon must have ACTIVE position');
    }
    // Validate bench positions
    for (let i = 0; i < this.bench.length; i++) {
      const expectedPosition = `BENCH_${i}` as const;
      if (this.bench[i].position !== expectedPosition) {
        throw new Error(
          `Bench Pokemon at index ${i} must have position ${expectedPosition}`,
        );
      }
    }
  }

  /**
   * Get total number of cards in deck
   */
  getDeckCount(): number {
    return this.deck.length;
  }

  /**
   * Get total number of cards in hand
   */
  getHandCount(): number {
    return this.hand.length;
  }

  /**
   * Get number of prize cards remaining
   */
  getPrizeCardsRemaining(): number {
    return this.prizeCards.length;
  }

  /**
   * Get number of Pokemon in play (active + bench)
   */
  getPokemonInPlayCount(): number {
    const activeCount = this.activePokemon ? 1 : 0;
    return activeCount + this.bench.length;
  }

  /**
   * Check if player has any Pokemon in play
   */
  hasPokemonInPlay(): boolean {
    return this.getPokemonInPlayCount() > 0;
  }

  /**
   * Create a new PlayerGameState with updated deck
   */
  withDeck(deck: string[]): PlayerGameState {
    return new PlayerGameState(
      deck,
      this.hand,
      this.activePokemon,
      this.bench,
      this.prizeCards,
      this.discardPile,
    );
  }

  /**
   * Create a new PlayerGameState with updated hand
   */
  withHand(hand: string[]): PlayerGameState {
    return new PlayerGameState(
      this.deck,
      hand,
      this.activePokemon,
      this.bench,
      this.prizeCards,
      this.discardPile,
    );
  }

  /**
   * Create a new PlayerGameState with updated active Pokemon
   */
  withActivePokemon(activePokemon: CardInstance | null): PlayerGameState {
    return new PlayerGameState(
      this.deck,
      this.hand,
      activePokemon,
      this.bench,
      this.prizeCards,
      this.discardPile,
    );
  }

  /**
   * Create a new PlayerGameState with updated bench
   */
  withBench(bench: CardInstance[]): PlayerGameState {
    return new PlayerGameState(
      this.deck,
      this.hand,
      this.activePokemon,
      bench,
      this.prizeCards,
      this.discardPile,
    );
  }

  /**
   * Create a new PlayerGameState with updated prize cards
   */
  withPrizeCards(prizeCards: string[]): PlayerGameState {
    return new PlayerGameState(
      this.deck,
      this.hand,
      this.activePokemon,
      this.bench,
      prizeCards,
      this.discardPile,
    );
  }

  /**
   * Create a new PlayerGameState with updated discard pile
   */
  withDiscardPile(discardPile: string[]): PlayerGameState {
    return new PlayerGameState(
      this.deck,
      this.hand,
      this.activePokemon,
      this.bench,
      this.prizeCards,
      discardPile,
    );
  }
}

