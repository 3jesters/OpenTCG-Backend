import { Test, TestingModule } from '@nestjs/testing';
import { AbilityEffectValidatorService } from './ability-effect-validator.service';
import { Ability } from '../../../card/domain/value-objects/ability.value-object';
import { AbilityActivationType } from '../../../card/domain/enums/ability-activation-type.enum';
import { UsageLimit } from '../../../card/domain/enums/usage-limit.enum';
import { AbilityEffectFactory } from '../../../card/domain/value-objects/ability-effect.value-object';
import { AbilityEffectType } from '../../../card/domain/enums/ability-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { EnergySource } from '../../../card/domain/enums/energy-source.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { EnergyType } from '../../../card/domain/enums/energy-type.enum';
import { GameState } from '../value-objects/game-state.value-object';
import { PlayerGameState } from '../value-objects/player-game-state.value-object';
import { PlayerIdentifier } from '../enums/player-identifier.enum';
import { TurnPhase } from '../enums/turn-phase.enum';
import { CardInstance } from '../value-objects/card-instance.value-object';
import { StatusEffect } from '../enums/status-effect.enum';
import { PokemonPosition } from '../enums/pokemon-position.enum';
import { AbilityActionData } from '../types/ability-action-data.types';
import { GetCardByIdUseCase } from '../../../card/application/use-cases/get-card-by-id.use-case';
import { Card } from '../../../card/domain/entities/card.entity';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { Destination } from '../../../card/domain/enums/destination.enum';
import { Duration } from '../../../card/domain/enums/duration.enum';

describe('AbilityEffectValidatorService', () => {
  let service: AbilityEffectValidatorService;

  let mockGetCardByIdUseCase: jest.Mocked<GetCardByIdUseCase>;

  beforeEach(async () => {
    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbilityEffectValidatorService,
        {
          provide: GetCardByIdUseCase,
          useValue: mockGetCardByIdUseCase,
        },
      ],
    }).compile();

    service = module.get<AbilityEffectValidatorService>(
      AbilityEffectValidatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAbilityUsage - Real Pokemon Cards', () => {
    const createGameState = (
      activePokemon: CardInstance | null = null,
      bench: CardInstance[] = [],
      hand: string[] = [],
      abilityUsageThisTurn: Map<PlayerIdentifier, Set<string>> = new Map(),
    ): GameState => {
      const player1State = new PlayerGameState(hand, [], activePokemon, bench, [], [], []);
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
        abilityUsageThisTurn,
      );
    };

    const createPokemon = (
      cardId: string,
      statusEffect: StatusEffect = StatusEffect.NONE,
    ): CardInstance => {
      return new CardInstance(
        'instance-1', // instanceId
        cardId, // cardId
        PokemonPosition.ACTIVE, // position
        100, // currentHp
        100, // maxHp
        [], // attachedEnergy
        statusEffect, // statusEffect
        0, // damageCounters
        [], // evolutionChain
      );
    };

    describe('Blastoise - Rain Dance (ACTIVATED, UNLIMITED)', () => {
      const cardId = 'pokemon-base-set-v1.0-blastoise--2';
      const ability = new Ability(
        'Rain Dance',
        'As often as you like during your turn (before your attack), you may attach as many Water Energy cards as you like from your hand to 1 or more of your Water Pokémon. This power can\'t be used if Blastoise is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.ALL_YOURS,
            EnergySource.HAND,
            1,
            EnergyType.WATER,
            {
              targetPokemonType: PokemonType.WATER,
            },
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-water-energy--103'],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Card entities for validation
        const blastoiseCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '009',
          'Blastoise',
          'base-set',
          '2',
          Rarity.RARE_HOLO,
          'A brutal Pokémon',
          'Ken Sugimori',
          '',
        );
        blastoiseCard.setPokemonType(PokemonType.WATER);

        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          'pokemon-base-set-v1.0-water-energy--103',
          'N/A', // Energy cards don't have pokemon numbers, but field is required
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard.setEnergyType(EnergyType.WATER);

        // Verify card types
        expect(blastoiseCard.cardType).toBe(CardType.POKEMON);
        expect(waterEnergyCard.cardType).toBe(CardType.ENERGY);
        expect(waterEnergyCard.energyType).toBe(EnergyType.WATER);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(waterEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(blastoiseCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        if (!result.isValid) {
          console.log('Blastoise validation errors:', result.errors);
        }
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject if Pokemon is Asleep', async () => {
        const pokemon = createPokemon(cardId, StatusEffect.ASLEEP);
        const gameState = createGameState(pokemon);
        
        // Verify pokemon status is set correctly
        expect(pokemon.statusEffect).toBe(StatusEffect.ASLEEP);
        
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        // Mock not needed - status check returns early
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Rain Dance" cannot be used because Pokemon is ASLEEP',
        );
      });

      it('should reject if Pokemon is Confused', async () => {
        const pokemon = createPokemon(cardId, StatusEffect.CONFUSED);
        const gameState = createGameState(pokemon);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        // Mock not needed - status check returns early
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Rain Dance" cannot be used because Pokemon is CONFUSED',
        );
      });

      it('should reject if Pokemon is Paralyzed', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId, StatusEffect.PARALYZED);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        // Mock not needed - status check returns early
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Rain Dance" cannot be used because Pokemon is PARALYZED',
        );
      });

      it('should allow multiple uses per turn (UNLIMITED)', async () => {
        const usageMap = new Map<PlayerIdentifier, Set<string>>();
        usageMap.set(PlayerIdentifier.PLAYER1, new Set([cardId]));
        const pokemon = createPokemon(cardId);
        const gameState = createGameState(pokemon, [], [], usageMap);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-water-energy--103'],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Card entities
        const blastoiseCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '009',
          'Blastoise',
          'base-set',
          '2',
          Rarity.RARE_HOLO,
          'A brutal Pokémon',
          'Ken Sugimori',
          '',
        );
        blastoiseCard.setPokemonType(PokemonType.WATER);

        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          'pokemon-base-set-v1.0-water-energy--103',
          'N/A', // Energy cards don't have pokemon numbers, but field is required
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard.setEnergyType(EnergyType.WATER);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(waterEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(blastoiseCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Gengar - Curse (ACTIVATED, ONCE_PER_TURN)', () => {
      const cardId = 'pokemon-fossil-v1.0-gengar--20';
      const ability = new Ability(
        'Curse',
        'Once during your turn (before your attack), you may move 1 damage counter from 1 of your opponent\'s Pokémon to another (even if it would Knock Out the other Pokémon). This power can\'t be used if Gengar is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.heal(
            TargetType.SELF,
            10,
          ),
        ],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject second use in same turn', async () => {
        const usageMap = new Map<PlayerIdentifier, Set<string>>();
        usageMap.set(PlayerIdentifier.PLAYER1, new Set([cardId]));
        const pokemon = createPokemon(cardId);
        const gameState = createGameState(pokemon, [], [], usageMap);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Curse" can only be used once per turn',
        );
      });

      it('should reject if Pokemon is Asleep', async () => {
        const pokemon = createPokemon(cardId, StatusEffect.ASLEEP);
        const gameState = createGameState(pokemon);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Curse" cannot be used because Pokemon is ASLEEP',
        );
      });
    });

    describe('Charizard - Energy Burn (ACTIVATED, UNLIMITED)', () => {
      const cardId = 'pokemon-base-set-v1.0-charizard--4';
      const ability = new Ability(
        'Energy Burn',
        'As often as you like during your turn (before your attack), you may take 1 Fire Energy card attached to Charizard and attach it to 1 of your other Pokémon. This power can\'t be used if Charizard is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.BENCHED_YOURS,
            EnergySource.SELF,
            1,
            EnergyType.FIRE,
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-fire-energy--99'],
          targetPokemon: PokemonPosition.BENCH_0,
        };

        // Mock Card entities for validation
        const benchPokemonCard = Card.createPokemonCard(
          'instance-2',
          'pokemon-base-set-v1.0-pikachu--60',
          '025',
          'Pikachu',
          'base-set',
          '60',
          Rarity.COMMON,
          'Mouse Pokémon',
          'Ken Sugimori',
          '',
        );
        benchPokemonCard.setPokemonType(PokemonType.ELECTRIC);

        const fireEnergyCard = Card.createEnergyCard(
          'energy-1',
          'pokemon-base-set-v1.0-fire-energy--99',
          'N/A',
          'Fire Energy',
          'base-set',
          '99',
          Rarity.COMMON,
          'Basic Fire Energy',
          '',
          '',
        );
        fireEnergyCard.setEnergyType(EnergyType.FIRE);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(fireEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(benchPokemonCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow multiple uses per turn', async () => {
        const usageMap = new Map<PlayerIdentifier, Set<string>>();
        usageMap.set(PlayerIdentifier.PLAYER1, new Set([cardId]));
        const pokemon = createPokemon(cardId);
        const gameState = createGameState(pokemon, [], [], usageMap);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-fire-energy--99'],
          targetPokemon: PokemonPosition.BENCH_0,
        };

        // Mock Card entities
        const benchPokemonCard = Card.createPokemonCard(
          'instance-2',
          'pokemon-base-set-v1.0-pikachu--60',
          '025',
          'Pikachu',
          'base-set',
          '60',
          Rarity.COMMON,
          'Mouse Pokémon',
          'Ken Sugimori',
          '',
        );
        benchPokemonCard.setPokemonType(PokemonType.ELECTRIC);

        const fireEnergyCard = Card.createEnergyCard(
          'energy-1',
          'pokemon-base-set-v1.0-fire-energy--99',
          'N/A',
          'Fire Energy',
          'base-set',
          '99',
          Rarity.COMMON,
          'Basic Fire Energy',
          '',
          '',
        );
        fireEnergyCard.setEnergyType(EnergyType.FIRE);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(fireEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(benchPokemonCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Hypno - Prophecy (ACTIVATED, ONCE_PER_TURN)', () => {
      const cardId = 'pokemon-fossil-v1.0-hypno--22';
      const ability = new Ability(
        'Prophecy',
        'Once during your turn (before your attack), you may look at up to 3 cards from the top of either player\'s deck and rearrange them as you like. This power can\'t be used if Hypno is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.searchDeck(3, Destination.HAND),
        ],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['card-1', 'card-2'],
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject second use in same turn', async () => {
        const usageMap = new Map<PlayerIdentifier, Set<string>>();
        usageMap.set(PlayerIdentifier.PLAYER1, new Set([cardId]));
        const pokemon = createPokemon(cardId);
        const gameState = createGameState(pokemon, [], [], usageMap);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['card-1'],
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Prophecy" can only be used once per turn',
        );
      });
    });

    describe('Alakazam - Damage Swap (ACTIVATED, UNLIMITED)', () => {
      const cardId = 'pokemon-base-set-v1.0-alakazam--1';
      const ability = new Ability(
        'Damage Swap',
        'As often as you like during your turn (before your attack), you may move 1 damage counter from 1 of your Pokémon to another as long as you don\'t Knock Out that Pokémon. This power can\'t be used if Alakazam is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.heal(TargetType.SELF, 10),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow multiple uses per turn', async () => {
        const usageMap = new Map<PlayerIdentifier, Set<string>>();
        usageMap.set(PlayerIdentifier.PLAYER1, new Set([cardId]));
        const pokemon = createPokemon(cardId);
        const gameState = createGameState(pokemon, [], [], usageMap);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        // Mock not needed for usage limit validation
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Electrode - Buzzap (ACTIVATED, UNLIMITED)', () => {
      const cardId = 'pokemon-base-set-v1.0-electrode--21';
      const ability = new Ability(
        'Buzzap',
        'As often as you like during your turn (before your attack), you may take 1 Energy card attached to 1 of your Pokémon and attach it to Electrode. This power can\'t be used if Electrode is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.SELF,
            EnergySource.SELF,
            1,
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-lightning-energy--101'],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Card entities - no type restrictions for Electrode
        const electrodeCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '101',
          'Electrode',
          'base-set',
          '21',
          Rarity.RARE_HOLO,
          'Ball Pokémon',
          'Ken Sugimori',
          '',
        );
        electrodeCard.setPokemonType(PokemonType.ELECTRIC);

        const lightningEnergyCard = Card.createEnergyCard(
          'energy-1',
          'pokemon-base-set-v1.0-lightning-energy--101',
          'N/A',
          'Lightning Energy',
          'base-set',
          '101',
          Rarity.COMMON,
          'Basic Lightning Energy',
          '',
          '',
        );
        lightningEnergyCard.setEnergyType(EnergyType.ELECTRIC);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(lightningEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(electrodeCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Venusaur - Energy Trans (ACTIVATED, UNLIMITED)', () => {
      const cardId = 'pokemon-base-set-v1.0-venusaur--15';
      const ability = new Ability(
        'Energy Trans',
        'As often as you like during your turn (before your attack), you may take 1 Grass Energy card attached to 1 of your Pokémon and attach it to a different one. This power can\'t be used if Venusaur is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.BENCHED_YOURS,
            EnergySource.SELF,
            1,
            EnergyType.GRASS,
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-grass-energy--98'],
          targetPokemon: PokemonPosition.BENCH_0,
        };

        // Mock Card entities
        const benchPokemonCard = Card.createPokemonCard(
          'instance-2',
          'pokemon-base-set-v1.0-pikachu--60',
          '025',
          'Pikachu',
          'base-set',
          '60',
          Rarity.COMMON,
          'Mouse Pokémon',
          'Ken Sugimori',
          '',
        );
        benchPokemonCard.setPokemonType(PokemonType.ELECTRIC);

        const grassEnergyCard = Card.createEnergyCard(
          'energy-1',
          'pokemon-base-set-v1.0-grass-energy--98',
          'N/A',
          'Grass Energy',
          'base-set',
          '98',
          Rarity.COMMON,
          'Basic Grass Energy',
          '',
          '',
        );
        grassEnergyCard.setEnergyType(EnergyType.GRASS);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(grassEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(benchPokemonCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Slowbro - Strange Behavior (ACTIVATED, ONCE_PER_TURN)', () => {
      const cardId = 'pokemon-fossil-v1.0-slowbro--43';
      const ability = new Ability(
        'Strange Behavior',
        'Once during your turn (before your attack), you may move 1 damage counter from Slowbro to 1 of your opponent\'s Pokémon. This power can\'t be used if Slowbro is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.heal(
            TargetType.SELF,
            10,
          ),
        ],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      it('should validate successful usage', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        // Mock not needed for HEAL with SELF target
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject second use in same turn', async () => {
        const usageMap = new Map<PlayerIdentifier, Set<string>>();
        usageMap.set(PlayerIdentifier.PLAYER1, new Set([cardId]));
        const pokemon = createPokemon(cardId);
        const gameState = createGameState(pokemon, [], [], usageMap);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Strange Behavior" can only be used once per turn',
        );
      });
    });

    describe('PASSIVE abilities should be rejected', () => {
      it('should reject Machamp - Strikes Back (PASSIVE)', async () => {
        const cardId = 'pokemon-base-set-v1.0-machamp--8';
        const ability = new Ability(
          'Strikes Back',
          'Whenever your opponent\'s attack damages Machamp (even if Machamp is Knocked Out), this power does 10 damage to the attacking Pokémon. (Don\'t apply Weakness and Resistance.)',
          AbilityActivationType.PASSIVE,
          [
            AbilityEffectFactory.reduceDamage(
              TargetType.SELF,
              10,
            ),
          ],
        );

        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Strikes Back" is PASSIVE and cannot be used via USE_ABILITY action',
        );
      });

      it('should reject Mr. Mime - Invisible Wall (PASSIVE)', async () => {
        const cardId = 'pokemon-jungle-v1.0-mr-mime--22';
        const ability = new Ability(
          'Invisible Wall',
          'Whenever an attack (even your own) does damage to Mr. Mime (after applying Weakness and Resistance), prevent all effects of that attack, including damage, done to Mr. Mime. (Any other effects of attacks still happen.)',
          AbilityActivationType.PASSIVE,
          [
            AbilityEffectFactory.preventDamage(
              TargetType.SELF,
              Duration.PERMANENT,
              'all',
            ),
          ],
        );

        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Ability "Invisible Wall" is PASSIVE and cannot be used via USE_ABILITY action',
        );
      });
    });

    describe('Missing required fields', () => {
      it('should reject missing cardId', async () => {
        const ability = new Ability(
          'Test Ability',
          'Test',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.drawCards(1)],
          undefined,
          UsageLimit.UNLIMITED,
        );

        const gameState = createGameState();
        const pokemon = createPokemon('test-card');
        const actionData: any = {
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('cardId is required');
      });

      it('should reject missing target', async () => {
        const ability = new Ability(
          'Test Ability',
          'Test',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.drawCards(1)],
          undefined,
          UsageLimit.UNLIMITED,
        );

        const gameState = createGameState();
        const pokemon = createPokemon('test-card');
        const actionData: any = {
          cardId: 'test-card',
        };

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('target is required');
      });
    });

    describe('Missing ability', () => {
      it('should reject if Pokemon has no ability', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon('test-card');
        const actionData: AbilityActionData = {
          cardId: 'test-card',
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.validateAbilityUsage(
          null as any,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Pokemon must have an ability');
      });
    });

    describe('Energy and Pokemon Type Restrictions - Blastoise Rain Dance', () => {
      const cardId = 'pokemon-base-set-v1.0-blastoise--2';
      const ability = new Ability(
        'Rain Dance',
        'As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon. This power can\'t be used if Blastoise is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.ALL_YOURS,
            EnergySource.HAND,
            1,
            EnergyType.WATER,
            {
              targetPokemonType: PokemonType.WATER,
            },
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate Water Energy to Water Pokemon (positive)', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const waterEnergy = 'pokemon-base-set-v1.0-water-energy--103';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Water Pokemon (Blastoise)
        const blastoiseCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '009',
          'Blastoise',
          'base-set',
          '2',
          Rarity.RARE_HOLO,
          'A brutal Pokémon',
          'Ken Sugimori',
          '',
        );
        blastoiseCard.setPokemonType(PokemonType.WATER);

        // Mock Water Energy
        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          waterEnergy,
          'N/A',
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard.setEnergyType(EnergyType.WATER);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(waterEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(blastoiseCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject Fire Energy for Blastoise (negative)', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const fireEnergy = 'pokemon-base-set-v1.0-fire-energy--99';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [fireEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Water Pokemon (Blastoise)
        const blastoiseCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '009',
          'Blastoise',
          'base-set',
          '2',
          Rarity.RARE_HOLO,
          'A brutal Pokémon',
          'Ken Sugimori',
          '',
        );
        blastoiseCard.setPokemonType(PokemonType.WATER);

        // Mock Fire Energy (wrong type)
        const fireEnergyCard = Card.createEnergyCard(
          'energy-1',
          fireEnergy,
          'N/A',
          'Fire Energy',
          'base-set',
          '99',
          Rarity.COMMON,
          'Basic Fire Energy',
          '',
          '',
        );
        fireEnergyCard.setEnergyType(EnergyType.FIRE);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(fireEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(blastoiseCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Selected energy card ${fireEnergy} must be WATER Energy, but is FIRE`,
        );
      });

      it('should reject Grass Energy for Blastoise (negative)', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const grassEnergy = 'pokemon-base-set-v1.0-grass-energy--98';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [grassEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Water Pokemon (Blastoise)
        const blastoiseCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '009',
          'Blastoise',
          'base-set',
          '2',
          Rarity.RARE_HOLO,
          'A brutal Pokémon',
          'Ken Sugimori',
          '',
        );
        blastoiseCard.setPokemonType(PokemonType.WATER);

        // Mock Grass Energy (wrong type)
        const grassEnergyCard = Card.createEnergyCard(
          'energy-1',
          grassEnergy,
          'N/A',
          'Grass Energy',
          'base-set',
          '98',
          Rarity.COMMON,
          'Basic Grass Energy',
          '',
          '',
        );
        grassEnergyCard.setEnergyType(EnergyType.GRASS);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(grassEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(blastoiseCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Selected energy card ${grassEnergy} must be WATER Energy, but is GRASS`,
        );
      });

      it('should reject Water Energy to Fire Pokemon (negative)', async () => {
        const charizard = new CardInstance(
          'pokemon-base-set-v1.0-charizard--4',
          'instance-charizard',
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          StatusEffect.NONE,
          false,
        );
        const gameState = createGameState(charizard, [], []);
        const pokemon = createPokemon(cardId);
        const waterEnergy = 'pokemon-base-set-v1.0-water-energy--103';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Fire Pokemon (wrong type)
        const charizardCard = Card.createPokemonCard(
          'instance-charizard',
          'pokemon-base-set-v1.0-charizard--4',
          '006',
          'Charizard',
          'base-set',
          '4',
          Rarity.RARE_HOLO,
          'Spits fire',
          'Ken Sugimori',
          '',
        );
        charizardCard.setPokemonType(PokemonType.FIRE);

        // Mock Water Energy (correct type)
        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          waterEnergy,
          'N/A',
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard.setEnergyType(EnergyType.WATER);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(waterEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(charizardCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Target Pokemon must be WATER type, but is FIRE',
        );
      });

      it('should reject Water Energy to Grass Pokemon (negative)', async () => {
        const venusaur = new CardInstance(
          'pokemon-base-set-v1.0-venusaur--15',
          'instance-venusaur',
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          StatusEffect.NONE,
          false,
        );
        const gameState = createGameState(venusaur, [], []);
        const pokemon = createPokemon(cardId);
        const waterEnergy = 'pokemon-base-set-v1.0-water-energy--103';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // Mock Grass Pokemon (wrong type)
        const venusaurCard = Card.createPokemonCard(
          'instance-venusaur',
          'pokemon-base-set-v1.0-venusaur--15',
          '003',
          'Venusaur',
          'base-set',
          '15',
          Rarity.RARE_HOLO,
          'Flower Pokémon',
          'Ken Sugimori',
          '',
        );
        venusaurCard.setPokemonType(PokemonType.GRASS);

        // Mock Water Energy (correct type)
        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          waterEnergy,
          'N/A',
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard.setEnergyType(EnergyType.WATER);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(waterEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(venusaurCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Target Pokemon must be WATER type, but is GRASS',
        );
      });
    });

    describe('Energy Type Restrictions - Venusaur Energy Trans', () => {
      const cardId = 'pokemon-base-set-v1.0-venusaur--15';
      const ability = new Ability(
        'Energy Trans',
        'As often as you like during your turn (before your attack), you may take 1 Grass Energy card attached to 1 of your Pokémon and attach it to a different one. This power can\'t be used if Venusaur is Asleep, Confused, or Paralyzed.',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.BENCHED_YOURS,
            EnergySource.SELF,
            1,
            EnergyType.GRASS,
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should validate Grass Energy to any Pokemon (positive)', async () => {
        const gameState = createGameState();
        const pokemon = createPokemon(cardId);
        const grassEnergy = 'pokemon-base-set-v1.0-grass-energy--98';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [grassEnergy],
          targetPokemon: PokemonPosition.BENCH_0,
        };

        // Mock any Pokemon (no type restriction)
        const anyPokemonCard = Card.createPokemonCard(
          'instance-1',
          'pokemon-base-set-v1.0-pikachu--60',
          '025',
          'Pikachu',
          'base-set',
          '60',
          Rarity.COMMON,
          'Mouse Pokémon',
          'Ken Sugimori',
          '',
        );
        anyPokemonCard.setPokemonType(PokemonType.ELECTRIC);

        // Mock Grass Energy
        const grassEnergyCard = Card.createEnergyCard(
          'energy-1',
          grassEnergy,
          'N/A',
          'Grass Energy',
          'base-set',
          '98',
          Rarity.COMMON,
          'Basic Grass Energy',
          '',
          '',
        );
        grassEnergyCard.setEnergyType(EnergyType.GRASS);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(grassEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(anyPokemonCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject Fire Energy for Venusaur (negative)', async () => {
        const anyPokemon = new CardInstance(
          'pokemon-base-set-v1.0-pikachu--60',
          'instance-pikachu',
          PokemonPosition.BENCH_0,
          100,
          100,
          [],
          StatusEffect.NONE,
          false,
        );
        const gameState = createGameState(null, [anyPokemon], []);
        const pokemon = createPokemon(cardId);
        const fireEnergy = 'pokemon-base-set-v1.0-fire-energy--99';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [fireEnergy],
          targetPokemon: PokemonPosition.BENCH_0,
        };

        // Mock any Pokemon
        const anyPokemonCard = Card.createPokemonCard(
          'instance-pikachu',
          'pokemon-base-set-v1.0-pikachu--60',
          '025',
          'Pikachu',
          'base-set',
          '60',
          Rarity.COMMON,
          'Mouse Pokémon',
          'Ken Sugimori',
          '',
        );
        anyPokemonCard.setPokemonType(PokemonType.ELECTRIC);

        // Mock Fire Energy (wrong type)
        const fireEnergyCard = Card.createEnergyCard(
          'energy-1',
          fireEnergy,
          'N/A',
          'Fire Energy',
          'base-set',
          '99',
          Rarity.COMMON,
          'Basic Fire Energy',
          '',
          '',
        );
        fireEnergyCard.setEnergyType(EnergyType.FIRE);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(fireEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(anyPokemonCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Selected energy card ${fireEnergy} must be GRASS Energy, but is FIRE`,
        );
      });

      it('should reject Water Energy for Venusaur (negative)', async () => {
        const anyPokemon = new CardInstance(
          'pokemon-base-set-v1.0-pikachu--60',
          'instance-pikachu',
          PokemonPosition.BENCH_0,
          100,
          100,
          [],
          StatusEffect.NONE,
          false,
        );
        const gameState = createGameState(null, [anyPokemon], []);
        const pokemon = createPokemon(cardId);
        const waterEnergy = 'pokemon-base-set-v1.0-water-energy--103';
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy],
          targetPokemon: PokemonPosition.BENCH_0,
        };

        // Mock any Pokemon
        const anyPokemonCard = Card.createPokemonCard(
          'instance-pikachu',
          'pokemon-base-set-v1.0-pikachu--60',
          '025',
          'Pikachu',
          'base-set',
          '60',
          Rarity.COMMON,
          'Mouse Pokémon',
          'Ken Sugimori',
          '',
        );
        anyPokemonCard.setPokemonType(PokemonType.ELECTRIC);

        // Mock Water Energy (wrong type)
        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          waterEnergy,
          'N/A',
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard.setEnergyType(EnergyType.WATER);

        // Mock order: energy card validation happens first, then target Pokemon validation
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(waterEnergyCard) // Energy card validation (line 235)
          .mockResolvedValueOnce(anyPokemonCard); // Target Pokemon validation (line 284)

        const result = await service.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Selected energy card ${waterEnergy} must be GRASS Energy, but is WATER`,
        );
      });
    });
  });
});
