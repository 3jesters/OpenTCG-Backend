import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TrainerEffectExecutorService } from './trainer-effect-executor.service';
import { TrainerEffectDto } from '../../../card/presentation/dto/trainer-effect.dto';
import { TrainerEffectType } from '../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { GameState } from '../value-objects/game-state.value-object';
import { PlayerGameState } from '../value-objects/player-game-state.value-object';
import { CardInstance } from '../value-objects/card-instance.value-object';
import { PlayerIdentifier } from '../enums/player-identifier.enum';
import { TurnPhase } from '../enums/turn-phase.enum';
import { StatusEffect } from '../enums/status-effect.enum';
import {
  TrainerActionData,
  HealActionData,
  RemoveEnergyActionData,
  RetrieveEnergyActionData,
  DiscardHandActionData,
  PutIntoPlayActionData,
} from '../types/trainer-action-data.types';

describe('TrainerEffectExecutorService', () => {
  let service: TrainerEffectExecutorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainerEffectExecutorService],
    }).compile();

    service = module.get<TrainerEffectExecutorService>(
      TrainerEffectExecutorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HEAL effect', () => {
    const createTestGameState = (
      player1Hp: number,
      player1Damage: number,
    ): GameState => {
      const player1Active = new CardInstance(
        'player1-active-id',
        'pokemon-base-set-v1.0-pikachu--60',
        'ACTIVE',
        player1Hp,
        60,
        [],
        [],
        player1Damage,
      );

      const player1State = new PlayerGameState(
        [],
        [],
        player1Active,
        [],
        [],
        [],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      return new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );
    };

    it('should heal active Pokémon', async () => {
      const gameState = createTestGameState(40, 20); // 40 HP, 20 damage
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'ACTIVE',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.playerState.activePokemon?.getDamageCounters()).toBe(0);
      expect(result.playerState.activePokemon?.currentHp).toBe(60);
    });

    it('should heal bench Pokémon', async () => {
      const player1Active = new CardInstance(
        'player1-active-id',
        'pokemon-base-set-v1.0-pikachu--60',
        'ACTIVE',
        60,
        60,
        [],
        [],
        0,
      );

      const benchPokemon = new CardInstance(
        'bench-id',
        'pokemon-base-set-v1.0-charmander--39',
        'BENCH_0',
        40,
        50,
        [],
        [],
        10,
      );

      const player1State = new PlayerGameState(
        [],
        [],
        player1Active,
        [benchPokemon],
        [],
        [],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'BENCH_0',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.playerState.bench[0].getDamageCounters()).toBe(0);
      expect(result.playerState.bench[0].currentHp).toBe(50);
    });

    it('should not heal below 0 damage', async () => {
      const gameState = createTestGameState(60, 0); // Full HP, no damage
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'ACTIVE',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.playerState.activePokemon?.getDamageCounters()).toBe(0);
      expect(result.playerState.activePokemon?.currentHp).toBe(60);
    });

    it('should heal correctly when damageCounters is out of sync with currentHp', async () => {
      // Create Pokemon with damageCounters out of sync (common bug scenario)
      // currentHp: 10, maxHp: 40, damageCounters: 0 (should be 30)
      const damagedPokemon = new CardInstance(
        'damaged-pokemon-id',
        'pokemon-base-set-v1.0-nidoran--57',
        'ACTIVE',
        10, // 10 HP remaining
        40, // 40 max HP
        [],
        [],
        0, // damageCounters is 0 but should be 30 (out of sync!)
      );

      const player1State = new PlayerGameState(
        [],
        [],
        damagedPokemon,
        [],
        [],
        [],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20, // Potion heals 20 HP
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'ACTIVE',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Should heal 20 HP: 10 HP -> 30 HP (not 40 HP!)
      expect(result.playerState.activePokemon?.currentHp).toBe(30);
      // damageCounters should be calculated: 40 - 30 = 10
      expect(result.playerState.activePokemon?.getDamageCounters()).toBe(10);
      // Verify they are in sync
      expect(
        result.playerState.activePokemon!.maxHp -
          result.playerState.activePokemon!.currentHp,
      ).toBe(result.playerState.activePokemon!.getDamageCounters());
    });

    it('should calculate healing from HP, not damageCounters', async () => {
      // Pokemon with 20 HP damage but damageCounters says 0
      const pokemon = new CardInstance(
        'pokemon-id',
        'pokemon-base-set-v1.0-pikachu--60',
        'ACTIVE',
        40, // 40 HP remaining
        60, // 60 max HP (20 damage)
        [],
        [],
        0, // damageCounters is 0 but should be 20
      );

      const player1State = new PlayerGameState([], [], pokemon, [], [], []);

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'ACTIVE',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Should heal 20 HP: 40 HP -> 60 HP (full HP)
      expect(result.playerState.activePokemon?.currentHp).toBe(60);
      // damageCounters should be updated to 0 (no damage)
      expect(result.playerState.activePokemon?.getDamageCounters()).toBe(0);
    });

    it('should keep damageCounters and HP in sync after healing', async () => {
      const gameState = createTestGameState(30, 30); // 30 HP, 30 damage
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'ACTIVE',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      const pokemon = result.playerState.activePokemon!;
      // Verify damageCounters and HP are in sync
      const calculatedDamage = pokemon.maxHp - pokemon.currentHp;
      expect(pokemon.getDamageCounters()).toBe(calculatedDamage);
      // Should have 10 damage remaining (30 - 20 = 10)
      expect(pokemon.getDamageCounters()).toBe(10);
      expect(pokemon.currentHp).toBe(50); // 60 - 10 = 50
    });

    it('should heal partial damage correctly', async () => {
      // Pokemon with 50 HP damage, heal 20 HP
      const gameState = createTestGameState(10, 50); // 10 HP, 50 damage
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData: HealActionData = {
        cardId: 'potion',
        target: 'ACTIVE',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Should heal 20 HP: 10 HP -> 30 HP
      expect(result.playerState.activePokemon?.currentHp).toBe(30);
      // Should have 30 damage remaining (50 - 20 = 30)
      expect(result.playerState.activePokemon?.getDamageCounters()).toBe(30);
    });

    it('should throw error if target is missing', async () => {
      const gameState = createTestGameState(40, 20);
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.HEAL,
        target: TargetType.ALL_YOURS,
        value: 20,
      };
      const actionData = {
        cardId: 'potion',
      } as HealActionData;

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('REMOVE_ENERGY effect', () => {
    const createTestGameState = (): GameState => {
      const opponentActive = new CardInstance(
        'opponent-active-id',
        'pokemon-base-set-v1.0-charmander--39',
        'ACTIVE',
        50,
        50,
        ['fire-energy-1', 'fire-energy-2'],
        [],
        0,
      );

      const player1State = new PlayerGameState([], [], null, [], [], [], []);

      const player2State = new PlayerGameState(
        [],
        [],
        opponentActive,
        [],
        [],
        [],
      );

      return new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );
    };

    it('should remove energy from opponent active Pokémon', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.REMOVE_ENERGY,
        target: TargetType.ALL_OPPONENTS,
        value: 1,
      };
      const actionData: RemoveEnergyActionData = {
        cardId: 'energy-removal',
        target: 'ACTIVE',
        energyCardId: 'fire-energy-1',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.opponentState.activePokemon?.attachedEnergy).toEqual([
        'fire-energy-2',
      ]);
    });

    it('should throw error if energy not attached', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.REMOVE_ENERGY,
        target: TargetType.ALL_OPPONENTS,
        value: 1,
      };
      const actionData: RemoveEnergyActionData = {
        cardId: 'energy-removal',
        target: 'ACTIVE',
        energyCardId: 'water-energy-1',
      };

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RETRIEVE_ENERGY effect', () => {
    const createTestGameState = (): GameState => {
      const player1State = new PlayerGameState(
        [],
        ['other-card'],
        null,
        [],
        [],
        ['fire-energy-1', 'fire-energy-2'],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      return new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );
    };

    it('should retrieve energy cards from discard pile', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.RETRIEVE_ENERGY,
        target: TargetType.SELF,
        value: 2,
      };
      const actionData: RetrieveEnergyActionData = {
        cardId: 'energy-retrieval',
        selectedCardIds: ['fire-energy-1', 'fire-energy-2'],
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.playerState.hand).toContain('fire-energy-1');
      expect(result.playerState.hand).toContain('fire-energy-2');
      expect(result.playerState.discardPile).not.toContain('fire-energy-1');
      expect(result.playerState.discardPile).not.toContain('fire-energy-2');
    });

    it('should allow retrieving 0 cards', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.RETRIEVE_ENERGY,
        target: TargetType.SELF,
        value: 2,
      };
      const actionData: RetrieveEnergyActionData = {
        cardId: 'energy-retrieval',
        selectedCardIds: [],
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.playerState.hand).toEqual(['other-card']);
      expect(result.playerState.discardPile).toEqual([
        'fire-energy-1',
        'fire-energy-2',
      ]);
    });

    it('should throw error if retrieving more than max', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.RETRIEVE_ENERGY,
        target: TargetType.SELF,
        value: 2,
      };
      const actionData: RetrieveEnergyActionData = {
        cardId: 'energy-retrieval',
        selectedCardIds: ['fire-energy-1', 'fire-energy-2', 'fire-energy-3'],
      };

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DISCARD_HAND effect', () => {
    const createTestGameState = (): GameState => {
      const player1State = new PlayerGameState(
        [],
        ['card-1', 'card-2', 'card-3'],
        null,
        [],
        [],
        [],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      return new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );
    };

    it('should discard card from hand', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.DISCARD_HAND,
        target: TargetType.SELF,
        value: 1,
      };
      const actionData: DiscardHandActionData = {
        cardId: 'trainer-card',
        handCardId: 'card-2',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      expect(result.playerState.hand).not.toContain('card-2');
      expect(result.playerState.hand).toContain('card-1');
      expect(result.playerState.hand).toContain('card-3');
      expect(result.playerState.discardPile).toContain('card-2');
    });

    it('should throw error if trying to discard played trainer card', async () => {
      const gameState = createTestGameState();
      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.DISCARD_HAND,
        target: TargetType.SELF,
        value: 1,
      };
      const actionData: DiscardHandActionData = {
        cardId: 'trainer-card',
        handCardId: 'trainer-card',
        handCardIndex: 0,
      };

      // Need to add trainer-card to hand for this test
      const player1State = new PlayerGameState(
        [],
        ['trainer-card', 'card-2'],
        null,
        [],
        [],
        [],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      const testGameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          testGameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Multiple effects', () => {
    it('should execute DISCARD_HAND before RETRIEVE_ENERGY', async () => {
      const player1State = new PlayerGameState(
        [],
        ['card-to-discard'],
        null,
        [],
        [],
        ['fire-energy-1'],
      );

      const player2State = new PlayerGameState([], [], null, [], [], [], []);

      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effects: TrainerEffectDto[] = [
        {
          effectType: TrainerEffectType.DISCARD_HAND,
          target: TargetType.SELF,
          value: 1,
        },
        {
          effectType: TrainerEffectType.RETRIEVE_ENERGY,
          target: TargetType.SELF,
          value: 2,
        },
      ];

      const actionData: RetrieveEnergyActionData = {
        cardId: 'energy-retrieval',
        handCardId: 'card-to-discard',
        selectedCardIds: ['fire-energy-1'],
      };

      const result = await service.executeEffects(
        effects,
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Card should be discarded
      expect(result.playerState.hand).not.toContain('card-to-discard');
      expect(result.playerState.discardPile).toContain('card-to-discard');
      // Energy should be retrieved
      expect(result.playerState.hand).toContain('fire-energy-1');
      expect(result.playerState.discardPile).not.toContain('fire-energy-1');
    });
  });

  describe('PUT_INTO_PLAY effect', () => {
    it('should put Pokémon from player discard pile to player bench', async () => {
      const player1State = new PlayerGameState(
        [],
        [],
        null,
        [], // Empty bench
        [],
        ['pokemon-card-1'], // Card in discard pile
        [],
      );
      const player2State = new PlayerGameState([], [], null, [], [], [], []);
      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.PUT_INTO_PLAY,
        target: TargetType.BENCHED_YOURS,
        source: 'DISCARD', // Player's discard pile
      };
      const actionData: PutIntoPlayActionData = {
        cardId: 'trainer-card',
        target: 'BENCH_0',
        pokemonCardId: 'pokemon-card-1',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Card should be removed from discard pile
      expect(result.playerState.discardPile).not.toContain('pokemon-card-1');
      // Card should be on bench
      expect(result.playerState.bench).toHaveLength(1);
      expect(result.playerState.bench[0].cardId).toBe('pokemon-card-1');
      expect(result.playerState.bench[0].position).toBe('BENCH_0');
      // Should have default HP (50)
      expect(result.playerState.bench[0].maxHp).toBe(50);
      expect(result.playerState.bench[0].currentHp).toBe(50);
    });

    it('should put Pokémon from opponent discard pile to opponent bench (Pokémon Flute)', async () => {
      const player1State = new PlayerGameState([], [], null, [], [], [], []);
      const player2State = new PlayerGameState(
        [],
        [],
        null,
        [], // Empty bench
        [],
        ['opponent-pokemon-1'], // Card in opponent's discard pile
        [],
      );
      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.PUT_INTO_PLAY,
        target: TargetType.BENCHED_OPPONENTS,
        source: 'OPPONENT_DISCARD', // Opponent's discard pile
      };
      const actionData: PutIntoPlayActionData = {
        cardId: 'pokemon-flute',
        target: 'BENCH_0',
        pokemonCardId: 'opponent-pokemon-1',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Card should be removed from opponent's discard pile
      expect(result.opponentState.discardPile).not.toContain(
        'opponent-pokemon-1',
      );
      // Card should be on opponent's bench
      expect(result.opponentState.bench).toHaveLength(1);
      expect(result.opponentState.bench[0].cardId).toBe('opponent-pokemon-1');
      expect(result.opponentState.bench[0].position).toBe('BENCH_0');
      // Should have default HP (50)
      expect(result.opponentState.bench[0].maxHp).toBe(50);
      expect(result.opponentState.bench[0].currentHp).toBe(50);
      // Player state should be unchanged
      expect(result.playerState.discardPile).toEqual([]);
      expect(result.playerState.bench).toEqual([]);
    });

    it('should default to player discard pile when source is not specified', async () => {
      const player1State = new PlayerGameState(
        [],
        [],
        null,
        [],
        [],
        ['pokemon-card-1'],
        [],
      );
      const player2State = new PlayerGameState([], [], null, [], [], [], []);
      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.PUT_INTO_PLAY,
        target: TargetType.BENCHED_YOURS,
        // source not specified - should default to DISCARD
      };
      const actionData: PutIntoPlayActionData = {
        cardId: 'trainer-card',
        target: 'BENCH_0',
        pokemonCardId: 'pokemon-card-1',
      };

      const result = await service.executeEffects(
        [effect],
        actionData,
        gameState,
        PlayerIdentifier.PLAYER1,
      );

      // Should work with default source (player's discard)
      expect(result.playerState.discardPile).not.toContain('pokemon-card-1');
      expect(result.playerState.bench).toHaveLength(1);
      // Should have default HP (50)
      expect(result.playerState.bench[0].maxHp).toBe(50);
      expect(result.playerState.bench[0].currentHp).toBe(50);
    });

    it('should throw error if Pokémon is not in specified discard pile', async () => {
      const player1State = new PlayerGameState([], [], null, [], [], [], []);
      const player2State = new PlayerGameState([], [], null, [], [], [], []);
      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.PUT_INTO_PLAY,
        target: TargetType.BENCHED_YOURS,
        source: 'DISCARD',
      };
      const actionData: PutIntoPlayActionData = {
        cardId: 'trainer-card',
        target: 'BENCH_0',
        pokemonCardId: 'non-existent-card',
      };

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if opponent discard pile is checked but card is not there', async () => {
      const player1State = new PlayerGameState([], [], null, [], [], [], []);
      const player2State = new PlayerGameState([], [], null, [], [], [], []);
      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.PUT_INTO_PLAY,
        target: TargetType.BENCHED_OPPONENTS,
        source: 'OPPONENT_DISCARD',
      };
      const actionData: PutIntoPlayActionData = {
        cardId: 'pokemon-flute',
        target: 'BENCH_0',
        pokemonCardId: 'non-existent-card',
      };

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if bench is full', async () => {
      const fullBench = Array.from(
        { length: 5 },
        (_, i) =>
          new CardInstance(
            `bench-${i}`,
            `pokemon-${i}`,
            `BENCH_${i}` as PokemonPosition,
            60,
            60,
            [],
            [],
            0,
          ),
      );

      const player1State = new PlayerGameState(
        [],
        [],
        null,
        fullBench,
        [],
        ['pokemon-card-1'],
        [],
      );
      const player2State = new PlayerGameState([], [], null, [], [], [], []);
      const gameState = new GameState(
        player1State,
        player2State,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
        null,
        new Map(),
      );

      const effect: TrainerEffectDto = {
        effectType: TrainerEffectType.PUT_INTO_PLAY,
        target: TargetType.BENCHED_YOURS,
        source: 'DISCARD',
      };
      const actionData: PutIntoPlayActionData = {
        cardId: 'trainer-card',
        target: 'BENCH_5',
        pokemonCardId: 'pokemon-card-1',
      };

      await expect(
        service.executeEffects(
          [effect],
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
