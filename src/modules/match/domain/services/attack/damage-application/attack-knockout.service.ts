import { Injectable } from '@nestjs/common';
import { CardInstance, PlayerGameState } from '../../../value-objects';

export interface HandleKnockoutParams {
  pokemon: CardInstance | null;
  playerState: PlayerGameState;
}

export interface HandleKnockoutResult {
  updatedState: PlayerGameState;
  cardsToDiscard: string[];
}

/**
 * Attack Knockout Service
 * Handles knockout logic and moves cards to discard pile
 */
@Injectable()
export class AttackKnockoutService {
  /**
   * Handle knockout of active Pokemon
   */
  handleActiveKnockout(params: HandleKnockoutParams): HandleKnockoutResult {
    const { pokemon, playerState } = params;

    if (!pokemon) {
      return {
        updatedState: playerState,
        cardsToDiscard: [],
      };
    }

    const cardsToDiscard = pokemon.getAllCardsToDiscard();
    const discardPile = [...playerState.discardPile, ...cardsToDiscard];
    const updatedState = playerState
      .withActivePokemon(null)
      .withDiscardPile(discardPile);

    return {
      updatedState,
      cardsToDiscard,
    };
  }

  /**
   * Handle knockout of bench Pokemon
   */
  handleBenchKnockout(
    knockedOutBench: CardInstance[],
    playerState: PlayerGameState,
  ): PlayerGameState {
    if (knockedOutBench.length === 0) {
      return playerState;
    }

    const cardsToDiscard = knockedOutBench.flatMap((p) =>
      p.getAllCardsToDiscard(),
    );
    const discardPile = [...playerState.discardPile, ...cardsToDiscard];
    return playerState.withDiscardPile(discardPile);
  }
}
