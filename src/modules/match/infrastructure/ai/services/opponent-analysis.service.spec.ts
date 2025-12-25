import { Test, TestingModule } from '@nestjs/testing';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { GameState } from '../../../domain/value-objects';
import { PlayerGameState } from '../../../domain/value-objects';
import { CardInstance } from '../../../domain/value-objects';
import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  EnergyType,
  AttackEffectType,
} from '../../../../card/domain/enums';
import { PokemonPosition, PlayerIdentifier } from '../../../domain/enums';
import { AttackPreconditionFactory } from '../../../../card/domain/value-objects/attack-precondition.value-object';
import { AttackEffectFactory } from '../../../../card/domain/value-objects/attack-effect.value-object';
import { OpponentThreat } from '../../types/action-analysis.types';

describe('OpponentAnalysisService', () => {
  let service: OpponentAnalysisService;
  let pokemonScoringService: jest.Mocked<PokemonScoringService>;
  let attackDamageCalculationService: jest.Mocked<AttackDamageCalculationService>;
  let attackEnergyValidatorService: jest.Mocked<AttackEnergyValidatorService>;

  // Helper function to create a Pokemon card
  const createPokemonCard = (
    cardId: string,
    name: string,
    hp: number,
    attacks: Attack[] = [],
  ): Card => {
    const card = Card.createPokemonCard(
      `instance-${cardId}`,
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
    card.setHp(hp);
    card.setPokemonType(PokemonType.FIRE);
    attacks.forEach((attack) => card.addAttack(attack));
    return card;
  };

  // Helper function to create a CardInstance
  const createCardInstance = (
    instanceId: string,
    cardId: string,
    position: PokemonPosition,
    currentHp: number,
    maxHp: number,
    attachedEnergy: string[] = [],
  ): CardInstance => {
    return new CardInstance(
      instanceId,
      cardId,
      position,
      currentHp,
      maxHp,
      attachedEnergy,
      [], // statusEffects
      [], // evolutionChain
    );
  };

  // Helper function to create an Energy card
  const createEnergyCard = (
    cardId: string,
    energyType: EnergyType,
  ): Card => {
    const card = Card.createEnergyCard(
      cardId,
      '001',
      'Energy',
      'base-set',
      '1',
      Rarity.COMMON,
      'Energy card',
      'Artist',
      '',
    );
    card.setEnergyType(energyType);
    return card;
  };

  beforeEach(async () => {
    // Create mocks
    const mockPokemonScoringService = {
      calculateScore: jest.fn(),
      scorePokemon: jest.fn(),
      sortByScore: jest.fn(),
    };

    const mockAttackDamageCalculationService = {
      calculateFinalDamage: jest.fn(),
    };

    const mockAttackEnergyValidatorService = {
      validateEnergyRequirements: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpponentAnalysisService,
        {
          provide: PokemonScoringService,
          useValue: mockPokemonScoringService,
        },
        {
          provide: AttackDamageCalculationService,
          useValue: mockAttackDamageCalculationService,
        },
        {
          provide: AttackEnergyValidatorService,
          useValue: mockAttackEnergyValidatorService,
        },
      ],
    }).compile();

    service = module.get<OpponentAnalysisService>(OpponentAnalysisService);
    pokemonScoringService = module.get(PokemonScoringService);
    attackDamageCalculationService = module.get(AttackDamageCalculationService);
    attackEnergyValidatorService = module.get(AttackEnergyValidatorService);
  });

  describe('calculateSureAttackDamage', () => {
    it('should calculate sure attack damage: Opponent active Pokemon with sufficient energy', async () => {
      // Arrange
      const attack = new Attack(
        'Flame Thrower',
        [EnergyType.FIRE, EnergyType.FIRE],
        '60',
        'A powerful fire attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [attack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1', 'energy-2'], // 2 Fire energy attached
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const opponentState = new PlayerGameState(
        [], // deck
        [], // hand
        opponentInstance,
        [], // bench
        [], // prizeCards
        [], // discardPile
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));
      cardsMap.set('energy-2', createEnergyCard('energy-2', EnergyType.FIRE));

      // Mock energy validation - sufficient energy
      attackEnergyValidatorService.validateEnergyRequirements.mockReturnValue({
        isValid: true,
      });

      // Mock damage calculation - 60 damage
      attackDamageCalculationService.calculateFinalDamage.mockResolvedValue(60);

      // Act
      const sureDamage = await service.calculateSureAttackDamage(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent has active Pokemon with attack requiring 2 Fire energy
      // Opponent has 2 Fire energy attached
      // Energy validation passes
      // Attack deals 60 damage
      // sureAttackDamage = 60
      expect(sureDamage).toBe(60);
      expect(attackEnergyValidatorService.validateEnergyRequirements).toHaveBeenCalled();
      expect(attackDamageCalculationService.calculateFinalDamage).toHaveBeenCalled();
    });

    it('should return 0 for sure attack damage: Opponent active Pokemon without sufficient energy', async () => {
      // Arrange
      const attack = new Attack(
        'Flame Thrower',
        [EnergyType.FIRE, EnergyType.FIRE],
        '60',
        'A powerful fire attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [attack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1'], // Only 1 Fire energy attached (needs 2)
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));

      // Mock energy validation - insufficient energy
      attackEnergyValidatorService.validateEnergyRequirements.mockReturnValue({
        isValid: false,
        error: 'Insufficient energy',
      });

      // Act
      const sureDamage = await service.calculateSureAttackDamage(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent has active Pokemon with attack requiring 2 Fire energy
      // Opponent has only 1 Fire energy attached
      // Energy validation fails
      // sureAttackDamage = 0 (cannot perform attack)
      expect(sureDamage).toBe(0);
      expect(attackEnergyValidatorService.validateEnergyRequirements).toHaveBeenCalled();
      expect(attackDamageCalculationService.calculateFinalDamage).not.toHaveBeenCalled();
    });

    it('should select highest damage attack when opponent has multiple attacks with sufficient energy', async () => {
      // Arrange
      const weakAttack = new Attack(
        'Weak Strike',
        [EnergyType.FIRE],
        '20',
        'A weak attack',
      );
      const strongAttack = new Attack(
        'Power Strike',
        [EnergyType.FIRE, EnergyType.FIRE],
        '80',
        'A powerful attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [weakAttack, strongAttack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1', 'energy-2'], // 2 Fire energy attached (sufficient for both)
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));
      cardsMap.set('energy-2', createEnergyCard('energy-2', EnergyType.FIRE));

      // Mock energy validation - sufficient energy for both attacks
      attackEnergyValidatorService.validateEnergyRequirements
        .mockReturnValueOnce({ isValid: true }) // Weak attack
        .mockReturnValueOnce({ isValid: true }); // Strong attack

      // Mock damage calculation - return different damages
      attackDamageCalculationService.calculateFinalDamage
        .mockResolvedValueOnce(20) // Weak attack
        .mockResolvedValueOnce(80); // Strong attack

      // Act
      const sureDamage = await service.calculateSureAttackDamage(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent has 2 attacks: 20 damage and 80 damage
      // Both have sufficient energy
      // Should select highest damage attack: 80
      // sureAttackDamage = 80
      expect(sureDamage).toBe(80);
      expect(attackEnergyValidatorService.validateEnergyRequirements).toHaveBeenCalledTimes(2);
      expect(attackDamageCalculationService.calculateFinalDamage).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateRiskAttackDamage', () => {
    it('should calculate risk attack damage: Include coin flip bonuses (assume heads)', async () => {
      // Arrange
      const attack = new Attack(
        'Lucky Strike',
        [EnergyType.COLORLESS],
        '30',
        'Flip a coin. If heads, this attack does 20 more damage.',
        [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Pokemon', 60, [attack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['energy-1'], // 1 Colorless energy attached
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.COLORLESS));

      // Mock energy validation - sufficient energy
      attackEnergyValidatorService.validateEnergyRequirements.mockReturnValue({
        isValid: true,
      });

      // Mock damage calculation - assume heads (30 + 20 = 50 damage)
      attackDamageCalculationService.calculateFinalDamage.mockResolvedValue(50);

      // Act
      const riskDamage = await service.calculateRiskAttackDamage(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent has attack with coin flip bonus
      // Risk damage assumes best case (heads) = 30 base + 20 bonus = 50
      // riskAttackDamage = 50
      expect(riskDamage).toBe(50);
      expect(attackEnergyValidatorService.validateEnergyRequirements).toHaveBeenCalled();
      expect(attackDamageCalculationService.calculateFinalDamage).toHaveBeenCalled();
    });

    it('should calculate risk attack damage: Include potential energy attachments from hand', async () => {
      // Arrange
      const attack = new Attack(
        'Power Strike',
        [EnergyType.FIRE, EnergyType.FIRE],
        '80',
        'A powerful attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [attack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1'], // Only 1 Fire energy attached (needs 2)
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      // Opponent has Fire energy in hand
      const opponentState = new PlayerGameState(
        [],
        ['energy-2'], // Fire energy in hand
        opponentInstance,
        [],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));
      cardsMap.set('energy-2', createEnergyCard('energy-2', EnergyType.FIRE));

      // Mock energy validation - initially insufficient, but with hand energy it becomes sufficient
      attackEnergyValidatorService.validateEnergyRequirements
        .mockReturnValueOnce({ isValid: false }) // Current state
        .mockReturnValueOnce({ isValid: true }); // With hand energy

      // Mock damage calculation - 80 damage
      attackDamageCalculationService.calculateFinalDamage.mockResolvedValue(80);

      // Act
      const riskDamage = await service.calculateRiskAttackDamage(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent currently has insufficient energy (1 Fire, needs 2)
      // Opponent has 1 Fire energy in hand
      // Risk damage assumes opponent can attach energy from hand
      // riskAttackDamage = 80
      expect(riskDamage).toBe(80);
      expect(attackEnergyValidatorService.validateEnergyRequirements).toHaveBeenCalled();
      expect(attackDamageCalculationService.calculateFinalDamage).toHaveBeenCalled();
    });
  });

  describe('scoreOpponentPokemon', () => {
    it('should score all Pokemon in opponent hand and bench', async () => {
      // Arrange
      const benchCard1 = createPokemonCard('opponent-bench-001', 'Pikachu', 60, []);
      const benchInstance1 = createCardInstance(
        'opponent-bench-instance-001',
        'opponent-bench-001',
        PokemonPosition.BENCH_0,
        60,
        60,
      );

      const benchCard2 = createPokemonCard('opponent-bench-002', 'Charizard', 120, []);
      const benchInstance2 = createCardInstance(
        'opponent-bench-instance-002',
        'opponent-bench-002',
        PokemonPosition.BENCH_1,
        120,
        120,
      );

      const handCard = createPokemonCard('opponent-hand-001', 'Blastoise', 100, []);

      const opponentState = new PlayerGameState(
        [],
        ['opponent-hand-001'], // Pokemon in hand
        null,
        [benchInstance1, benchInstance2], // 2 Pokemon on bench
        [],
        [],
      );

      const playerState = new PlayerGameState([], [], null, [], [], []);

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-bench-001', benchCard1);
      cardsMap.set('opponent-bench-002', benchCard2);
      cardsMap.set('opponent-hand-001', handCard);

      // Create temporary CardInstance for hand Pokemon (for scoring purposes)
      const handInstance = createCardInstance(
        'temp-hand-instance',
        'opponent-hand-001',
        PokemonPosition.BENCH_0, // Temporary position for scoring
        100,
        100,
      );

      // Mock scoring service
      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({
          cardInstance: benchInstance1,
          card: benchCard1,
          score: 75,
          position: PokemonPosition.BENCH_0,
        })
        .mockReturnValueOnce({
          cardInstance: benchInstance2,
          card: benchCard2,
          score: 150,
          position: PokemonPosition.BENCH_1,
        })
        .mockReturnValueOnce({
          cardInstance: handInstance,
          card: handCard,
          score: 100,
          position: PokemonPosition.BENCH_0, // Temporary position
        });

      // Act
      const scores = await service.scoreOpponentPokemon(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should score 2 bench Pokemon and 1 hand Pokemon
      // Returns array of PokemonScore objects
      expect(scores).toHaveLength(3);
      expect(pokemonScoringService.scorePokemon).toHaveBeenCalledTimes(3);
    });
  });

  describe('identifyMostThreateningPokemon', () => {
    it('should return highest scored Pokemon position from hand and bench', async () => {
      // Arrange
      const benchCard1 = createPokemonCard('opponent-bench-001', 'Pikachu', 60, []);
      const benchInstance1 = createCardInstance(
        'opponent-bench-instance-001',
        'opponent-bench-001',
        PokemonPosition.BENCH_0,
        60,
        60,
      );

      const benchCard2 = createPokemonCard('opponent-bench-002', 'Charizard', 120, []);
      const benchInstance2 = createCardInstance(
        'opponent-bench-instance-002',
        'opponent-bench-002',
        PokemonPosition.BENCH_1,
        120,
        120,
      );

      const handCard = createPokemonCard('opponent-hand-001', 'Blastoise', 100, []);

      const opponentState = new PlayerGameState(
        [],
        ['opponent-hand-001'], // Pokemon in hand
        null,
        [benchInstance1, benchInstance2], // 2 Pokemon on bench
        [],
        [],
      );

      const playerState = new PlayerGameState([], [], null, [], [], []);

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-bench-001', benchCard1);
      cardsMap.set('opponent-bench-002', benchCard2);
      cardsMap.set('opponent-hand-001', handCard);

      // Create temporary CardInstance for hand Pokemon (for scoring purposes)
      const handInstance = createCardInstance(
        'temp-hand-instance',
        'opponent-hand-001',
        PokemonPosition.BENCH_0, // Temporary position for scoring
        100,
        100,
      );

      // Mock scoring service - Charizard has highest score (150)
      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({
          cardInstance: benchInstance1,
          card: benchCard1,
          score: 75,
          position: PokemonPosition.BENCH_0,
        })
        .mockReturnValueOnce({
          cardInstance: benchInstance2,
          card: benchCard2,
          score: 150, // Highest score
          position: PokemonPosition.BENCH_1,
        })
        .mockReturnValueOnce({
          cardInstance: handInstance,
          card: handCard,
          score: 100,
          position: PokemonPosition.BENCH_0, // Temporary position
        });

      // Act
      const mostThreatening = await service.identifyMostThreateningPokemon(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Charizard on bench_1 has highest score (150)
      // Should return PokemonPosition.BENCH_1
      expect(mostThreatening).toBe(PokemonPosition.BENCH_1);
    });

    it('should return null when opponent has no Pokemon in hand or bench', async () => {
      // Arrange
      const opponentState = new PlayerGameState(
        [],
        [], // No Pokemon in hand
        null,
        [], // No Pokemon on bench
        [],
        [],
      );

      const playerState = new PlayerGameState([], [], null, [], [], []);

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();

      // Act
      const mostThreatening = await service.identifyMostThreateningPokemon(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // No Pokemon in hand or bench
      // Should return null
      expect(mostThreatening).toBeNull();
    });
  });

  describe('canOpponentKnockout', () => {
    it('should return true: Opponent can knockout our active Pokemon', async () => {
      // Arrange
      const opponentAttack = new Attack(
        'Knockout Blow',
        [EnergyType.FIRE],
        '70',
        'A powerful attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [opponentAttack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1'], // Sufficient energy
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60, // Current HP
        60, // Max HP
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));

      // Mock energy validation - sufficient energy
      attackEnergyValidatorService.validateEnergyRequirements.mockReturnValue({
        isValid: true,
      });

      // Mock damage calculation - 70 damage (more than player's 60 HP)
      attackDamageCalculationService.calculateFinalDamage.mockResolvedValue(70);

      // Act
      const canKnockout = await service.canOpponentKnockout(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent can deal 70 damage
      // Player active Pokemon has 60 HP
      // 70 >= 60, so canKnockout = true
      expect(canKnockout).toBe(true);
    });

    it('should return false: Opponent cannot knockout our active Pokemon', async () => {
      // Arrange
      const opponentAttack = new Attack(
        'Weak Attack',
        [EnergyType.FIRE],
        '30',
        'A weak attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [opponentAttack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1'],
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));

      attackEnergyValidatorService.validateEnergyRequirements.mockReturnValue({
        isValid: true,
      });

      // Mock damage calculation - 30 damage (less than player's 60 HP)
      attackDamageCalculationService.calculateFinalDamage.mockResolvedValue(30);

      // Act
      const canKnockout = await service.canOpponentKnockout(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Opponent can deal 30 damage
      // Player active Pokemon has 60 HP
      // 30 < 60, so canKnockout = false
      expect(canKnockout).toBe(false);
    });
  });

  describe('analyzeOpponentThreat', () => {
    it('should return complete OpponentThreat analysis', async () => {
      // Arrange
      const attack = new Attack(
        'Power Attack',
        [EnergyType.FIRE],
        '50',
        'A powerful attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Charizard', 120, [attack]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['energy-1'],
      );

      const benchCard = createPokemonCard('opponent-bench-001', 'Blastoise', 100, []);
      const benchInstance = createCardInstance(
        'opponent-bench-instance-001',
        'opponent-bench-001',
        PokemonPosition.BENCH_0,
        100,
        100,
      );

      const playerCard = createPokemonCard('player-card-001', 'Pikachu', 60, []);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [benchInstance],
        [],
        [],
      );

      const playerState = new PlayerGameState(
        [],
        [],
        playerInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        'MAIN_PHASE',
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('opponent-bench-001', benchCard);
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('energy-1', createEnergyCard('energy-1', EnergyType.FIRE));

      attackEnergyValidatorService.validateEnergyRequirements.mockReturnValue({
        isValid: true,
      });

      attackDamageCalculationService.calculateFinalDamage.mockResolvedValue(50);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({
          cardInstance: opponentInstance,
          card: opponentCard,
          score: 150,
          position: PokemonPosition.ACTIVE,
        })
        .mockReturnValueOnce({
          cardInstance: benchInstance,
          card: benchCard,
          score: 120,
          position: PokemonPosition.BENCH_0,
        });

      // Act
      const threat = await service.analyzeOpponentThreat(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Returns OpponentThreat object with:
      // - sureAttackDamage: 50
      // - riskAttackDamage: 50 (same in this case, no coin flips or hand energy)
      // - canKnockoutActive: false (50 < 60)
      // - canKnockoutBench: []
      // - mostThreateningPokemon: PokemonPosition.ACTIVE (active has highest score: 150)
      // - activePokemonScore: 150
      expect(threat).toBeDefined();
      expect(threat.sureAttackDamage).toBe(50);
      expect(threat.riskAttackDamage).toBe(50);
      expect(threat.canKnockoutActive).toBe(false);
      expect(threat.canKnockoutBench).toEqual([]);
      expect(threat.mostThreateningPokemon).toBe(PokemonPosition.ACTIVE);
      expect(threat.activePokemonScore).toBe(150);
    });
  });
});

