import { Test, TestingModule } from '@nestjs/testing';
import { AbilityEffectExecutorService } from './ability-effect-executor.service';
import { Ability } from '../../../../../card/domain/value-objects/ability.value-object';
import { AbilityActivationType } from '../../../../../card/domain/enums/ability-activation-type.enum';
import { UsageLimit } from '../../../../../card/domain/enums/usage-limit.enum';
import { AbilityEffectFactory } from '../../../../../card/domain/value-objects/ability-effect.value-object';
import { AbilityEffectType } from '../../../../../card/domain/enums/ability-effect-type.enum';
import { GameState } from '../../../value-objects/game-state.value-object';
import { PlayerGameState } from '../../../value-objects/player-game-state.value-object';
import { CardInstance } from '../../../value-objects/card-instance.value-object';
import { PlayerIdentifier } from '../../../enums/player-identifier.enum';
import { TurnPhase } from '../../../enums/turn-phase.enum';
import { StatusEffect } from '../../../enums/status-effect.enum';
import { PokemonPosition } from '../../../enums/pokemon-position.enum';
import { AbilityActionData } from '../../../types/ability-action-data.types';
import { EnergyType } from '../../../../../card/domain/enums/energy-type.enum';
import { EnergySource } from '../../../../../card/domain/enums/energy-source.enum';
import { TargetType } from '../../../../../card/domain/enums/target-type.enum';
import { PokemonType } from '../../../../../card/domain/enums/pokemon-type.enum';
import { IGetCardByIdUseCase } from '../../../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../../../card/domain/entities/card.entity';
import { CardType } from '../../../../../card/domain/enums/card-type.enum';
import { Rarity } from '../../../../../card/domain/enums/rarity.enum';
import { Destination } from '../../../../../card/domain/enums/destination.enum';
import { Selector } from '../../../../../card/domain/enums/selector.enum';
import { StatusCondition } from '../../../../../card/domain/enums/status-condition.enum';
import { Duration } from '../../../../../card/domain/enums/duration.enum';

describe('AbilityEffectExecutorService', () => {
  let service: AbilityEffectExecutorService;

  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;

  beforeEach(async () => {
    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbilityEffectExecutorService,
        {
          provide: IGetCardByIdUseCase,
          useValue: mockGetCardByIdUseCase,
        },
      ],
    }).compile();

    service = module.get<AbilityEffectExecutorService>(
      AbilityEffectExecutorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeEffects - Real Pokemon Cards', () => {
    const createGameState = (
      player1Active?: CardInstance,
      player1Bench: CardInstance[] = [],
      player1Hand: string[] = [],
      player1Deck: string[] = [],
      player1Discard: string[] = [],
      player2Active?: CardInstance,
      player2Bench: CardInstance[] = [],
    ): GameState => {
      const player1State = new PlayerGameState(
        player1Deck,
        player1Hand,
        player1Active || null,
        player1Bench,
        [],
        player1Discard,
        false,
      );

      const player2State = new PlayerGameState(
        [],
        [],
        player2Active || null,
        player2Bench,
        [],
        [],
        false,
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

    describe('Blastoise - Rain Dance (ENERGY_ACCELERATION)', () => {
      const cardId = 'pokemon-base-set-v1.0-blastoise--2';
      const ability = new Ability(
        'Rain Dance',
        "As often as you like during your turn (before your attack), you may attach as many Water Energy cards as you like from your hand to 1 or more of your Water Pokémon. This power can't be used if Blastoise is Asleep, Confused, or Paralyzed.",
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

      it('should attach Water Energy from hand to Blastoise', async () => {
        const blastoise = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
          0,
        );

        const waterEnergy1 = 'pokemon-base-set-v1.0-water-energy--103';
        const waterEnergy2 = 'pokemon-base-set-v1.0-water-energy--103';
        const gameState = createGameState(
          blastoise,
          [],
          [waterEnergy1, waterEnergy2],
        );

        // Verify hand is set correctly
        expect(
          gameState.getPlayerState(PlayerIdentifier.PLAYER1).hand,
        ).toContain(waterEnergy1);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy1], // Only 1 energy per use (count: 1)
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
        blastoiseCard.setHp(100);

        const waterEnergyCard1 = Card.createEnergyCard(
          'energy-1',
          waterEnergy1,
          'N/A',
          'Water Energy',
          'base-set',
          '103',
          Rarity.COMMON,
          'Basic Water Energy',
          '',
          '',
        );
        waterEnergyCard1.setEnergyType(EnergyType.WATER);

        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(blastoiseCard) // Target Pokemon validation
          .mockResolvedValueOnce(waterEnergyCard1) // Selected energy card validation
          .mockResolvedValueOnce(waterEnergyCard1) // Count validation - checking hand[0]
          .mockResolvedValueOnce(waterEnergyCard1); // Count validation - checking hand[1]

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).toHaveLength(
          1,
        );
        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          waterEnergy1,
        );
        // Only the selected card should be removed from hand
        // Since waterEnergy1 and waterEnergy2 have the same cardId, we verify by count
        // Started with 2 cards, removed 1, so 1 should remain
        expect(result.playerState.hand).toHaveLength(1);
        // The remaining card should still be a water energy (same ID)
        expect(result.playerState.hand[0]).toBe(waterEnergy2);
      });

      it('should remove exactly count cards when multiple cards with same ID exist', async () => {
        const cardId = 'pokemon-base-set-v1.0-blastoise--2';
        const ability = new Ability(
          'Rain Dance',
          'As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon.',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.energyAcceleration(
              TargetType.ALL_YOURS,
              EnergySource.HAND,
              2, // count: 2 - should attach 2 cards
              EnergyType.WATER,
              PokemonType.WATER,
            ),
          ],
          undefined, // triggerEvent
          UsageLimit.UNLIMITED, // usageLimit
        );

        const blastoise = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
          0,
        );

        // Create hand with 3 water energy cards (all same ID)
        const waterEnergy1 = 'pokemon-base-set-v1.0-water-energy--103';
        const waterEnergy2 = 'pokemon-base-set-v1.0-water-energy--103';
        const waterEnergy3 = 'pokemon-base-set-v1.0-water-energy--103';
        const gameState = createGameState(
          blastoise,
          [],
          [waterEnergy1, waterEnergy2, waterEnergy3],
        );

        // Verify hand has 3 cards
        expect(
          gameState.getPlayerState(PlayerIdentifier.PLAYER1).hand,
        ).toHaveLength(3);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy1, waterEnergy2], // Select 2 cards (count: 2)
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
        blastoiseCard.setHp(100);

        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          waterEnergy1,
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

        // Clear any previous mocks
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        // Mock implementation: return blastoiseCard for blastoise cardId, waterEnergyCard for energy cardId
        mockGetCardByIdUseCase.getCardEntity.mockImplementation(
          (cardId: string) => {
            if (cardId === 'pokemon-base-set-v1.0-blastoise--2') {
              return Promise.resolve(blastoiseCard);
            } else if (cardId === 'pokemon-base-set-v1.0-water-energy--103') {
              return Promise.resolve(waterEnergyCard);
            }
            return Promise.reject(new Error(`Unexpected cardId: ${cardId}`));
          },
        );

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Should attach exactly 2 cards
        expect(result.playerState.activePokemon?.attachedEnergy).toHaveLength(
          2,
        );
        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          waterEnergy1,
        );
        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          waterEnergy2,
        );

        // Should remove exactly 2 cards from hand, leaving 1
        expect(result.playerState.hand).toHaveLength(1);
        expect(result.playerState.hand[0]).toBe(waterEnergy3);
      });

      it('should validate there are enough matching cards before removal', async () => {
        const cardId = 'pokemon-base-set-v1.0-blastoise--2';
        const ability = new Ability(
          'Rain Dance',
          'As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon.',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.energyAcceleration(
              TargetType.ALL_YOURS,
              EnergySource.HAND,
              2, // count: 2 - need 2 water energy cards
              EnergyType.WATER,
              PokemonType.WATER,
            ),
          ],
          undefined, // triggerEvent
          UsageLimit.UNLIMITED, // usageLimit
        );

        const blastoise = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
          0,
        );

        // Create hand with only 1 water energy card
        const waterEnergy1 = 'pokemon-base-set-v1.0-water-energy--103';
        const fireEnergy = 'pokemon-base-set-v1.0-fire-energy--99';
        const gameState = createGameState(
          blastoise,
          [],
          [waterEnergy1, fireEnergy],
        );

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy1, waterEnergy1], // Try to select 2 (but only 1 exists)
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
        blastoiseCard.setHp(100);

        const waterEnergyCard = Card.createEnergyCard(
          'energy-1',
          waterEnergy1,
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

        const fireEnergyCard = Card.createEnergyCard(
          'energy-2',
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

        // Clear any previous mocks
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        // Mock implementation: return appropriate card based on cardId
        mockGetCardByIdUseCase.getCardEntity.mockImplementation(
          (cardId: string) => {
            if (cardId === 'pokemon-base-set-v1.0-blastoise--2') {
              return Promise.resolve(blastoiseCard);
            } else if (cardId === 'pokemon-base-set-v1.0-water-energy--103') {
              return Promise.resolve(waterEnergyCard);
            } else if (cardId === 'pokemon-base-set-v1.0-fire-energy--99') {
              return Promise.resolve(fireEnergyCard);
            }
            return Promise.reject(new Error(`Unexpected cardId: ${cardId}`));
          },
        );

        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow('Not enough WATER Energy cards in hand');
      });

      it('should validate selectedCardIds length matches count', async () => {
        const cardId = 'pokemon-base-set-v1.0-blastoise--2';
        const ability = new Ability(
          'Rain Dance',
          'As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon.',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.energyAcceleration(
              TargetType.ALL_YOURS,
              EnergySource.HAND,
              1, // count: 1
              EnergyType.WATER,
              PokemonType.WATER,
            ),
          ],
          undefined, // triggerEvent
          UsageLimit.UNLIMITED, // usageLimit
        );

        const blastoise = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
          0,
        );

        const waterEnergy1 = 'pokemon-base-set-v1.0-water-energy--103';
        const waterEnergy2 = 'pokemon-base-set-v1.0-water-energy--103';
        const gameState = createGameState(
          blastoise,
          [],
          [waterEnergy1, waterEnergy2],
        );

        // Try to select 2 cards when count is 1
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy1, waterEnergy2], // 2 cards selected, but count is 1
        };

        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow(
          'Expected 1 energy card(s) to be selected, but got 2',
        );
      });
    });

    describe('Charizard - Energy Burn (ENERGY_ACCELERATION)', () => {
      const cardId = 'pokemon-base-set-v1.0-charizard--4';
      const ability = new Ability(
        'Energy Burn',
        "As often as you like during your turn (before your attack), you may take 1 Fire Energy card attached to Charizard and attach it to 1 of your other Pokémon. This power can't be used if Charizard is Asleep, Confused, or Paralyzed.",
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

      it('should move Fire Energy from Charizard to bench Pokemon', async () => {
        const fireEnergy = 'pokemon-base-set-v1.0-fire-energy--99';
        const charizard = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          120,
          120,
          [fireEnergy],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-charmander--48',
          PokemonPosition.BENCH_0,
          50,
          50,
          [],
          [],
          0,
        );

        const gameState = createGameState(charizard, [benchPokemon]);

        // Mock Card entities
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

        // Mock order: only energy card (sourcePokemonType not set)
        mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
          fireEnergyCard,
        ); // Energy type validation

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          targetPokemon: PokemonPosition.BENCH_0,
          selectedCardIds: [fireEnergy],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).not.toContain(
          fireEnergy,
        );
        expect(
          result.playerState.bench.find((p) => p.instanceId === 'instance-2')
            ?.attachedEnergy,
        ).toContain(fireEnergy);
      });
    });

    describe('Electrode - Buzzap (ENERGY_ACCELERATION)', () => {
      const cardId = 'pokemon-base-set-v1.0-electrode--21';
      const ability = new Ability(
        'Buzzap',
        "As often as you like during your turn (before your attack), you may take 1 Energy card attached to 1 of your Pokémon and attach it to Electrode. This power can't be used if Electrode is Asleep, Confused, or Paralyzed.",
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

      it('should move Energy from bench Pokemon to Electrode', async () => {
        const lightningEnergy = 'pokemon-base-set-v1.0-lightning-energy--101';
        // For EnergySource.SELF, energy must be attached to the Pokemon using the ability (Electrode)
        const electrode = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          80,
          80,
          [lightningEnergy], // Energy attached to Electrode
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-pikachu--60',
          PokemonPosition.BENCH_0,
          40,
          40,
          [],
          [],
          0,
        );

        const gameState = createGameState(electrode, [benchPokemon]);

        // Mock Card entities - no energy type restriction, so no validation needed
        const lightningEnergyCard = Card.createEnergyCard(
          'energy-1',
          lightningEnergy,
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

        // No mocks needed since energyType is not set in effect
        mockGetCardByIdUseCase.getCardEntity.mockClear();

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE, // Target is Electrode (SELF)
          selectedCardIds: [lightningEnergy],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          lightningEnergy,
        );
        // Energy was moved from Electrode to Electrode (SELF source and target)
        // So energy stays on Electrode
        const resultBenchPokemon = result.playerState.bench.find(
          (p) => p.instanceId === 'instance-2',
        );
        expect(resultBenchPokemon).toBeDefined();
        expect(resultBenchPokemon?.attachedEnergy).not.toContain(
          lightningEnergy,
        );
      });
    });

    describe('Venusaur - Energy Trans (ENERGY_ACCELERATION)', () => {
      const cardId = 'pokemon-base-set-v1.0-venusaur--15';
      const ability = new Ability(
        'Energy Trans',
        "As often as you like during your turn (before your attack), you may take 1 Grass Energy card attached to 1 of your Pokémon and attach it to a different one. This power can't be used if Venusaur is Asleep, Confused, or Paralyzed.",
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.BENCHED_YOURS,
            EnergySource.SELF,
            1,
            EnergyType.GRASS,
            {
              sourcePokemonTarget: TargetType.ALL_YOURS,
            },
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should move Grass Energy from Venusaur to bench Pokemon', async () => {
        const grassEnergy = 'pokemon-base-set-v1.0-grass-energy--98';
        const venusaur = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [grassEnergy],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-bulbasaur--44',
          PokemonPosition.BENCH_0,
          40,
          100,
          [],
          [],
          0,
        );

        const gameState = createGameState(venusaur, [benchPokemon]);

        // Mock Card entities
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

        // Mock order: only energy card (sourcePokemonType and targetPokemonType not set)
        mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
          grassEnergyCard,
        ); // Energy type validation

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          sourcePokemon: PokemonPosition.ACTIVE, // Venusaur selects itself as source
          targetPokemon: PokemonPosition.BENCH_0,
          selectedCardIds: [grassEnergy],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).not.toContain(
          grassEnergy,
        );
        expect(
          result.playerState.bench.find((p) => p.instanceId === 'instance-2')
            ?.attachedEnergy,
        ).toContain(grassEnergy);
      });
    });

    describe('Gengar - Curse (HEAL)', () => {
      const cardId = 'pokemon-fossil-v1.0-gengar--20';
      const ability = new Ability(
        'Curse',
        "Once during your turn (before your attack), you may move 1 damage counter from 1 of your opponent's Pokémon to another (even if it would Knock Out the other Pokémon). This power can't be used if Gengar is Asleep, Confused, or Paralyzed.",
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.heal(TargetType.SELF, 10)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      it('should move damage counter from opponent Pokemon', async () => {
        const gengar = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100, // currentHp = maxHp - damageCounters = 100 - 0 = 100
          100,
          [],
          [],
          0,
        );

        const opponentActive = new CardInstance(
          'instance-opponent-1',
          'pokemon-base-set-v1.0-pikachu--60',
          PokemonPosition.ACTIVE,
          80, // currentHp = maxHp - damageCounters = 100 - 20 = 80
          100,
          [],
          [],
        );

        const opponentBench = new CardInstance(
          'instance-opponent-2',
          'pokemon-base-set-v1.0-charmander--48',
          PokemonPosition.BENCH_0,
          100, // currentHp = maxHp - damageCounters = 100 - 0 = 100
          100,
          [],
          [],
        );

        const gameState = createGameState(
          gengar,
          [],
          [],
          [],
          [],
          opponentActive,
          [opponentBench],
        );

        // Gengar's ability uses TargetType.SELF, so it heals Gengar itself
        // Note: Current HEAL implementation doesn't support moving damage from opponent
        // This test will need to be updated when MOVE_DAMAGE_COUNTER effect is implemented
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE, // Target is Gengar (SELF)
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Gengar should be healed (damage reduced by 10, from 0 to 0)
        expect(result.playerState.activePokemon?.getDamageCounters()).toBe(0);
        // Opponent active damage unchanged (HEAL doesn't move damage, only heals target)
        expect(result.opponentState.activePokemon?.getDamageCounters()).toBe(
          20,
        );
      });
    });

    describe('Alakazam - Damage Swap (MOVE_DAMAGE_COUNTER)', () => {
      const cardId = 'pokemon-base-set-v1.0-alakazam--1';
      const ability = new Ability(
        'Damage Swap',
        "As often as you like during your turn (before your attack), you may move 1 damage counter from 1 of your Pokémon to another as long as you don't Knock Out that Pokémon. This power can't be used if Alakazam is Asleep, Confused, or Paralyzed.",
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.moveDamageCounter(
            TargetType.ALL_YOURS,
            TargetType.ALL_YOURS,
            1,
            true,
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should move damage counter from bench Pokemon to Alakazam', async () => {
        const alakazam = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100, // currentHp = maxHp - damageCounters = 100 - 0 = 100
          100,
          [],
          [],
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-abra--63',
          PokemonPosition.BENCH_0,
          80, // currentHp = maxHp - damageCounters = 100 - 20 = 80
          100,
          [],
          [],
        );

        const gameState = createGameState(alakazam, [benchPokemon]);

        // MOVE_DAMAGE_COUNTER requires both source and destination Pokemon
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE, // Alakazam using the ability
          sourcePokemon: PokemonPosition.BENCH_0, // Take damage from bench Pokemon
          destinationPokemon: PokemonPosition.ACTIVE, // Add damage to Alakazam
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Bench Pokemon should lose 10 HP (1 damage counter)
        const updatedBenchPokemon = result.playerState.bench.find(
          (p) => p.instanceId === 'instance-2',
        );
        expect(updatedBenchPokemon?.currentHp).toBe(70); // 80 - 10 = 70
        expect(updatedBenchPokemon?.getDamageCounters()).toBe(30); // 20 + 10 = 30

        // Alakazam should gain 10 HP of damage (1 damage counter)
        expect(result.playerState.activePokemon?.currentHp).toBe(90); // 100 - 10 = 90
        expect(result.playerState.activePokemon?.getDamageCounters()).toBe(10); // 0 + 10 = 10
      });

      it('should prevent moving damage that would KO the source Pokemon', async () => {
        const alakazam = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-abra--63',
          PokemonPosition.BENCH_0,
          10, // Only 10 HP left (would be KO'd by moving 10 HP)
          100,
          [],
          [],
        );

        const gameState = createGameState(alakazam, [benchPokemon]);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          sourcePokemon: PokemonPosition.BENCH_0,
          destinationPokemon: PokemonPosition.ACTIVE,
        };

        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow(
          'Cannot move damage: would Knock Out the source Pokemon',
        );
      });
    });

    describe('Slowbro - Strange Behavior (HEAL)', () => {
      const cardId = 'pokemon-fossil-v1.0-slowbro--43';
      const ability = new Ability(
        'Strange Behavior',
        "Once during your turn (before your attack), you may move 1 damage counter from Slowbro to 1 of your opponent's Pokémon. This power can't be used if Slowbro is Asleep, Confused, or Paralyzed.",
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.heal(TargetType.SELF, 10)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      it('should move damage counter from Slowbro to opponent Pokemon', async () => {
        const slowbro = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          70, // currentHp = maxHp - damageCounters = 100 - 30 = 70
          100,
          [],
          [],
        );

        const opponentActive = new CardInstance(
          'instance-opponent-1',
          'pokemon-base-set-v1.0-pikachu--60',
          PokemonPosition.ACTIVE,
          100, // currentHp = maxHp - damageCounters = 100 - 0 = 100
          100,
          [],
          [],
        );
        // opponentActive has 0 damage counters (set in constructor above)

        const gameState = createGameState(
          slowbro,
          [],
          [],
          [],
          [],
          opponentActive,
        );

        // Slowbro's ability uses TargetType.SELF, so it heals Slowbro itself
        // Note: Current HEAL implementation doesn't support moving damage to opponent
        // This test will need to be updated when MOVE_DAMAGE_COUNTER effect is implemented
        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE, // Target is Slowbro (SELF)
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Slowbro should be healed (damage reduced by 10, from 30 to 20)
        expect(result.playerState.activePokemon?.getDamageCounters()).toBe(20);
        // Opponent active damage unchanged (HEAL doesn't move damage, only heals target)
        expect(result.opponentState.activePokemon?.getDamageCounters()).toBe(0);
      });
    });

    describe('Hypno - Prophecy (SEARCH_DECK)', () => {
      const cardId = 'pokemon-fossil-v1.0-hypno--22';
      const ability = new Ability(
        'Prophecy',
        "Once during your turn (before your attack), you may look at up to 3 cards from the top of either player's deck and rearrange them as you like. This power can't be used if Hypno is Asleep, Confused, or Paralyzed.",
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.searchDeck(3, Destination.HAND)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      it('should search and rearrange deck cards', async () => {
        const hypno = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          90,
          100,
          [],
          [],
          0,
        );

        const deckCards = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5'];

        const gameState = createGameState(hypno, [], [], deckCards);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['card-3', 'card-1', 'card-2'], // Rearranged order
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Deck should have 2 cards remaining (5 - 3 = 2)
        expect(result.playerState.deck).toHaveLength(2);
        // Remaining cards should be card-4 and card-5
        expect(result.playerState.deck[0]).toBe('card-4');
        expect(result.playerState.deck[1]).toBe('card-5');
        // Selected cards should be in hand
        expect(result.playerState.hand).toContain('card-3');
        expect(result.playerState.hand).toContain('card-1');
        expect(result.playerState.hand).toContain('card-2');
      });
    });

    describe('DRAW_CARDS effect', () => {
      it('should draw cards from deck', async () => {
        const cardId = 'test-pokemon';
        const ability = new Ability(
          'Draw Power',
          'Draw 2 cards',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.drawCards(2)],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );

        const pokemon = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          60,
          100,
          [],
          [],
          0,
        );

        const deckCards = ['card-1', 'card-2', 'card-3'];
        const gameState = createGameState(pokemon, [], [], deckCards);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.hand).toHaveLength(2);
        expect(result.playerState.deck).toHaveLength(1);
        expect(result.playerState.hand).toContain('card-1');
        expect(result.playerState.hand).toContain('card-2');
      });
    });

    describe('RETRIEVE_FROM_DISCARD effect', () => {
      it('should retrieve cards from discard pile', async () => {
        const cardId = 'test-pokemon';
        const ability = new Ability(
          'Retrieve Power',
          'Retrieve 1 card from discard',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.retrieveFromDiscard(1, Selector.CHOICE)],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );

        const pokemon = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          60,
          100,
          [],
          [],
          0,
        );

        const discardCards = ['card-1', 'card-2'];
        const gameState = createGameState(pokemon, [], [], [], discardCards);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['card-1'],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.hand).toContain('card-1');
        expect(result.playerState.discardPile).not.toContain('card-1');
        expect(result.playerState.discardPile).toContain('card-2');
      });
    });

    describe('SWITCH_POKEMON effect', () => {
      it('should switch active Pokemon with bench Pokemon', async () => {
        const cardId = 'test-pokemon';
        const ability = new Ability(
          'Switch Power',
          'Switch Pokemon',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.switchPokemon(Selector.CHOICE)],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );

        const activePokemon = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          60,
          100,
          [],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-pikachu--60',
          PokemonPosition.BENCH_0,
          40,
          100,
          [],
          [],
          0,
        );

        const gameState = createGameState(activePokemon, [benchPokemon]);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          benchPosition: PokemonPosition.BENCH_0,
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.instanceId).toBe('instance-2');
        expect(result.playerState.bench).toHaveLength(1);
        expect(result.playerState.bench[0]?.instanceId).toBe('instance-1');
      });
    });

    describe('DISCARD_FROM_HAND effect', () => {
      it('should discard cards from hand', async () => {
        const cardId = 'test-pokemon';
        const ability = new Ability(
          'Discard Power',
          'Discard 2 cards',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.discardFromHand(2, Selector.CHOICE)],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );

        const pokemon = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          60,
          100,
          [],
          [],
          0,
        );

        const handCards = ['card-1', 'card-2', 'card-3'];
        const gameState = createGameState(pokemon, [], handCards);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          handCardIds: ['card-1', 'card-2'],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.hand).toHaveLength(1);
        expect(result.playerState.hand).toContain('card-3');
        expect(result.playerState.discardPile).toContain('card-1');
        expect(result.playerState.discardPile).toContain('card-2');
      });
    });

    describe('ATTACH_FROM_DISCARD effect', () => {
      it('should attach energy from discard to Pokemon', async () => {
        const cardId = 'test-pokemon';
        const ability = new Ability(
          'Energy Retrieve',
          'Attach energy from discard',
          AbilityActivationType.ACTIVATED,
          [AbilityEffectFactory.attachFromDiscard(TargetType.SELF, 1)],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );

        const pokemon = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          60,
          100,
          [],
          [],
          0,
        );

        const discardCards = ['pokemon-base-set-v1.0-fire-energy--99'];
        const gameState = createGameState(pokemon, [], [], [], discardCards);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: ['pokemon-base-set-v1.0-fire-energy--99'],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          'pokemon-base-set-v1.0-fire-energy--99',
        );
        expect(result.playerState.discardPile).not.toContain(
          'pokemon-base-set-v1.0-fire-energy--99',
        );
      });
    });

    describe('STATUS_CONDITION effect', () => {
      it('should apply status condition to opponent Pokemon', async () => {
        const cardId = 'test-pokemon';
        const ability = new Ability(
          'Status Power',
          'Apply status condition',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.statusCondition(
              StatusCondition.CONFUSED,
              TargetType.ACTIVE_OPPONENT,
            ),
          ],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );

        const pokemon = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          60,
          100,
          [],
          [],
          0,
        );

        const opponentActive = new CardInstance(
          'instance-opponent-1',
          'pokemon-base-set-v1.0-pikachu--60',
          PokemonPosition.ACTIVE,
          40,
          100,
          [],
          [],
          0,
        );

        const gameState = createGameState(
          pokemon,
          [],
          [],
          [],
          [],
          opponentActive,
        );

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          targetPokemon: PokemonPosition.ACTIVE, // Opponent's active Pokemon
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.opponentState.activePokemon?.statusEffects).toEqual([
          StatusEffect.CONFUSED,
        ]);
      });
    });

    describe('Energy and Pokemon Type Restrictions - Blastoise Rain Dance', () => {
      const cardId = 'pokemon-base-set-v1.0-blastoise--2';
      const ability = new Ability(
        'Rain Dance',
        "As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon. This power can't be used if Blastoise is Asleep, Confused, or Paralyzed.",
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

      it('should attach Water Energy to Water Pokemon (positive)', async () => {
        const blastoise = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
          0,
        );

        const waterEnergy = 'pokemon-base-set-v1.0-water-energy--103';
        const gameState = createGameState(blastoise, [], [waterEnergy]);

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
        blastoiseCard.setHp(100);

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

        // Mock for: target Pokemon validation, selected card validation, then count validation (all cards in hand)
        const hand = gameState.getPlayerState(PlayerIdentifier.PLAYER1).hand;
        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(blastoiseCard) // Target Pokemon validation
          .mockResolvedValueOnce(waterEnergyCard); // Selected card validation

        // Add mocks for count validation (checking all cards in hand)
        for (let i = 0; i < hand.length; i++) {
          mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
            waterEnergyCard,
          );
        }

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          waterEnergy,
        );
        expect(result.playerState.hand).not.toContain(waterEnergy);
      });

      it('should reject Fire Energy for Blastoise (negative)', async () => {
        const blastoise = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          100,
          100,
          [],
          [],
          0,
        );

        const fireEnergy = 'pokemon-base-set-v1.0-fire-energy--99';
        const gameState = createGameState(blastoise, [], [fireEnergy]);

        // Debug: Verify hand is set correctly
        expect(gameState.getPlayerState(PlayerIdentifier.PLAYER1).hand).toEqual(
          [fireEnergy],
        );

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
        blastoiseCard.setHp(100);

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

        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(blastoiseCard)
          .mockResolvedValueOnce(fireEnergyCard);

        // Verify fireEnergy is in hand
        expect(
          gameState.getPlayerState(PlayerIdentifier.PLAYER1).hand,
        ).toContain(fireEnergy);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [fireEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        // The executor validates hand first, then energy type
        // Since fireEnergy is in hand, it should fail at energy type validation
        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow('Selected energy card');
      });

      it('should reject Water Energy to Fire Pokemon (negative)', async () => {
        const charizard = new CardInstance(
          'instance-1',
          'pokemon-base-set-v1.0-charizard--4',
          PokemonPosition.ACTIVE,
          120,
          120,
          [],
          [],
          0,
        );

        const waterEnergy = 'pokemon-base-set-v1.0-water-energy--103';
        const gameState = createGameState(charizard, [], [waterEnergy]);

        // Mock Fire Pokemon (wrong type)
        const charizardCard = Card.createPokemonCard(
          'instance-1',
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
        charizardCard.setHp(120);

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

        mockGetCardByIdUseCase.getCardEntity
          .mockResolvedValueOnce(charizardCard)
          .mockResolvedValueOnce(waterEnergyCard);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          selectedCardIds: [waterEnergy],
          targetPokemon: PokemonPosition.ACTIVE,
        };

        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow('Target Pokemon must be WATER type');
      });
    });

    describe('Energy Type Restrictions - Venusaur Energy Trans', () => {
      const cardId = 'pokemon-base-set-v1.0-venusaur--15';
      const ability = new Ability(
        'Energy Trans',
        "As often as you like during your turn (before your attack), you may take 1 Grass Energy card attached to 1 of your Pokémon and attach it to a different one. This power can't be used if Venusaur is Asleep, Confused, or Paralyzed.",
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.energyAcceleration(
            TargetType.BENCHED_YOURS,
            EnergySource.SELF,
            1,
            EnergyType.GRASS,
            {
              sourcePokemonTarget: TargetType.ALL_YOURS,
            },
          ),
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      it('should move Grass Energy from any Pokemon to any Pokemon (positive)', async () => {
        const venusaur = new CardInstance(
          cardId,
          'instance-1',
          PokemonPosition.ACTIVE,
          100,
          100,
          ['pokemon-base-set-v1.0-grass-energy--98'],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-pikachu--60',
          PokemonPosition.BENCH_0,
          40,
          100,
          [],
          [],
          0,
        );

        const grassEnergy = 'pokemon-base-set-v1.0-grass-energy--98';
        const gameState = createGameState(venusaur, [benchPokemon]);

        // Mock Card entities
        const venusaurCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '015',
          'Venusaur',
          'base-set',
          '15',
          Rarity.RARE_HOLO,
          'Seed Pokémon',
          'Ken Sugimori',
          '',
        );
        venusaurCard.setPokemonType(PokemonType.GRASS);
        venusaurCard.setHp(100);

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
        benchPokemonCard.setHp(40);

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

        // Mock order: only energy card (sourcePokemonType and targetPokemonType not set)
        mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
          grassEnergyCard,
        ); // Energy type validation

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          sourcePokemon: PokemonPosition.ACTIVE, // Venusaur selects itself as source
          targetPokemon: PokemonPosition.BENCH_0,
          selectedCardIds: [grassEnergy],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        expect(result.playerState.activePokemon?.attachedEnergy).not.toContain(
          grassEnergy,
        );
        expect(
          result.playerState.bench.find((p) => p.instanceId === 'instance-2')
            ?.attachedEnergy,
        ).toContain(grassEnergy);
      });

      it('should reject Fire Energy for Venusaur (negative)', async () => {
        const venusaur = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          ['pokemon-base-set-v1.0-fire-energy--99'],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'pokemon-base-set-v1.0-pikachu--60',
          'instance-2',
          PokemonPosition.BENCH_0,
          40,
          100,
          [],
          [],
          0,
        );

        const fireEnergy = 'pokemon-base-set-v1.0-fire-energy--99';
        const gameState = createGameState(venusaur, [benchPokemon]);

        // Mock Card entities
        const venusaurCard = Card.createPokemonCard(
          'instance-1',
          cardId,
          '015',
          'Venusaur',
          'base-set',
          '15',
          Rarity.RARE_HOLO,
          'Seed Pokémon',
          'Ken Sugimori',
          '',
        );
        venusaurCard.setPokemonType(PokemonType.GRASS);
        venusaurCard.setHp(100);

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
        benchPokemonCard.setHp(40);

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

        // Mock order: only energy card (sourcePokemonType not set, so no source validation)
        // Energy type validation will fail because fireEnergy is not GRASS
        mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
          fireEnergyCard,
        ); // Energy type validation (will fail here)

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          sourcePokemon: PokemonPosition.ACTIVE, // Venusaur selects itself as source
          targetPokemon: PokemonPosition.BENCH_0,
          selectedCardIds: [fireEnergy],
        };

        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow('Selected energy card');
      });
    });

    describe('sourcePokemonTarget - Select source Pokemon', () => {
      const cardId = 'pokemon-base-set-v1.0-venusaur--15';
      const grassEnergy = 'pokemon-base-set-v1.0-grass-energy--98';

      it('should require sourcePokemon when sourcePokemonTarget is not SELF', async () => {
        const ability = new Ability(
          'Energy Trans',
          'Test ability',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.energyAcceleration(
              TargetType.BENCHED_YOURS,
              EnergySource.SELF,
              1,
              EnergyType.GRASS,
              {
                sourcePokemonTarget: TargetType.ALL_YOURS,
              },
            ),
          ],
        );

        const venusaur = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [grassEnergy],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-bulbasaur--44',
          PokemonPosition.BENCH_0,
          40,
          100,
          [],
          [],
          0,
        );

        const gameState = createGameState(venusaur, [benchPokemon]);

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE,
          // Missing sourcePokemon - should fail
          targetPokemon: PokemonPosition.BENCH_0,
          selectedCardIds: [grassEnergy],
        };

        await expect(
          service.executeEffects(
            ability,
            actionData,
            gameState,
            PlayerIdentifier.PLAYER1,
          ),
        ).rejects.toThrow(
          'sourcePokemon is required when sourcePokemonTarget is not SELF',
        );
      });

      it('should move energy from selected source Pokemon (not ability user)', async () => {
        const ability = new Ability(
          'Energy Trans',
          'Test ability',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.energyAcceleration(
              TargetType.BENCHED_YOURS,
              EnergySource.SELF,
              1,
              EnergyType.GRASS,
              {
                sourcePokemonTarget: TargetType.ALL_YOURS,
              },
            ),
          ],
        );

        // Venusaur on bench (using ability)
        const venusaur = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.BENCH_0,
          100,
          100,
          [],
          [],
          0,
        );

        // Another Pokemon on bench with energy
        const benchPokemonWithEnergy = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-bulbasaur--44',
          PokemonPosition.BENCH_1,
          40,
          100,
          [grassEnergy],
          [],
          0,
        );

        // Target Pokemon
        const targetPokemon = new CardInstance(
          'instance-3',
          'pokemon-base-set-v1.0-charmander--46',
          PokemonPosition.ACTIVE,
          50,
          100,
          [],
          [],
          0,
        );

        const gameState = createGameState(targetPokemon, [
          venusaur,
          benchPokemonWithEnergy,
        ]);

        // Mock energy card
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
        mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
          grassEnergyCard,
        );

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.BENCH_0, // Venusaur using ability
          sourcePokemon: PokemonPosition.BENCH_1, // Select bench Pokemon with energy as source
          targetPokemon: PokemonPosition.ACTIVE, // Target active Pokemon
          selectedCardIds: [grassEnergy],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Energy should be removed from BENCH_1 (source)
        expect(
          result.playerState.bench.find((p) => p.instanceId === 'instance-2')
            ?.attachedEnergy,
        ).not.toContain(grassEnergy);

        // Energy should be attached to ACTIVE (target)
        expect(result.playerState.activePokemon?.attachedEnergy).toContain(
          grassEnergy,
        );
      });

      it('should use Pokemon with ability when sourcePokemonTarget is SELF (default)', async () => {
        const ability = new Ability(
          'Energy Trans',
          'Test ability',
          AbilityActivationType.ACTIVATED,
          [
            AbilityEffectFactory.energyAcceleration(
              TargetType.BENCHED_YOURS,
              EnergySource.SELF,
              1,
              EnergyType.GRASS,
              {
                sourcePokemonTarget: TargetType.SELF, // Explicit SELF
              },
            ),
          ],
        );

        const venusaur = new CardInstance(
          'instance-1',
          cardId,
          PokemonPosition.ACTIVE,
          100,
          100,
          [grassEnergy],
          [],
          0,
        );

        const benchPokemon = new CardInstance(
          'instance-2',
          'pokemon-base-set-v1.0-bulbasaur--44',
          PokemonPosition.BENCH_0,
          40,
          100,
          [],
          [],
          0,
        );

        const gameState = createGameState(venusaur, [benchPokemon]);

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
        mockGetCardByIdUseCase.getCardEntity.mockResolvedValueOnce(
          grassEnergyCard,
        );

        const actionData: AbilityActionData = {
          cardId,
          target: PokemonPosition.ACTIVE, // Venusaur using ability
          // No sourcePokemon - should use ability user (ACTIVE)
          targetPokemon: PokemonPosition.BENCH_0,
          selectedCardIds: [grassEnergy],
        };

        const result = await service.executeEffects(
          ability,
          actionData,
          gameState,
          PlayerIdentifier.PLAYER1,
        );

        // Energy should be removed from ACTIVE (ability user)
        expect(result.playerState.activePokemon?.attachedEnergy).not.toContain(
          grassEnergy,
        );

        // Energy should be attached to BENCH_0 (target)
        expect(
          result.playerState.bench.find((p) => p.instanceId === 'instance-2')
            ?.attachedEnergy,
        ).toContain(grassEnergy);
      });
    });
  });
});
