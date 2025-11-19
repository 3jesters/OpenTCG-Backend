import { CardMapper } from './card.mapper';
import { Card } from '../../domain/entities/card.entity';
import {
  CardType,
  PokemonType,
  Rarity,
  EvolutionStage,
  EnergyType,
  AbilityActivationType,
  UsageLimit,
} from '../../domain/enums';
import { CardSummaryDto } from '../dto/card-summary.dto';
import { CardDetailDto } from '../dto/card-detail.dto';
import { Attack, Ability, Weakness, Resistance } from '../../domain/value-objects';

describe('CardMapper', () => {
  let mockCard: Card;

  beforeEach(() => {
    // Create a basic Pokémon card for testing
    mockCard = Card.createPokemonCard(
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
    mockCard.setStage(EvolutionStage.BASIC);
    mockCard.setHp(60);
    mockCard.setRetreatCost(1);
  });

  describe('toCardSummaryDto', () => {
    it('should map Card to CardSummaryDto with required fields', () => {
      // Act
      const result: CardSummaryDto = CardMapper.toCardSummaryDto(mockCard);

      // Assert
      expect(result.cardId).toBe('pokemon-base-set-v1.0-pikachu-25');
      expect(result.instanceId).toBe('uuid-123');
      expect(result.name).toBe('Pikachu');
      expect(result.cardNumber).toBe('25');
      expect(result.setName).toBe('Base Set');
      expect(result.cardType).toBe(CardType.POKEMON);
      expect(result.pokemonType).toBe(PokemonType.LIGHTNING);
      expect(result.rarity).toBe(Rarity.COMMON);
      expect(result.hp).toBe(60);
      expect(result.imageUrl).toBe('https://example.com/pikachu.png');
    });

    it('should handle card without pokemonType', () => {
      // Arrange
      const trainerCard = Card.createTrainerCard(
        'uuid-456',
        'pokemon-base-set-v1.0-professor-oak-88',
        '000',
        'Professor Oak',
        'Base Set',
        '88',
        Rarity.UNCOMMON,
        'Draw 7 cards',
        'Ken Sugimori',
        'https://example.com/oak.png',
      );

      // Act
      const result: CardSummaryDto = CardMapper.toCardSummaryDto(trainerCard);

      // Assert
      expect(result.cardType).toBe(CardType.TRAINER);
      expect(result.pokemonType).toBeUndefined();
      expect(result.hp).toBeUndefined();
    });
  });

  describe('toCardDetailDto', () => {
    it('should map Card to CardDetailDto with all Pokémon fields', () => {
      // Arrange
      const attack = new Attack(
        'Thunder Shock',
        [EnergyType.LIGHTNING, EnergyType.COLORLESS],
        '30',
        'Flip a coin. If tails, Pikachu does 10 damage to itself.',
      );
      mockCard.addAttack(attack);

      const ability = new Ability(
        'Static',
        'When attacked, flip a coin. If heads, the attacking Pokémon is paralyzed.',
        AbilityActivationType.PASSIVE,
        [],
        undefined,
        UsageLimit.UNLIMITED,
      );
      mockCard.setAbility(ability);

      const weakness = new Weakness(EnergyType.FIGHTING, '×2');
      mockCard.setWeakness(weakness);

      const resistance = new Resistance(EnergyType.METAL, '-20');
      mockCard.setResistance(resistance);

      mockCard.setLevel(12);
      mockCard.setRegulationMark('E');

      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(mockCard);

      // Assert
      expect(result.cardId).toBe('pokemon-base-set-v1.0-pikachu-25');
      expect(result.instanceId).toBe('uuid-123');
      expect(result.name).toBe('Pikachu');
      expect(result.pokemonNumber).toBe('025');
      expect(result.cardNumber).toBe('25');
      expect(result.setName).toBe('Base Set');
      expect(result.cardType).toBe(CardType.POKEMON);
      expect(result.pokemonType).toBe(PokemonType.LIGHTNING);
      expect(result.rarity).toBe(Rarity.COMMON);
      expect(result.hp).toBe(60);
      expect(result.stage).toBe(EvolutionStage.BASIC);
      expect(result.level).toBe(12);
      expect(result.retreatCost).toBe(1);
      expect(result.artist).toBe('Mitsuhiro Arita');
      expect(result.description).toBe('Mouse Pokémon');
      expect(result.imageUrl).toBe('https://example.com/pikachu.png');
      expect(result.regulationMark).toBe('E');

      // Check ability mapping
      expect(result.ability).toBeDefined();
      expect(result.ability!.name).toBe('Static');
      expect(result.ability!.text).toBe('When attacked, flip a coin. If heads, the attacking Pokémon is paralyzed.');
      expect(result.ability!.activationType).toBe(AbilityActivationType.PASSIVE);

      // Check attack mapping
      expect(result.attacks).toBeDefined();
      expect(result.attacks!.length).toBe(1);
      expect(result.attacks![0].name).toBe('Thunder Shock');
      expect(result.attacks![0].damage).toBe('30');
      expect(result.attacks![0].energyCost).toEqual([EnergyType.LIGHTNING, EnergyType.COLORLESS]);

      // Check weakness mapping
      expect(result.weakness).toBeDefined();
      expect(result.weakness!.type).toBe(EnergyType.FIGHTING);
      expect(result.weakness!.modifier).toBe('×2');

      // Check resistance mapping
      expect(result.resistance).toBeDefined();
      expect(result.resistance!.type).toBe(EnergyType.METAL);
      expect(result.resistance!.modifier).toBe('-20');
    });

    it('should handle card without optional fields', () => {
      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(mockCard);

      // Assert
      expect(result.ability).toBeUndefined();
      expect(result.attacks).toEqual([]);
      expect(result.weakness).toBeUndefined();
      expect(result.resistance).toBeUndefined();
      expect(result.level).toBeUndefined();
      expect(result.regulationMark).toBeUndefined();
      expect(result.evolvesFrom).toBeUndefined();
    });

    it('should map evolvesFrom when present', () => {
      // Arrange
      const evolutionCard = Card.createPokemonCard(
        'uuid-789',
        'pokemon-base-set-v1.0-raichu-14',
        '026',
        'Raichu',
        'Base Set',
        '14',
        Rarity.RARE,
        'Mouse Pokémon (evolved)',
        'Ken Sugimori',
        'https://example.com/raichu.png',
      );
      evolutionCard.setPokemonType(PokemonType.LIGHTNING);
      evolutionCard.setStage(EvolutionStage.STAGE_1);
      evolutionCard.setHp(90);

      const evolution = new (require('../../domain/value-objects').Evolution)(
        '025',
        EvolutionStage.BASIC,
        'Pikachu',
        undefined,
      );
      evolutionCard.setEvolvesFrom(evolution);

      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(evolutionCard);

      // Assert
      expect(result.evolvesFrom).toBe('Pikachu');
      expect(result.stage).toBe(EvolutionStage.STAGE_1);
    });
  });
});

