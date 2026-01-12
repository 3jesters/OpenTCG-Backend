import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RetreatExecutionService } from './retreat-execution.service';
import { IMatchRepository } from '../../domain/repositories';
import { CardHelperService } from './card-helper.service';
import { Match } from '../../domain/entities/match.entity';
import { GameState } from '../../domain/value-objects/game-state.value-object';
import { PlayerGameState } from '../../domain/value-objects/player-game-state.value-object';
import { CardInstance } from '../../domain/value-objects/card-instance.value-object';
import { ActionSummary } from '../../domain/value-objects/action-summary.value-object';
import { PlayerIdentifier } from '../../domain/enums/player-identifier.enum';
import { MatchState } from '../../domain/enums/match-state.enum';
import { TurnPhase } from '../../domain/enums/turn-phase.enum';
import { PokemonPosition } from '../../domain/enums/pokemon-position.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { PlayerActionType } from '../../domain/enums/player-action-type.enum';
import { Card } from '../../../card/domain/entities/card.entity';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { CardRuleType } from '../../../card/domain/enums/card-rule-type.enum';
import { CardRuleFactory } from '../../../card/domain/value-objects/card-rule.value-object';
import { v4 as uuidv4 } from 'uuid';

describe('RetreatExecutionService', () => {
  let service: RetreatExecutionService;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockCardHelper: jest.Mocked<CardHelperService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetreatExecutionService,
        {
          provide: IMatchRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CardHelperService,
          useValue: {
            getCardEntity: jest.fn(),
            getCardHp: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RetreatExecutionService>(RetreatExecutionService);
    mockMatchRepository = module.get(IMatchRepository);
    mockCardHelper = module.get(CardHelperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create Pokemon card
  const createPokemonCard = (
    cardId: string,
    name: string,
    retreatCost: number = 1,
    hasCannotRetreat: boolean = false,
    hasFreeRetreat: boolean = false,
  ): Card => {
    const card = Card.createPokemonCard(
      'instance-1',
      cardId,
      '001',
      name,
      'base-set',
      '1',
      Rarity.COMMON,
      'Test Pokemon',
      'Artist',
      '',
    );
    card.setStage(EvolutionStage.BASIC);
    card.setHp(50);
    card.setPokemonType(PokemonType.FIRE);
    card.setRetreatCost(retreatCost);

    const rules = [];
    if (hasCannotRetreat) {
      rules.push(CardRuleFactory.cannotRetreat());
    }
    if (hasFreeRetreat) {
      rules.push(CardRuleFactory.freeRetreat());
    }
    if (rules.length > 0) {
      card.setCardRules(rules);
    }

    return card;
  };

  // Helper to create match with game state
  const createMatchWithGameState = (
    activePokemon: CardInstance,
    bench: CardInstance[] = [],
    actionHistory: ActionSummary[] = [],
  ): Match => {
    const player1State = new PlayerGameState(
      [],
      [],
      activePokemon,
      bench,
      [],
      [],
      false,
    );

    const player2State = new PlayerGameState([], [], null, [], [], [], false);

    const gameState = new GameState(
      player1State,
      player2State,
      1,
      TurnPhase.MAIN_PHASE,
      PlayerIdentifier.PLAYER1,
      null,
      actionHistory,
      null,
      new Map(),
    );

    const match = new Match('match-1', 'tournament-1');
    match.assignPlayer('player1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('player2', 'deck-2', PlayerIdentifier.PLAYER2);
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    match.updateGameState(gameState);

    return match;
  };

  // Helper to create CardInstance
  const createCardInstance = (
    cardId: string,
    position: PokemonPosition,
    attachedEnergy: string[] = [],
    statusEffects: StatusEffect[] = [],
  ): CardInstance => {
    return new CardInstance(
      uuidv4(),
      cardId,
      position,
      50,
      50,
      attachedEnergy,
      statusEffects,
      [],
      undefined,
      undefined,
    );
  };

  describe('executeRetreat', () => {
    it('should successfully retreat with energy cost', async () => {
      const energy1 = 'energy-1';
      const energy2 = 'energy-2';
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        [energy1, energy2],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 2);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);
      mockMatchRepository.save.mockResolvedValue(match);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: [energy1, energy2],
        },
      };

      const result = await service.executeRetreat({
        dto,
        match,
        gameState,
        playerIdentifier: PlayerIdentifier.PLAYER1,
        cardsMap: new Map(),
      });

      expect(result).toBe(match);
      expect(mockCardHelper.getCardEntity).toHaveBeenCalledWith(
        'active-card',
        expect.any(Map),
      );
      expect(mockMatchRepository.save).toHaveBeenCalled();

      const savedMatch = mockMatchRepository.save.mock.calls[0][0];
      const updatedState = savedMatch.gameState!;
      const playerState = updatedState.getPlayerState(PlayerIdentifier.PLAYER1);

      // Active Pokemon should be the bench Pokemon
      expect(playerState.activePokemon?.cardId).toBe('bench-card');
      expect(playerState.activePokemon?.position).toBe(PokemonPosition.ACTIVE);
      expect(playerState.activePokemon?.statusEffects).toEqual([]);

      // Bench should contain the retreating Pokemon
      expect(playerState.bench.length).toBe(1);
      expect(playerState.bench[0].cardId).toBe('active-card');
      expect(playerState.bench[0].position).toBe(PokemonPosition.BENCH_0);
      expect(playerState.bench[0].statusEffects).toEqual([]);
      expect(playerState.bench[0].attachedEnergy).toEqual([]);

      // Energy should be in discard pile
      expect(playerState.discardPile).toContain(energy1);
      expect(playerState.discardPile).toContain(energy2);
    });

    it('should successfully retreat with free retreat (no energy cost)', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard(
        'active-card',
        'Active',
        1,
        false,
        true, // FREE_RETREAT
      );

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);
      mockMatchRepository.save.mockResolvedValue(match);

      const dto = {
        actionData: {
          target: 'BENCH_0',
        },
      };

      const result = await service.executeRetreat({
        dto,
        match,
        gameState,
        playerIdentifier: PlayerIdentifier.PLAYER1,
        cardsMap: new Map(),
      });

      expect(result).toBe(match);
      const savedMatch = mockMatchRepository.save.mock.calls[0][0];
      const updatedState = savedMatch.gameState!;
      const playerState = updatedState.getPlayerState(PlayerIdentifier.PLAYER1);

      // Energy should still be attached (not discarded)
      expect(playerState.bench[0].attachedEnergy).toEqual(['energy-1']);
    });

    it('should throw error if Pokemon is paralyzed', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
        [StatusEffect.PARALYZED],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-1'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('Cannot retreat while Paralyzed');
    });

    it('should throw error if Pokemon has CANNOT_RETREAT rule', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard(
        'active-card',
        'Active',
        1,
        true, // CANNOT_RETREAT
      );

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-1'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('This Pokemon cannot retreat');
    });

    it('should throw error if target is missing', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {},
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('target is required in actionData');
    });

    it('should throw error if target bench position is invalid', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'INVALID',
          selectedEnergyIds: ['energy-1'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if bench position has no Pokemon', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );

      const match = createMatchWithGameState(activePokemon, []);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-1'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('No Pokemon at bench position');
    });

    it('should throw error if insufficient energy attached', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'], // Only 1 energy, but need 2
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 2);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-1'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('Insufficient energy to retreat');
    });

    it('should request energy selection if not provided', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1', 'energy-2'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 2);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        });
      } catch (error: any) {
        const errorData = JSON.parse(error.message);
        expect(errorData.error).toBe('ENERGY_SELECTION_REQUIRED');
        expect(errorData.requirement.amount).toBe(2);
        expect(errorData.requirement.energyType).toBeNull();
        expect(errorData.availableEnergy).toEqual(['energy-1', 'energy-2']);
      }
    });

    it('should throw error if wrong number of energy selected', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1', 'energy-2'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 2);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-1'], // Only 1, but need 2
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('Must select exactly 2 energy card(s)');
    });

    it('should throw error if selected energy not attached', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-not-attached'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow('Energy card energy-not-attached is not attached');
    });

    it('should throw error if energy selected for free retreat', async () => {
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        ['energy-1'],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard(
        'active-card',
        'Active',
        1,
        false,
        true, // FREE_RETREAT
      );

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: ['energy-1'],
        },
      };

      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier: PlayerIdentifier.PLAYER1,
          cardsMap: new Map(),
        }),
      ).rejects.toThrow(
        'No energy selection needed for Pokemon with free retreat',
      );
    });

    it('should clear status effects on both Pokemon after retreat', async () => {
      const energy1 = 'energy-1';
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        [energy1],
        [StatusEffect.POISONED, StatusEffect.CONFUSED],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
        [],
        [StatusEffect.BURNED],
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);
      mockMatchRepository.save.mockResolvedValue(match);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: [energy1],
        },
      };

      await service.executeRetreat({
        dto,
        match,
        gameState,
        playerIdentifier: PlayerIdentifier.PLAYER1,
        cardsMap: new Map(),
      });

      const savedMatch = mockMatchRepository.save.mock.calls[0][0];
      const updatedState = savedMatch.gameState!;
      const playerState = updatedState.getPlayerState(PlayerIdentifier.PLAYER1);

      // New active Pokemon should have no status effects
      expect(playerState.activePokemon?.statusEffects).toEqual([]);
      // Retreating Pokemon should have no status effects
      expect(playerState.bench[0].statusEffects).toEqual([]);
    });

    it('should properly renumber bench positions after retreat', async () => {
      const energy1 = 'energy-1';
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        [energy1],
      );
      const bench1 = createCardInstance('bench-1', PokemonPosition.BENCH_0);
      const bench2 = createCardInstance('bench-2', PokemonPosition.BENCH_1);
      const bench3 = createCardInstance('bench-3', PokemonPosition.BENCH_2);

      const match = createMatchWithGameState(activePokemon, [
        bench1,
        bench2,
        bench3,
      ]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);
      mockMatchRepository.save.mockResolvedValue(match);

      const dto = {
        actionData: {
          target: 'BENCH_1', // Retreat to middle position
          selectedEnergyIds: [energy1],
        },
      };

      await service.executeRetreat({
        dto,
        match,
        gameState,
        playerIdentifier: PlayerIdentifier.PLAYER1,
        cardsMap: new Map(),
      });

      const savedMatch = mockMatchRepository.save.mock.calls[0][0];
      const updatedState = savedMatch.gameState!;
      const playerState = updatedState.getPlayerState(PlayerIdentifier.PLAYER1);

      // Bench should have 3 Pokemon with sequential positions
      expect(playerState.bench.length).toBe(3);
      expect(playerState.bench[0].position).toBe(PokemonPosition.BENCH_0);
      expect(playerState.bench[1].position).toBe(PokemonPosition.BENCH_1);
      expect(playerState.bench[2].position).toBe(PokemonPosition.BENCH_2);
    });

    it('should create action summary with correct data', async () => {
      const energy1 = 'energy-1';
      const activePokemon = createCardInstance(
        'active-card',
        PokemonPosition.ACTIVE,
        [energy1],
      );
      const benchPokemon = createCardInstance(
        'bench-card',
        PokemonPosition.BENCH_0,
      );

      const match = createMatchWithGameState(activePokemon, [benchPokemon]);
      const gameState = match.gameState!;
      const cardEntity = createPokemonCard('active-card', 'Active', 1);

      mockCardHelper.getCardEntity.mockResolvedValue(cardEntity);
      mockMatchRepository.save.mockResolvedValue(match);

      const dto = {
        actionData: {
          target: 'BENCH_0',
          selectedEnergyIds: [energy1],
        },
      };

      await service.executeRetreat({
        dto,
        match,
        gameState,
        playerIdentifier: PlayerIdentifier.PLAYER1,
        cardsMap: new Map(),
      });

      const savedMatch = mockMatchRepository.save.mock.calls[0][0];
      const updatedState = savedMatch.gameState!;
      const lastAction = updatedState.lastAction;

      expect(lastAction).toBeDefined();
      expect(lastAction?.actionType).toBe(PlayerActionType.RETREAT);
      expect(lastAction?.playerId).toBe(PlayerIdentifier.PLAYER1);
      expect(lastAction?.actionData).toMatchObject({
        activePokemonCardId: 'active-card',
        benchPokemonCardId: 'bench-card',
        target: 'BENCH_0',
        selectedEnergyIds: [energy1],
        retreatCost: 1,
      });
    });
  });
});
