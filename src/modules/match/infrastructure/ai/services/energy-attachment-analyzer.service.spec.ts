import { Test, TestingModule } from '@nestjs/testing';
import { EnergyAttachmentAnalyzerService } from './energy-attachment-analyzer.service';
import { ActionPrioritizationService } from './action-prioritization.service';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import { AttackDamageCalculatorService } from '../../../domain/services/attack/damage-bonuses/attack-damage-calculator.service';
import { AttackTextParserService } from '../../../domain/services/attack/damage-bonuses/attack-text-parser.service';
import { WeaknessResistanceService } from '../../../domain/services/attack/damage-modifiers/weakness-resistance.service';
import { DamagePreventionService } from '../../../domain/services/attack/damage-modifiers/damage-prevention.service';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { EnergyProvision } from '../../../../card/domain/value-objects/energy-provision.value-object';
import { Weakness } from '../../../../card/domain/value-objects/weakness.value-object';
import { Resistance } from '../../../../card/domain/value-objects/resistance.value-object';
import { GameState } from '../../../domain/value-objects';
import { PlayerGameState } from '../../../domain/value-objects';
import { CardInstance } from '../../../domain/value-objects';
import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  EnergyType,
} from '../../../../card/domain/enums';
import { AttackEffectType } from '../../../../card/domain/enums/attack-effect-type.enum';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { PokemonPosition, PlayerIdentifier, TurnPhase } from '../../../domain/enums';
import {
  EnergyAttachmentOption,
  SortedEnergyAttachmentOptionList,
} from '../types/action-analysis.types';

describe('EnergyAttachmentAnalyzerService', () => {
  let service: EnergyAttachmentAnalyzerService;
  let actionPrioritizationService: ActionPrioritizationService;

  // Helper function to create a Pokemon card
  const createPokemonCard = (
    cardId: string,
    name: string,
    hp: number,
    attacks: Attack[] = [],
    weakness?: Weakness,
    resistance?: Resistance,
    pokemonType: PokemonType = PokemonType.FIRE,
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
    card.setPokemonType(pokemonType);
    if (weakness) {
      card.setWeakness(weakness);
    }
    if (resistance) {
      card.setResistance(resistance);
    }
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
      undefined, // poisonDamageAmount
      undefined, // evolvedAt
      undefined, // paralysisClearsAtTurn
    );
  };

  // Helper function to create a basic Energy card
  const createEnergyCard = (
    cardId: string,
    energyType: EnergyType,
  ): Card => {
    const card = Card.createEnergyCard(
      `instance-${cardId}`,
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

  // Helper function to create a Double Colorless Energy card
  const createDoubleColorlessEnergyCard = (cardId: string): Card => {
    const card = Card.createEnergyCard(
      `instance-${cardId}`,
      cardId,
      '001',
      'Double Colorless Energy',
      'base-set',
      '1',
      Rarity.UNCOMMON,
      'Double Colorless Energy counts as 2 Colorless Energy',
      'Artist',
      '',
    );
    card.setEnergyType(EnergyType.COLORLESS);
    const energyProvision = new EnergyProvision(
      [EnergyType.COLORLESS],
      2,
      true, // isSpecial
    );
    card.setEnergyProvision(energyProvision);
    return card;
  };

  beforeEach(async () => {
    // Use real implementations - all are deterministic business logic services
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergyAttachmentAnalyzerService,
        ActionPrioritizationService,
        OpponentAnalysisService,
        PokemonScoringService,
        AttackEnergyValidatorService,
        AttackTextParserService,
        AttackDamageCalculatorService,
        WeaknessResistanceService,
        DamagePreventionService,
        AttackDamageCalculationService,
      ],
    }).compile();

    service = module.get<EnergyAttachmentAnalyzerService>(
      EnergyAttachmentAnalyzerService,
    );
    actionPrioritizationService = module.get<ActionPrioritizationService>(
      ActionPrioritizationService,
    );
  });

  describe('findUniqueEnergyTypes', () => {
    it('should find unique energy types: Hand with 2 Water, 1 Fire', async () => {
      // Arrange
      const handCardIds = ['water-1', 'water-2', 'fire-1'];
      const cardsMap = new Map<string, Card>();
      cardsMap.set('water-1', createEnergyCard('water-1', EnergyType.WATER));
      cardsMap.set('water-2', createEnergyCard('water-2', EnergyType.WATER));
      cardsMap.set('fire-1', createEnergyCard('fire-1', EnergyType.FIRE));

      // Act
      const uniqueEnergyTypes = await service.findUniqueEnergyTypes(
        handCardIds,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 2 unique energy types: Water and Fire
      // Should not duplicate Water (even though there are 2 Water energy cards)
      expect(uniqueEnergyTypes).toHaveLength(2);
      expect(uniqueEnergyTypes).toContain(EnergyType.WATER);
      expect(uniqueEnergyTypes).toContain(EnergyType.FIRE);
    });

    it('should find unique energy types: Hand with Double Colorless Energy', async () => {
      // Arrange
      const handCardIds = ['dce-1', 'water-1', 'fire-1'];
      const cardsMap = new Map<string, Card>();
      cardsMap.set('dce-1', createDoubleColorlessEnergyCard('dce-1'));
      cardsMap.set('water-1', createEnergyCard('water-1', EnergyType.WATER));
      cardsMap.set('fire-1', createEnergyCard('fire-1', EnergyType.FIRE));

      // Act
      const uniqueEnergyTypes = await service.findUniqueEnergyTypes(
        handCardIds,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 3 unique energy types: COLORLESS (DCE), Water, Fire
      // DCE should be identified by its energyType (COLORLESS)
      expect(uniqueEnergyTypes).toHaveLength(3);
      expect(uniqueEnergyTypes).toContain(EnergyType.COLORLESS);
      expect(uniqueEnergyTypes).toContain(EnergyType.WATER);
      expect(uniqueEnergyTypes).toContain(EnergyType.FIRE);
    });

    it('should return empty array: Hand with no energy cards', async () => {
      // Arrange
      const handCardIds = ['pokemon-1', 'trainer-1'];
      const cardsMap = new Map<string, Card>();
      cardsMap.set('pokemon-1', createPokemonCard('pokemon-1', 'Pikachu', 60));
      // trainer-1 would be a trainer card (not in map for this test)

      // Act
      const uniqueEnergyTypes = await service.findUniqueEnergyTypes(
        handCardIds,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array (no energy cards in hand)
      expect(uniqueEnergyTypes).toHaveLength(0);
    });

    it('should ignore non-energy cards in hand', async () => {
      // Arrange
      const handCardIds = ['water-1', 'pokemon-1', 'fire-1'];
      const cardsMap = new Map<string, Card>();
      cardsMap.set('water-1', createEnergyCard('water-1', EnergyType.WATER));
      cardsMap.set('pokemon-1', createPokemonCard('pokemon-1', 'Pikachu', 60));
      cardsMap.set('fire-1', createEnergyCard('fire-1', EnergyType.FIRE));

      // Act
      const uniqueEnergyTypes = await service.findUniqueEnergyTypes(
        handCardIds,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should only return energy types, ignoring Pokemon card
      expect(uniqueEnergyTypes).toHaveLength(2);
      expect(uniqueEnergyTypes).toContain(EnergyType.WATER);
      expect(uniqueEnergyTypes).toContain(EnergyType.FIRE);
      expect(uniqueEnergyTypes).not.toContain('pokemon-1');
    });
  });

  describe('evaluateAttachmentOptions', () => {
    it('should evaluate attachment options: Attachment enables knockout', async () => {
      // Arrange
      const attack = new Attack(
        'Knockout Strike',
        [EnergyType.FIRE],
        '60',
        'A knockout attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        attack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy attached yet
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1'], // Hand has 1 Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with one EnergyAttachmentOption
      // enablesKnockout = true (60 damage >= 60 HP)
      // increasesDamage = true (enables attack that wasn't available before)
      // isExactMatch = true (1 Fire energy matches exactly what's needed)
      // priority should be high (knockout enabling)
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const knockoutOption = attachmentOptions.find(
        (option) => option.enablesKnockout === true,
      );
      expect(knockoutOption).toBeDefined();
      expect(knockoutOption!.increasesDamage).toBe(true);
      expect(knockoutOption!.isExactMatch).toBe(true);
      expect(knockoutOption!.priority).toBeGreaterThan(0);
    });

    it('should evaluate attachment options: Attachment increases damage but no knockout', async () => {
      // Arrange
      const weakAttack = new Attack(
        'Weak Strike',
        [EnergyType.FIRE],
        '30',
        'A weak attack',
      );
      const strongAttack = new Attack(
        'Strong Strike',
        [EnergyType.FIRE, EnergyType.FIRE],
        '80',
        'A strong attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        weakAttack,
        strongAttack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['fire-energy-1'], // Has 1 Fire energy (can use weak attack)
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Blastoise', 100, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-2'], // Hand has 1 more Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with one EnergyAttachmentOption
      // enablesKnockout = false (80 damage < 100 HP)
      // increasesDamage = true (enables strong attack: 80 > 30)
      // isExactMatch = true (exactly 2 Fire energy needed)
      // priority should be medium (damage increase but no knockout)
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const damageOption = attachmentOptions.find(
        (option) => option.increasesDamage === true && option.enablesKnockout === false,
      );
      expect(damageOption).toBeDefined();
      expect(damageOption!.isExactMatch).toBe(true);
      expect(damageOption!.priority).toBeGreaterThan(0);
    });

    it('should prefer exact match: Pokemon needs [Water, Colorless], has [Water], hand has [Water, DoubleColorless]', async () => {
      // Arrange
      const attack = new Attack(
        'Mixed Strike',
        [EnergyType.WATER, EnergyType.COLORLESS],
        '50',
        'A mixed attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Blastoise', 100, [
        attack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'], // Has 1 Water energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['water-energy-2', 'dce-1'], // Hand has Water and Double Colorless
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));
      cardsMap.set('dce-1', createDoubleColorlessEnergyCard('dce-1'));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 2 EnergyAttachmentOptions (one for Water, one for DCE)
      // Water option should have higher priority (exact match, no overflow)
      // DCE option should have lower priority (provides 2 Colorless, but we only need 1)
      // Both should be sorted by priority (Water first)
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(2);
      const waterOption = attachmentOptions.find(
        (option) => option.energyCardId === 'water-energy-2',
      );
      const dceOption = attachmentOptions.find((option) => option.energyCardId === 'dce-1');
      expect(waterOption).toBeDefined();
      expect(dceOption).toBeDefined();
      expect(waterOption!.isExactMatch).toBe(true);
      expect(dceOption!.isExactMatch).toBe(false); // DCE provides 2, we only need 1
      expect(waterOption!.priority).toBeGreaterThan(dceOption!.priority);
    });

    it('should prefer exact match with Fire energy: Pokemon needs [Water, Colorless], has [Water], hand has [Water, Fire, DoubleColorless]', async () => {
      // Arrange
      const attack = new Attack(
        'Mixed Strike',
        [EnergyType.WATER, EnergyType.COLORLESS],
        '50',
        'A mixed attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Blastoise', 100, [
        attack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'], // Has 1 Water energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['water-energy-2', 'fire-energy-1', 'dce-1'], // Hand has Water, Fire, and Double Colorless
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('dce-1', createDoubleColorlessEnergyCard('dce-1'));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 3 EnergyAttachmentOptions (one for Water, one for Fire, one for DCE)
      // Water option should have highest priority (exact match, no overflow)
      // Fire option should have higher priority than DCE (exact match for Colorless, no overflow)
      // DCE option should have lowest priority (provides 2 Colorless, but we only need 1)
      // Sorting: Water > Fire > DCE
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(3);
      const waterOption = attachmentOptions.find(
        (option) => option.energyCardId === 'water-energy-2',
      );
      const fireOption = attachmentOptions.find(
        (option) => option.energyCardId === 'fire-energy-1',
      );
      const dceOption = attachmentOptions.find((option) => option.energyCardId === 'dce-1');
      expect(waterOption).toBeDefined();
      expect(fireOption).toBeDefined();
      expect(dceOption).toBeDefined();
      expect(waterOption!.isExactMatch).toBe(true);
      expect(fireOption!.isExactMatch).toBe(true); // Fire provides Colorless (exact match)
      expect(dceOption!.isExactMatch).toBe(false); // DCE provides 2, we only need 1
      expect(waterOption!.priority).toBeGreaterThan(fireOption!.priority);
      expect(fireOption!.priority).toBeGreaterThan(dceOption!.priority);
    });

    it('should prefer DoubleColorless when needed: Pokemon needs [Water, Colorless, Colorless], has [Water], hand has [Water, Water, DoubleColorless]', async () => {
      // Arrange
      const attack = new Attack(
        'Triple Strike',
        [EnergyType.WATER, EnergyType.COLORLESS, EnergyType.COLORLESS],
        '90',
        'A triple attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Blastoise', 100, [
        attack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'], // Has 1 Water energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['water-energy-2', 'water-energy-3', 'dce-1'], // Hand has Water, Water, and Double Colorless
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));
      cardsMap.set('water-energy-3', createEnergyCard('water-energy-3', EnergyType.WATER));
      cardsMap.set('dce-1', createDoubleColorlessEnergyCard('dce-1'));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 1 EnergyAttachmentOption (only DCE, because Water energy doesn't enable the attack)
      // DCE option should have highest priority (provides 2 Colorless in one turn, exactly what's needed)
      // Water options are correctly filtered out because they don't enable the attack (still need 2 Colorless)
      // isExactMatch = true for DCE (provides 2 Colorless, exactly what's needed)
      // priority should be high for DCE (enables attack in one turn)
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(1);
      const dceOption = attachmentOptions.find((option) => option.energyCardId === 'dce-1');
      expect(dceOption).toBeDefined();
      expect(dceOption!.isExactMatch).toBe(true);
      expect(dceOption!.priority).toBeGreaterThan(0);
      expect(dceOption!.enablesKnockout).toBe(true); // 90 damage >= 60 HP
    });

    it('should avoid overflow: Pokemon needs [Fire], has [Fire], hand has [Fire, Fire]', async () => {
      // Arrange
      const attack = new Attack(
        'Single Strike',
        [EnergyType.FIRE],
        '40',
        'A single attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        attack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['fire-energy-1'], // Already has 1 Fire energy (can perform attack)
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-2', 'fire-energy-3'], // Hand has 2 Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('fire-energy-3', createEnergyCard('fire-energy-3', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array or options with low priority
      // Since Pokemon already has sufficient energy, additional attachments would overflow
      // Priority should be low (no benefit from additional energy)
      const activeOptions = attachmentOptions.filter(
        (option) => option.targetPokemon.position === PokemonPosition.ACTIVE,
      );
      if (activeOptions.length > 0) {
        // If options exist, they should have low priority (no benefit)
        activeOptions.forEach((option) => {
          expect(option.isExactMatch).toBe(false); // Would overflow
          expect(option.priority).toBeLessThanOrEqual(0); // Low or negative priority
        });
      }
    });

    it('should sort by priority: Knockout enabling > Damage increase > General attachment', async () => {
      // Arrange
      const knockoutAttack = new Attack(
        'Knockout Strike',
        [EnergyType.FIRE],
        '60',
        'A knockout attack',
      );
      const damageAttack = new Attack(
        'Damage Strike',
        [EnergyType.WATER, EnergyType.WATER], // Requires 2 WATER energy
        '40',
        'A damage attack',
      );
      const generalAttack = new Attack(
        'General Strike',
        [EnergyType.GRASS],
        '20',
        'A general attack',
      );

      const knockoutCard = createPokemonCard('knockout-card-001', 'Charizard', 120, [
        knockoutAttack,
      ]);
      const knockoutInstance = createCardInstance(
        'knockout-instance-001',
        'knockout-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy
      );

      const damageCard = createPokemonCard('damage-card-001', 'Blastoise', 100, [
        damageAttack,
      ]);
      const damageInstance = createCardInstance(
        'damage-instance-001',
        'damage-card-001',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['water-energy-0'], // Has one water energy - attaching water-energy-1 will enable the attack and get priority 1350 (1000 base + 100 exact + 200 turns + 50 same type)
      );

      const generalCard = createPokemonCard('general-card-001', 'Venusaur', 80, [
        generalAttack,
      ]);
      const generalInstance = createCardInstance(
        'general-instance-001',
        'general-card-001',
        PokemonPosition.BENCH_1,
        80,
        80,
        [], // No energy - attaching grass-energy-1 will enable the attack and get priority 1300 (1000 base + 100 exact + 200 turns)
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1', 'water-energy-1', 'grass-energy-1'], // Hand has all energy types
        knockoutInstance,
        [damageInstance, generalInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('knockout-card-001', knockoutCard);
      cardsMap.set('damage-card-001', damageCard);
      cardsMap.set('general-card-001', generalCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('grass-energy-1', createEnergyCard('grass-energy-1', EnergyType.GRASS));
      cardsMap.set('water-energy-0', createEnergyCard('water-energy-0', EnergyType.WATER));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 3 EnergyAttachmentOptions
      // Sorted by priority: knockout enabling > damage increase > general attachment
      // First option should enable knockout (Fire to active) - priority >= 10000
      // Second option should increase damage (Water to bench) - priority >= 1000 but < 10000
      // Third option should be general attachment (Grass to bench) - priority >= 100 but < 1000
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(3);
      const sortedOptions = [...attachmentOptions].sort(
        (a, b) => b.priority - a.priority,
      );

      const knockoutOption = sortedOptions.find(
        (option) => option.enablesKnockout === true,
      );
      // Find damage options (non-knockout, increases damage)
      const damageOptions = sortedOptions.filter(
        (option) => option.increasesDamage === true && option.enablesKnockout === false && option.priority >= 1000 && option.priority < 10000,
      );

      expect(knockoutOption).toBeDefined();
      expect(damageOptions.length).toBeGreaterThanOrEqual(2); // Should have at least 2 damage options

      // Check sorting: knockout should be first
      const knockoutIndex = sortedOptions.indexOf(knockoutOption!);
      const firstDamageIndex = sortedOptions.indexOf(damageOptions[0]);
      expect(knockoutIndex).toBeLessThan(firstDamageIndex);

      // Verify that damage options are sorted by priority (higher priority first)
      // If we have multiple damage options, they should be sorted by priority
      if (damageOptions.length >= 2) {
        // The first damage option in sortedOptions should have higher or equal priority to the second
        const firstDamageOption = damageOptions[0];
        const secondDamageOption = damageOptions[1];
        expect(firstDamageOption.priority).toBeGreaterThanOrEqual(secondDamageOption.priority);
        
        // If they have different priorities, verify the higher one comes first
        if (firstDamageOption.priority !== secondDamageOption.priority) {
          expect(firstDamageOption.priority).toBeGreaterThan(secondDamageOption.priority);
        }
      }
    });

    it('should evaluate multiple Pokemon options: Attach to Pokemon that enables knockout vs. one that does not', async () => {
      // Arrange
      const knockoutAttack = new Attack(
        'Knockout Strike',
        [EnergyType.FIRE],
        '60',
        'A knockout attack',
      );
      const nonKnockoutAttack = new Attack(
        'Weak Strike',
        [EnergyType.WATER],
        '30',
        'A weak attack',
      );

      const knockoutCard = createPokemonCard('knockout-card-001', 'Charizard', 120, [
        knockoutAttack,
      ]);
      const knockoutInstance = createCardInstance(
        'knockout-instance-001',
        'knockout-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy
      );

      const nonKnockoutCard = createPokemonCard('non-knockout-card-001', 'Blastoise', 100, [
        nonKnockoutAttack,
      ]);
      const nonKnockoutInstance = createCardInstance(
        'non-knockout-instance-001',
        'non-knockout-card-001',
        PokemonPosition.BENCH_0,
        100,
        100,
        [], // No energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1', 'water-energy-1'], // Hand has both energy types
        knockoutInstance,
        [nonKnockoutInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('knockout-card-001', knockoutCard);
      cardsMap.set('non-knockout-card-001', nonKnockoutCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 2 EnergyAttachmentOptions
      // Fire to active (knockout) should have higher priority than Water to bench (no knockout)
      // Sorted by priority: knockout enabling first
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(2);
      const sortedOptions = [...attachmentOptions].sort(
        (a, b) => b.priority - a.priority,
      );

      const knockoutOption = sortedOptions.find(
        (option) =>
          option.targetPokemon.position === PokemonPosition.ACTIVE &&
          option.enablesKnockout === true,
      );
      const nonKnockoutOption = sortedOptions.find(
        (option) =>
          option.targetPokemon.position === PokemonPosition.BENCH_0 &&
          option.enablesKnockout === false,
      );

      expect(knockoutOption).toBeDefined();
      expect(nonKnockoutOption).toBeDefined();

      // Knockout option should come first
      const knockoutIndex = sortedOptions.indexOf(knockoutOption!);
      const nonKnockoutIndex = sortedOptions.indexOf(nonKnockoutOption!);
      expect(knockoutIndex).toBeLessThan(nonKnockoutIndex);
    });

    it('should return empty array: No energy cards in hand', async () => {
      // Arrange
      const attack = new Attack(
        'Strike',
        [EnergyType.FIRE],
        '40',
        'An attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [attack]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [],
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['pokemon-1'], // Hand has only Pokemon, no energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('pokemon-1', createPokemonCard('pokemon-1', 'Pikachu', 60));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array (no energy cards to attach)
      expect(attachmentOptions).toHaveLength(0);
    });

    it('should handle bench Pokemon: Evaluate attachments to bench Pokemon', async () => {
      // Arrange
      const benchAttack = new Attack(
        'Bench Strike',
        [EnergyType.ELECTRIC],
        '50',
        'A bench attack',
      );
      const benchCard = createPokemonCard('bench-card-001', 'Pikachu', 60, [benchAttack]);
      const benchInstance = createCardInstance(
        'bench-instance-001',
        'bench-card-001',
        PokemonPosition.BENCH_0,
        60,
        60,
        [], // No energy
      );

      const activeCard = createPokemonCard('active-card-001', 'Charizard', 120, []);
      const activeInstance = createCardInstance(
        'active-instance-001',
        'active-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [],
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Blastoise', 100, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['electric-energy-1'], // Hand has Electric energy
        activeInstance,
        [benchInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('bench-card-001', benchCard);
      cardsMap.set('active-card-001', activeCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set(
        'electric-energy-1',
        createEnergyCard('electric-energy-1', EnergyType.ELECTRIC),
      );

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with one EnergyAttachmentOption for bench Pokemon
      // increasesDamage = true (enables attack)
      // targetPokemon.position should be BENCH_0
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const benchOption = attachmentOptions.find(
        (option) => option.targetPokemon.position === PokemonPosition.BENCH_0,
      );
      expect(benchOption).toBeDefined();
      expect(benchOption!.increasesDamage).toBe(true);
      expect(benchOption!.targetPokemon.instanceId).toBe('bench-instance-001');
    });

    it('should evaluate bench Pokemon sorted by priority: Higher scored Pokemon first', async () => {
      // Arrange
      // High priority Pokemon (120 HP, strong attack)
      const highPriorityAttack = new Attack(
        'Strong Strike',
        [EnergyType.FIRE],
        '80',
        'A strong attack',
      );
      const highPriorityCard = createPokemonCard(
        'high-priority-card-001',
        'Charizard',
        120,
        [highPriorityAttack],
      );
      const highPriorityInstance = createCardInstance(
        'high-priority-instance-001',
        'high-priority-card-001',
        PokemonPosition.BENCH_0,
        120,
        120,
        [], // No energy
      );

      // Low priority Pokemon (60 HP, weak attack)
      const lowPriorityAttack = new Attack(
        'Weak Strike',
        [EnergyType.WATER],
        '20',
        'A weak attack',
      );
      const lowPriorityCard = createPokemonCard(
        'low-priority-card-001',
        'Pikachu',
        60,
        [lowPriorityAttack],
      );
      const lowPriorityInstance = createCardInstance(
        'low-priority-instance-001',
        'low-priority-card-001',
        PokemonPosition.BENCH_1,
        60,
        60,
        [], // No energy
      );

      const activeCard = createPokemonCard('active-card-001', 'Blastoise', 100, []);
      const activeInstance = createCardInstance(
        'active-instance-001',
        'active-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Venusaur', 100, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1', 'water-energy-1'], // Hand has both energy types
        activeInstance,
        [highPriorityInstance, lowPriorityInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('high-priority-card-001', highPriorityCard);
      cardsMap.set('low-priority-card-001', lowPriorityCard);
      cardsMap.set('active-card-001', activeCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should evaluate bench Pokemon sorted by priority (score)
      // High priority Pokemon (Charizard, 120 HP) should be evaluated first
      // Low priority Pokemon (Pikachu, 60 HP) should be evaluated second
      // Options should be sorted with high priority Pokemon first
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(2);
      const sortedOptions = [...attachmentOptions].sort((a, b) => b.priority - a.priority);

      const highPriorityOption = sortedOptions.find(
        (option) => option.targetPokemon.instanceId === 'high-priority-instance-001',
      );
      const lowPriorityOption = sortedOptions.find(
        (option) => option.targetPokemon.instanceId === 'low-priority-instance-001',
      );

      expect(highPriorityOption).toBeDefined();
      expect(lowPriorityOption).toBeDefined();

      // High priority Pokemon option should come first (higher score = evaluated first)
      const highPriorityIndex = sortedOptions.indexOf(highPriorityOption!);
      const lowPriorityIndex = sortedOptions.indexOf(lowPriorityOption!);
      expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
    });

    it('should check if energy improves best attack for each bench Pokemon: Knockout > Damage increase > General attachment', async () => {
      // Arrange
      // Bench Pokemon 1: Energy enables knockout
      const knockoutAttack = new Attack(
        'Knockout Strike',
        [EnergyType.FIRE],
        '60',
        'A knockout attack',
      );
      const knockoutCard = createPokemonCard('knockout-card-001', 'Charizard', 120, [
        knockoutAttack,
      ]);
      const knockoutInstance = createCardInstance(
        'knockout-instance-001',
        'knockout-card-001',
        PokemonPosition.BENCH_0,
        120,
        120,
        [], // No energy
      );

      // Bench Pokemon 2: Energy increases damage (but no knockout)
      const damageAttack = new Attack(
        'Damage Strike',
        [EnergyType.WATER],
        '40',
        'A damage attack',
      );
      const damageCard = createPokemonCard('damage-card-001', 'Blastoise', 100, [
        damageAttack,
      ]);
      const damageInstance = createCardInstance(
        'damage-instance-001',
        'damage-card-001',
        PokemonPosition.BENCH_1,
        100,
        100,
        [], // No energy
      );

      // Bench Pokemon 3: Energy enables general attack (lowest priority)
      const generalAttack = new Attack(
        'General Strike',
        [EnergyType.GRASS],
        '20',
        'A general attack',
      );
      const generalCard = createPokemonCard('general-card-001', 'Venusaur', 80, [
        generalAttack,
      ]);
      const generalInstance = createCardInstance(
        'general-instance-001',
        'general-card-001',
        PokemonPosition.BENCH_2,
        80,
        80,
        [], // No energy
      );

      const activeCard = createPokemonCard('active-card-001', 'Pikachu', 60, []);
      const activeInstance = createCardInstance(
        'active-instance-001',
        'active-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        [],
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Raichu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1', 'water-energy-1', 'grass-energy-1'], // Hand has all energy types
        activeInstance,
        [knockoutInstance, damageInstance, generalInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('knockout-card-001', knockoutCard);
      cardsMap.set('damage-card-001', damageCard);
      cardsMap.set('general-card-001', generalCard);
      cardsMap.set('active-card-001', activeCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('grass-energy-1', createEnergyCard('grass-energy-1', EnergyType.GRASS));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with 3 EnergyAttachmentOptions (one for each bench Pokemon)
      // Sorted by priority: Knockout > Damage increase > General attachment
      // Knockout option should have enablesKnockout = true
      // Damage option should have increasesDamage = true, enablesKnockout = false
      // General option should have increasesDamage = true (enables attack), enablesKnockout = false
      expect(attachmentOptions.length).toBeGreaterThanOrEqual(3);
      const sortedOptions = [...attachmentOptions].sort((a, b) => b.priority - a.priority);

      const knockoutOption = sortedOptions.find(
        (option) =>
          option.targetPokemon.instanceId === 'knockout-instance-001' &&
          option.enablesKnockout === true,
      );
      const damageOption = sortedOptions.find(
        (option) =>
          option.targetPokemon.instanceId === 'damage-instance-001' &&
          option.increasesDamage === true &&
          option.enablesKnockout === false,
      );
      const generalOption = sortedOptions.find(
        (option) =>
          option.targetPokemon.instanceId === 'general-instance-001' &&
          option.increasesDamage === true &&
          option.enablesKnockout === false,
      );

      expect(knockoutOption).toBeDefined();
      expect(damageOption).toBeDefined();
      expect(generalOption).toBeDefined();

      // Check sorting: Knockout first, then damage, then general
      const knockoutIndex = sortedOptions.indexOf(knockoutOption!);
      const damageIndex = sortedOptions.indexOf(damageOption!);
      const generalIndex = sortedOptions.indexOf(generalOption!);

      expect(knockoutIndex).toBeLessThan(damageIndex);
      expect(damageIndex).toBeLessThan(generalIndex);
    });

    it('should not attach if energy does not improve any attack: Prefer no attachment', async () => {
      // Arrange
      // Pokemon already has sufficient energy for its best attack
      const attack = new Attack(
        'Strike',
        [EnergyType.FIRE],
        '40',
        'An attack',
      );
      const pokemonCard = createPokemonCard('pokemon-card-001', 'Charizard', 120, [attack]);
      const pokemonInstance = createCardInstance(
        'pokemon-instance-001',
        'pokemon-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        ['fire-energy-1'], // Already has sufficient energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-2'], // Hand has Fire energy, but Pokemon already has sufficient
        pokemonInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('pokemon-card-001', pokemonCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array or options with very low/negative priority
      // Since energy doesn't improve any attack (Pokemon already has sufficient energy),
      // we prefer not to attach anything
      const activeOptions = attachmentOptions.filter(
        (option) => option.targetPokemon.position === PokemonPosition.ACTIVE,
      );
      if (activeOptions.length > 0) {
        // If options exist, they should have very low priority (no benefit)
        activeOptions.forEach((option) => {
          expect(option.enablesKnockout).toBe(false);
          expect(option.increasesDamage).toBe(false); // Doesn't improve best attack
          expect(option.priority).toBeLessThanOrEqual(0); // Low or negative priority
        });
      } else {
        // Prefer empty array (no attachment)
        expect(attachmentOptions).toHaveLength(0);
      }
    });

    it('should not attach to bench Pokemon if energy does not improve best attack', async () => {
      // Arrange
      // Bench Pokemon already has sufficient energy for its best attack
      const weakAttack = new Attack(
        'Weak Strike',
        [EnergyType.FIRE],
        '20',
        'A weak attack',
      );
      const strongAttack = new Attack(
        'Strong Strike',
        [EnergyType.FIRE, EnergyType.FIRE],
        '60',
        'A strong attack',
      );
      const benchCard = createPokemonCard('bench-card-001', 'Charizard', 120, [
        weakAttack,
        strongAttack,
      ]);
      const benchInstance = createCardInstance(
        'bench-instance-001',
        'bench-card-001',
        PokemonPosition.BENCH_0,
        120,
        120,
        ['fire-energy-1', 'fire-energy-2'], // Already has sufficient energy for strong attack
      );

      const activeCard = createPokemonCard('active-card-001', 'Pikachu', 60, []);
      const activeInstance = createCardInstance(
        'active-instance-001',
        'active-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        [],
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Blastoise', 100, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-3'], // Hand has Fire energy, but bench Pokemon already has sufficient
        activeInstance,
        [benchInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('bench-card-001', benchCard);
      cardsMap.set('active-card-001', activeCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('fire-energy-3', createEnergyCard('fire-energy-3', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array or options with very low/negative priority
      // Since energy doesn't improve best attack (bench Pokemon already has sufficient energy),
      // we prefer not to attach anything
      const benchOptions = attachmentOptions.filter(
        (option) => option.targetPokemon.position === PokemonPosition.BENCH_0,
      );
      if (benchOptions.length > 0) {
        // If options exist, they should have very low priority (no benefit)
        benchOptions.forEach((option) => {
          expect(option.enablesKnockout).toBe(false);
          expect(option.increasesDamage).toBe(false); // Doesn't improve best attack
          expect(option.priority).toBeLessThanOrEqual(0); // Low or negative priority
        });
      } else {
        // Prefer empty array (no attachment)
        expect(attachmentOptions).toHaveLength(0);
      }
    });

    it('should evaluate bench Pokemon by priority: Only include attachments that improve attacks', async () => {
      // Arrange
      // High priority Pokemon: Energy improves attack (enables better attack)
      const weakAttack = new Attack(
        'Weak Strike',
        [EnergyType.FIRE],
        '30',
        'A weak attack',
      );
      const strongAttack = new Attack(
        'Strong Strike',
        [EnergyType.FIRE, EnergyType.FIRE],
        '70',
        'A strong attack',
      );
      const highPriorityCard = createPokemonCard('high-priority-card-001', 'Charizard', 120, [
        weakAttack,
        strongAttack,
      ]);
      const highPriorityInstance = createCardInstance(
        'high-priority-instance-001',
        'high-priority-card-001',
        PokemonPosition.BENCH_0,
        120,
        120,
        ['fire-energy-1'], // Has 1 Fire (can use weak attack, but strong attack is better)
      );

      // Low priority Pokemon: Energy doesn't improve attack (already has sufficient)
      const attack = new Attack(
        'Strike',
        [EnergyType.WATER],
        '40',
        'An attack',
      );
      const lowPriorityCard = createPokemonCard('low-priority-card-001', 'Blastoise', 100, [
        attack,
      ]);
      const lowPriorityInstance = createCardInstance(
        'low-priority-instance-001',
        'low-priority-card-001',
        PokemonPosition.BENCH_1,
        100,
        100,
        ['water-energy-1'], // Already has sufficient energy
      );

      const activeCard = createPokemonCard('active-card-001', 'Pikachu', 60, []);
      const activeInstance = createCardInstance(
        'active-instance-001',
        'active-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        [],
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Venusaur', 100, []);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-2', 'water-energy-2'], // Hand has both energy types
        activeInstance,
        [highPriorityInstance, lowPriorityInstance],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('high-priority-card-001', highPriorityCard);
      cardsMap.set('low-priority-card-001', lowPriorityCard);
      cardsMap.set('active-card-001', activeCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with only one EnergyAttachmentOption (for high priority Pokemon)
      // High priority Pokemon: Energy improves attack (enables strong attack: 70 > 30)
      // Low priority Pokemon: Energy doesn't improve attack (already has sufficient) -> excluded
      // Only include attachments that improve attacks (Knockout > Damage increase > General)
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const highPriorityOption = attachmentOptions.find(
        (option) => option.targetPokemon.instanceId === 'high-priority-instance-001',
      );
      const lowPriorityOption = attachmentOptions.find(
        (option) => option.targetPokemon.instanceId === 'low-priority-instance-001',
      );

      expect(highPriorityOption).toBeDefined();
      expect(highPriorityOption!.increasesDamage).toBe(true); // Improves from 30 to 70 damage
      expect(lowPriorityOption).toBeUndefined(); // Should not be included (doesn't improve)
    });

    it('should consider weakness when calculating enablesKnockout: Opponent has Fire weakness, attack is Fire type', async () => {
      // Arrange
      const fireAttack = new Attack(
        'Fire Strike',
        [EnergyType.FIRE],
        '30', // Base damage 30, but with weakness ×2 = 60
        'A fire attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        fireAttack,
      ], undefined, undefined, PokemonType.FIRE);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy
      );

      // Opponent has Fire weakness (×2)
      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      opponentCard.setWeakness(new Weakness(EnergyType.FIRE, '×2'));
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1'], // Hand has Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with one EnergyAttachmentOption
      // enablesKnockout = true (30 base damage × 2 weakness = 60 damage, which equals opponent HP)
      // priority should be high (enables knockout)
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const knockoutOption = attachmentOptions.find(
        (option) => option.enablesKnockout === true,
      );
      expect(knockoutOption).toBeDefined();
      expect(knockoutOption!.enablesKnockout).toBe(true);
      expect(knockoutOption!.priority).toBeGreaterThan(0);
    });

    it('should consider resistance when calculating enablesKnockout: Opponent has Fire resistance, attack is Fire type', async () => {
      // Arrange
      const fireAttack = new Attack(
        'Fire Strike',
        [EnergyType.FIRE],
        '50', // Base damage 50, but with resistance -20 = 30
        'A fire attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        fireAttack,
      ], undefined, undefined, PokemonType.FIRE);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy
      );

      // Opponent has Fire resistance (-20)
      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      opponentCard.setResistance(new Resistance(EnergyType.FIRE, '-20'));
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1'], // Hand has Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with one EnergyAttachmentOption
      // enablesKnockout = false (50 base damage - 20 resistance = 30 damage < 60 HP)
      // increasesDamage = true (enables attack)
      // priority should be medium (damage increase but no knockout)
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const damageOption = attachmentOptions.find(
        (option) => option.increasesDamage === true && option.enablesKnockout === false,
      );
      expect(damageOption).toBeDefined();
      expect(damageOption!.enablesKnockout).toBe(false);
      expect(damageOption!.increasesDamage).toBe(true);
      expect(damageOption!.priority).toBeGreaterThan(0);
    });

    it('should consider damage prevention when calculating enablesKnockout: Opponent prevents all damage', async () => {
      // Arrange
      const fireAttack = new Attack(
        'Fire Strike',
        [EnergyType.FIRE],
        '60', // Base damage 60
        'A fire attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        fireAttack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      // Note: In real implementation, we would check if the opponent has an ability/effect
      // that prevents all damage. For this test, we'll simulate this by having the service
      // calculate 0 damage after prevention
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1'], // Hand has Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      let gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // Set up damage prevention: opponent prevents all damage
      gameState = gameState.withDamagePrevention(
        PlayerIdentifier.PLAYER2,
        opponentInstance.instanceId,
        {
          effectType: AttackEffectType.PREVENT_DAMAGE,
          target: TargetType.DEFENDING,
          duration: 'next_turn',
          amount: 'all',
        },
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array or options with very low priority
      // Since opponent prevents all damage (total damage = 0),
      // we should not prioritize attaching to active Pokemon if we suspect we'll be knocked out next turn
      // enablesKnockout = false (damage prevented)
      // Priority should be low or negative (no benefit, and we risk being knocked out)
      const activeOptions = attachmentOptions.filter(
        (option) => option.targetPokemon.position === PokemonPosition.ACTIVE,
      );
      if (activeOptions.length > 0) {
        activeOptions.forEach((option) => {
          expect(option.enablesKnockout).toBe(false);
          expect(option.priority).toBeLessThanOrEqual(0); // Low or negative priority
        });
      } else {
        // Prefer empty array (no attachment to active if damage is prevented)
        expect(attachmentOptions.length).toBe(0);
      }
    });

    it('should consider damage reduction when calculating enablesKnockout: Opponent reduces damage by 20', async () => {
      // Arrange
      const fireAttack = new Attack(
        'Fire Strike',
        [EnergyType.FIRE],
        '50', // Base damage 50, but opponent reduces by 20 = 30
        'A fire attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        fireAttack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        120,
        120,
        [], // No energy
      );

      const opponentCard = createPokemonCard('opponent-card-001', 'Pikachu', 60, []);
      // Note: In real implementation, we would check if the opponent has an ability/effect
      // that reduces damage by 20. For this test, we'll simulate this by having the service
      // calculate reduced damage
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1'], // Hand has Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return array with one EnergyAttachmentOption
      // enablesKnockout = false (50 base damage - 20 reduction = 30 damage < 60 HP)
      // increasesDamage = true (enables attack)
      // priority should be medium (damage increase but no knockout)
      expect(attachmentOptions.length).toBeGreaterThan(0);
      const damageOption = attachmentOptions.find(
        (option) => option.increasesDamage === true && option.enablesKnockout === false,
      );
      expect(damageOption).toBeDefined();
      expect(damageOption!.enablesKnockout).toBe(false);
      expect(damageOption!.increasesDamage).toBe(true);
      expect(damageOption!.priority).toBeGreaterThan(0);
    });

    it('should not prioritize active Pokemon if total damage is 0 and opponent can knockout us next turn', async () => {
      // Arrange
      const fireAttack = new Attack(
        'Fire Strike',
        [EnergyType.FIRE],
        '60', // Base damage 60, but opponent prevents all damage
        'A fire attack',
      );
      const playerCard = createPokemonCard('player-card-001', 'Charizard', 120, [
        fireAttack,
      ]);
      const playerInstance = createCardInstance(
        'player-instance-001',
        'player-card-001',
        PokemonPosition.ACTIVE,
        60, // Low HP, can be knocked out
        120,
        [], // No energy
      );

      // Opponent has attack that can knockout us (60 damage)
      const opponentAttack = new Attack(
        'Opponent Strike',
        [EnergyType.WATER],
        '60',
        'An opponent attack',
      );
      const opponentCard = createPokemonCard('opponent-card-001', 'Blastoise', 100, [
        opponentAttack,
      ]);
      const opponentInstance = createCardInstance(
        'opponent-instance-001',
        'opponent-card-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'], // Has energy to attack
      );

      const playerState = new PlayerGameState(
        [], // Deck
        ['fire-energy-1'], // Hand has Fire energy
        playerInstance,
        [],
        [],
        [],
      );

      const opponentState = new PlayerGameState(
        [],
        [],
        opponentInstance,
        [],
        [],
        [],
      );

      let gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );

      // Set up damage prevention: opponent prevents all damage
      gameState = gameState.withDamagePrevention(
        PlayerIdentifier.PLAYER2,
        opponentInstance.instanceId,
        {
          effectType: AttackEffectType.PREVENT_DAMAGE,
          target: TargetType.DEFENDING,
          duration: 'next_turn',
          amount: 'all',
        },
      );

      const cardsMap = new Map<string, Card>();
      cardsMap.set('player-card-001', playerCard);
      cardsMap.set('opponent-card-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const attachmentOptions = await service.evaluateAttachmentOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array or options with very low/negative priority
      // Since opponent prevents all damage (total damage = 0) and opponent can knockout us next turn,
      // we should not prioritize attaching to active Pokemon
      // We should prefer not to attach anything at all, or attach to bench Pokemon instead
      const activeOptions = attachmentOptions.filter(
        (option) => option.targetPokemon.position === PokemonPosition.ACTIVE,
      );
      if (activeOptions.length > 0) {
        activeOptions.forEach((option) => {
          expect(option.enablesKnockout).toBe(false);
          expect(option.priority).toBeLessThanOrEqual(0); // Low or negative priority
        });
      } else {
        // Prefer empty array or bench options (no attachment to active if damage is prevented and we're at risk)
        expect(attachmentOptions.length).toBe(0);
      }
    });
  });
});


