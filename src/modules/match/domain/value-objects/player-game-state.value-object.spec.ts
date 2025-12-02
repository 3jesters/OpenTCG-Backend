import { PlayerGameState } from './player-game-state.value-object';
import { CardInstance } from './card-instance.value-object';
import { PokemonPosition, StatusEffect } from '../enums';

describe('PlayerGameState Value Object', () => {
  const createCardInstance = (
    instanceId: string,
    position: PokemonPosition,
  ): CardInstance => {
    return new CardInstance(
      instanceId,
      'card-001',
      position,
      50,
      60,
      [],
      StatusEffect.NONE,
      10,
    );
  };

  describe('constructor', () => {
    it('should create player game state with required fields', () => {
      const state = new PlayerGameState(
        ['card-1', 'card-2'],
        ['card-3'],
        null,
        [],
        ['prize-1', 'prize-2'],
        ['discard-1'],
        false,
      );

      expect(state.deck).toEqual(['card-1', 'card-2']);
      expect(state.hand).toEqual(['card-3']);
      expect(state.activePokemon).toBeNull();
      expect(state.bench).toEqual([]);
      expect(state.prizeCards).toEqual(['prize-1', 'prize-2']);
      expect(state.discardPile).toEqual(['discard-1']);
    });

    it('should throw error if bench has more than 5 Pokemon', () => {
      const bench = Array.from({ length: 6 }, (_, i) =>
        createCardInstance(`instance-${i}`, `BENCH_${i}` as PokemonPosition),
      );

      expect(() => {
        new PlayerGameState([], [], null, bench, [], [], false);
      }).toThrow('Bench cannot have more than 5 Pokemon');
    });

    it('should throw error if prize cards exceed 6', () => {
      const prizeCards = Array.from({ length: 7 }, (_, i) => `prize-${i}`);

      expect(() => {
        new PlayerGameState([], [], null, [], prizeCards, [], false);
      }).toThrow('Cannot have more than 6 prize cards');
    });
  });

  describe('getDeckCount', () => {
    it('should return correct deck count', () => {
      const state = new PlayerGameState(
        ['card-1', 'card-2', 'card-3'],
        [],
        null,
        [],
        [],
        [],
        false,
      );

      expect(state.getDeckCount()).toBe(3);
    });
  });

  describe('getHandCount', () => {
    it('should return correct hand count', () => {
      const state = new PlayerGameState(
        [],
        ['card-1', 'card-2'],
        null,
        [],
        [],
        [],
        false,
      );

      expect(state.getHandCount()).toBe(2);
    });
  });

  describe('getPrizeCardsRemaining', () => {
    it('should return correct prize cards count', () => {
      const state = new PlayerGameState(
        [],
        [],
        null,
        [],
        ['prize-1', 'prize-2', 'prize-3'],
        [],
        false,
      );

      expect(state.getPrizeCardsRemaining()).toBe(3);
    });
  });

  describe('getPokemonInPlayCount', () => {
    it('should return 0 when no Pokemon in play', () => {
      const state = new PlayerGameState([], [], null, [], [], [], false);

      expect(state.getPokemonInPlayCount()).toBe(0);
    });

    it('should return 1 when only active Pokemon', () => {
      const active = createCardInstance('instance-1', PokemonPosition.ACTIVE);
      const state = new PlayerGameState([], [], active, [], [], []);

      expect(state.getPokemonInPlayCount()).toBe(1);
    });

    it('should return correct count with active and bench', () => {
      const active = createCardInstance('instance-1', PokemonPosition.ACTIVE);
      const bench = [
        createCardInstance('instance-2', PokemonPosition.BENCH_0),
        createCardInstance('instance-3', PokemonPosition.BENCH_1),
      ];
      const state = new PlayerGameState([], [], active, bench, [], [], false);

      expect(state.getPokemonInPlayCount()).toBe(3);
    });
  });

  describe('hasPokemonInPlay', () => {
    it('should return false when no Pokemon', () => {
      const state = new PlayerGameState([], [], null, [], [], [], false);

      expect(state.hasPokemonInPlay()).toBe(false);
    });

    it('should return true when has active Pokemon', () => {
      const active = createCardInstance('instance-1', PokemonPosition.ACTIVE);
      const state = new PlayerGameState([], [], active, [], [], []);

      expect(state.hasPokemonInPlay()).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should create new instance when updating deck', () => {
      const state = new PlayerGameState(['card-1'], [], null, [], [], [], false);
      const updated = state.withDeck(['card-2']);

      expect(updated.deck).toEqual(['card-2']);
      expect(state.deck).toEqual(['card-1']); // Original unchanged
    });

    it('should create new instance when updating hand', () => {
      const state = new PlayerGameState([], ['card-1'], null, [], [], [], false);
      const updated = state.withHand(['card-2']);

      expect(updated.hand).toEqual(['card-2']);
      expect(state.hand).toEqual(['card-1']); // Original unchanged
    });
  });
});

