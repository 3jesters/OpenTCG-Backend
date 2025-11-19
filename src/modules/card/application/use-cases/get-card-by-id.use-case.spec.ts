import { GetCardByIdUseCase } from './get-card-by-id.use-case';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { Card } from '../../domain/entities/card.entity';
import {
  CardType,
  Rarity,
  PokemonType,
  EvolutionStage,
  EnergyType,
  AbilityActivationType,
  UsageLimit,
} from '../../domain/enums';
import { Attack, Ability, Weakness } from '../../domain/value-objects';
import { NotFoundException } from '@nestjs/common';

describe('GetCardByIdUseCase', () => {
  let useCase: GetCardByIdUseCase;
  let mockCardCache: jest.Mocked<ICardCache>;

  beforeEach(() => {
    mockCardCache = {
      getAllSetsMetadata: jest.fn(),
      loadCards: jest.fn(),
      isSetLoaded: jest.fn(),
      getCard: jest.fn(),
      getAllCards: jest.fn(),
      getCardsBySet: jest.fn(),
      getSetMetadata: jest.fn(),
      clear: jest.fn(),
      clearSet: jest.fn(),
    };

    useCase = new GetCardByIdUseCase(mockCardCache);
  });

  describe('execute', () => {
    it('should throw NotFoundException when card does not exist', async () => {
      // Arrange
      mockCardCache.getCard.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute('non-existent-card-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent-card-id')).rejects.toThrow(
        'Card not found: non-existent-card-id',
      );
    });

    it('should return basic card details for a simple Pokemon card', async () => {
      // Arrange
      const mockCard = Card.createPokemonCard(
        'uuid-123',
        'pokemon-base-set-v1.0-pikachu-25',
        '025',
        'Pikachu',
        'Base Set',
        '25',
        Rarity.COMMON,
        'Mouse Pokémon',
        'Mitsuhiro Arita',
        'https://example.com/pikachu.png',
      );
      mockCard.setPokemonType(PokemonType.LIGHTNING);
      mockCard.setHp(60);
      mockCard.setRetreatCost(1);

      mockCardCache.getCard.mockReturnValue(mockCard);

      // Act
      const result = await useCase.execute('pokemon-base-set-v1.0-pikachu-25');

      // Assert
      expect(result.card).toBeDefined();
      expect(result.card.cardId).toBe('pokemon-base-set-v1.0-pikachu-25');
      expect(result.card.name).toBe('Pikachu');
      expect(result.card.pokemonNumber).toBe('025');
      expect(result.card.cardNumber).toBe('25');
      expect(result.card.hp).toBe(60);
      expect(result.card.pokemonType).toBe(PokemonType.LIGHTNING);
      expect(result.card.retreatCost).toBe(1);
      expect(result.card.artist).toBe('Mitsuhiro Arita');

      expect(mockCardCache.getCard).toHaveBeenCalledWith(
        'pokemon-base-set-v1.0-pikachu-25',
      );
    });

    it('should return full card details including ability, attacks, and weakness', async () => {
      // Arrange
      const mockCard = Card.createPokemonCard(
        'uuid-456',
        'pokemon-base-set-v1.0-alakazam-1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Its brain can outperform a supercomputer.',
        'Ken Sugimori',
        'https://example.com/alakazam.png',
      );
      mockCard.setPokemonType(PokemonType.PSYCHIC);
      mockCard.setHp(80);
      mockCard.setRetreatCost(3);

      // Add ability
      const ability = new Ability(
        'Damage Swap',
        'As often as you like during your turn...',
        AbilityActivationType.ACTIVATED,
        [],
        undefined,
        UsageLimit.UNLIMITED,
      );
      mockCard.setAbility(ability);

      // Add attack
      const attack = new Attack(
        'Confuse Ray',
        [EnergyType.PSYCHIC, EnergyType.PSYCHIC, EnergyType.PSYCHIC],
        '30',
        'Flip a coin. If heads, the Defending Pokémon is now Confused.',
      );
      mockCard.addAttack(attack);

      // Add weakness
      const weakness = new Weakness(EnergyType.PSYCHIC, '×2');
      mockCard.setWeakness(weakness);

      mockCardCache.getCard.mockReturnValue(mockCard);

      // Act
      const result = await useCase.execute('pokemon-base-set-v1.0-alakazam-1');

      // Assert
      expect(result.card).toBeDefined();
      expect(result.card.name).toBe('Alakazam');
      expect(result.card.hp).toBe(80);

      // Check ability
      expect(result.card.ability).toBeDefined();
      expect(result.card.ability!.name).toBe('Damage Swap');
      expect(result.card.ability!.activationType).toBe(
        AbilityActivationType.ACTIVATED,
      );

      // Check attacks
      expect(result.card.attacks).toHaveLength(1);
      expect(result.card.attacks![0].name).toBe('Confuse Ray');
      expect(result.card.attacks![0].damage).toBe('30');
      expect(result.card.attacks![0].energyCost).toHaveLength(3);

      // Check weakness
      expect(result.card.weakness).toBeDefined();
      expect(result.card.weakness!.type).toBe(EnergyType.PSYCHIC);
      expect(result.card.weakness!.modifier).toBe('×2');
    });
  });
});

