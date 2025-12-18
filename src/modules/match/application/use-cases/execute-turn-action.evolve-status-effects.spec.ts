import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { SetPrizeCardsUseCase } from './set-prize-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { CoinFlipResolverService } from '../../domain/services/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/ability-effect-validator.service';
import { Match } from '../../domain/entities/match.entity';
import { PlayerIdentifier } from '../../domain/enums/player-identifier.enum';
import { MatchState } from '../../domain/enums/match-state.enum';
import { PlayerActionType } from '../../domain/enums/player-action-type.enum';
import { TurnPhase } from '../../domain/enums/turn-phase.enum';
import { GameState } from '../../domain/value-objects/game-state.value-object';
import { PlayerGameState } from '../../domain/value-objects/player-game-state.value-object';
import { CardInstance } from '../../domain/value-objects/card-instance.value-object';
import { PokemonPosition } from '../../domain/enums/pokemon-position.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { Card } from '../../../card/domain/entities/card.entity';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { Evolution } from '../../../card/domain/value-objects/evolution.value-object';
import { ExecuteActionDto } from '../dto/execute-action.dto';

describe('ExecuteTurnActionUseCase - Evolution Status Effects Clearing', () => {
  let useCase: ExecuteTurnActionUseCase;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockStateMachineService: jest.Mocked<MatchStateMachineService>;
  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;
  let mockDrawInitialCardsUseCase: jest.Mocked<DrawInitialCardsUseCase>;
  let mockSetPrizeCardsUseCase: jest.Mocked<SetPrizeCardsUseCase>;
  let mockPerformCoinTossUseCase: jest.Mocked<PerformCoinTossUseCase>;
  let mockCoinFlipResolver: jest.Mocked<CoinFlipResolverService>;
  let mockAttackCoinFlipParser: jest.Mocked<AttackCoinFlipParserService>;
  let mockAttackEnergyValidator: jest.Mocked<AttackEnergyValidatorService>;
  let mockTrainerEffectExecutor: jest.Mocked<TrainerEffectExecutorService>;
  let mockTrainerEffectValidator: jest.Mocked<TrainerEffectValidatorService>;
  let mockAbilityEffectExecutor: jest.Mocked<AbilityEffectExecutorService>;
  let mockAbilityEffectValidator: jest.Mocked<AbilityEffectValidatorService>;

  // Helper to create Pokemon cards
  const createPokemonCard = (
    cardId: string,
    name: string,
    stage: EvolutionStage,
    hp: number,
    evolvesFrom?: string,
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
    card.setStage(stage);
    card.setHp(hp);
    card.setPokemonType(PokemonType.FIRE);

    if (evolvesFrom && stage !== EvolutionStage.BASIC) {
      const evolution = new Evolution('000', stage, evolvesFrom, undefined);
      card.setEvolvesFrom(evolution);
    }

    return card;
  };

  // Helper to create a match with game state
  const createMatchWithGameState = (
    activePokemon?: CardInstance,
    bench: CardInstance[] = [],
    hand: string[] = [],
  ): Match => {
    const player1State = new PlayerGameState(
      [],
      hand,
      activePokemon || null,
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
      [],
      null,
      new Map(),
    );

    const match = new Match('match-1', 'tournament-1');
    // Assign players
    match.assignPlayer('test-player-1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('test-player-2', 'deck-2', PlayerIdentifier.PLAYER2);
    // Transition to PLAYER_TURN state first (for testing purposes)
    // We need PLAYER_TURN state to update game state
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    match.updateGameState(gameState);

    return match;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnActionUseCase,
        {
          provide: IMatchRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MatchStateMachineService,
          useValue: {
            canTransition: jest.fn().mockReturnValue(true),
            transition: jest.fn(),
            validateAction: jest.fn().mockReturnValue({ isValid: true }),
          },
        },
        {
          provide: IGetCardByIdUseCase,
          useValue: {
            execute: jest.fn(),
            getCardEntity: jest.fn(),
            getCardsByIds: jest.fn().mockResolvedValue(new Map()),
          },
        },
        {
          provide: DrawInitialCardsUseCase,
          useValue: {},
        },
        {
          provide: SetPrizeCardsUseCase,
          useValue: {},
        },
        {
          provide: PerformCoinTossUseCase,
          useValue: {},
        },
        {
          provide: CoinFlipResolverService,
          useValue: {
            generateCoinFlip: jest.fn(),
          },
        },
        {
          provide: AttackCoinFlipParserService,
          useValue: {},
        },
        {
          provide: AttackEnergyValidatorService,
          useValue: {},
        },
        {
          provide: TrainerEffectExecutorService,
          useValue: {},
        },
        {
          provide: TrainerEffectValidatorService,
          useValue: {},
        },
        {
          provide: AbilityEffectExecutorService,
          useValue: {},
        },
        {
          provide: AbilityEffectValidatorService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ExecuteTurnActionUseCase>(ExecuteTurnActionUseCase);
    mockMatchRepository = module.get(IMatchRepository);
    mockStateMachineService = module.get(MatchStateMachineService);
    mockGetCardByIdUseCase = module.get(IGetCardByIdUseCase);
    mockDrawInitialCardsUseCase = module.get(DrawInitialCardsUseCase);
    mockSetPrizeCardsUseCase = module.get(SetPrizeCardsUseCase);
    mockPerformCoinTossUseCase = module.get(PerformCoinTossUseCase);
    mockCoinFlipResolver = module.get(CoinFlipResolverService);
    mockAttackCoinFlipParser = module.get(AttackCoinFlipParserService);
    mockAttackEnergyValidator = module.get(AttackEnergyValidatorService);
    mockTrainerEffectExecutor = module.get(TrainerEffectExecutorService);
    mockTrainerEffectValidator = module.get(TrainerEffectValidatorService);
    mockAbilityEffectExecutor = module.get(AbilityEffectExecutorService);
    mockAbilityEffectValidator = module.get(AbilityEffectValidatorService);
  });

  describe('Status Effects Clearing on Evolution', () => {
    it('should clear POISONED status and poisonDamageAmount while preserving damage counters', async () => {
      // Arrange: Create a poisoned Pokemon with damage
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        30, // currentHp (20 damage taken from 50 maxHp)
        50, // maxHp
        ['energy-fire-1'], // attached energy
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify status effect is cleared, poison damage amount is cleared, but damage is preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 30 currentHp = 20 damage
      // Evolved: 80 maxHp - 20 damage = 60 currentHp
      expect(evolvedPokemon?.currentHp).toBe(60);
      expect(evolvedPokemon?.maxHp).toBe(80);

      // Energy should be preserved
      expect(evolvedPokemon?.attachedEnergy).toEqual(['energy-fire-1']);
    });

    it('should clear CONFUSED status while preserving damage counters and energy', async () => {
      // Arrange: Create a confused Pokemon with damage
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        40, // currentHp (10 damage taken)
        50, // maxHp
        ['energy-fire-1', 'energy-fire-2'], // attached energy
        [StatusEffect.CONFUSED], // Has confused status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify confused status is cleared, damage and energy preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 40 currentHp = 10 damage
      // Evolved: 80 maxHp - 10 damage = 70 currentHp
      expect(evolvedPokemon?.currentHp).toBe(70);
      expect(evolvedPokemon?.maxHp).toBe(80);

      // Energy should be preserved
      expect(evolvedPokemon?.attachedEnergy).toEqual([
        'energy-fire-1',
        'energy-fire-2',
      ]);
    });

    it('should clear ASLEEP status while preserving damage counters', async () => {
      // Arrange: Create an asleep Pokemon
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        25, // currentHp (25 damage taken)
        50, // maxHp
        [],
        [StatusEffect.ASLEEP], // Has asleep status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify asleep status is cleared, damage preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 25 currentHp = 25 damage
      // Evolved: 80 maxHp - 25 damage = 55 currentHp
      expect(evolvedPokemon?.currentHp).toBe(55);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should clear PARALYZED status while preserving damage counters', async () => {
      // Arrange: Create a paralyzed Pokemon
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        45, // currentHp (5 damage taken)
        50, // maxHp
        [],
        [StatusEffect.PARALYZED], // Has paralyzed status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify paralyzed status is cleared, damage preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 45 currentHp = 5 damage
      // Evolved: 80 maxHp - 5 damage = 75 currentHp
      expect(evolvedPokemon?.currentHp).toBe(75);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should clear BURNED status while preserving damage counters', async () => {
      // Arrange: Create a burned Pokemon
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        35, // currentHp (15 damage taken)
        50, // maxHp
        [],
        [StatusEffect.BURNED], // Has burned status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify burned status is cleared, damage preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 35 currentHp = 15 damage
      // Evolved: 80 maxHp - 15 damage = 65 currentHp
      expect(evolvedPokemon?.currentHp).toBe(65);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should clear status effects when evolving from bench position', async () => {
      // Arrange: Create a poisoned Pokemon on bench
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.BENCH_0,
        30, // currentHp (20 damage taken)
        50, // maxHp
        [],
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(
        null, // no active Pokemon
        [charmander], // on bench
        ['charmeleon-id'],
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'BENCH_0',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify status effect is cleared on bench Pokemon
      const evolvedPokemon = result.gameState?.player1State.bench[0];
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 30 currentHp = 20 damage
      // Evolved: 80 maxHp - 20 damage = 60 currentHp
      expect(evolvedPokemon?.currentHp).toBe(60);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should preserve damage counters even when Pokemon has full HP', async () => {
      // Arrange: Create a poisoned Pokemon with full HP
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        50, // currentHp (full HP, no damage)
        50, // maxHp
        [],
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify status effect is cleared, Pokemon has full HP after evolution
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // No damage taken: 50 maxHp - 50 currentHp = 0 damage
      // Evolved: 80 maxHp - 0 damage = 80 currentHp (full HP)
      expect(evolvedPokemon?.currentHp).toBe(80);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should handle evolution when Pokemon is at 0 HP (knocked out)', async () => {
      // Arrange: Create a poisoned Pokemon at 0 HP
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        0, // currentHp (knocked out)
        50, // maxHp
        [],
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert: Verify status effect is cleared, damage preserved (knocked out)
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 0 currentHp = 50 damage
      // Evolved: 80 maxHp - 50 damage = 30 currentHp (still alive!)
      expect(evolvedPokemon?.currentHp).toBe(30);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });
  });
});
