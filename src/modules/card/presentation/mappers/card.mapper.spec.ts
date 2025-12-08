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
  TrainerType,
  TrainerEffectType,
  TargetType,
} from '../../domain/enums';
import { AbilityEffectFactory } from '../../domain/value-objects/ability-effect.value-object';
import { CardSummaryDto } from '../dto/card-summary.dto';
import { CardDetailDto } from '../dto/card-detail.dto';
import { Attack, Ability, Weakness, Resistance, TrainerEffect } from '../../domain/value-objects';

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
        [AbilityEffectFactory.drawCards(1)], // At least one effect required
        undefined,
        undefined, // PASSIVE abilities should not have usage limits
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

    it('should map trainer card with trainerEffects', () => {
      // Arrange
      const trainerCard = Card.createTrainerCard(
        'uuid-999',
        'pokemon-base-set-v1.0-bill-92',
        '000',
        'Bill',
        'Base Set',
        '92',
        Rarity.COMMON,
        'Draw 2 cards.',
        'Ken Sugimori',
        'https://example.com/bill.png',
      );
      trainerCard.setTrainerType(TrainerType.SUPPORTER);

      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        2,
        undefined,
        undefined,
        'Draw 2 cards',
      );
      trainerCard.addTrainerEffect(drawEffect);

      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(trainerCard);

      // Assert
      expect(result.cardId).toBe('pokemon-base-set-v1.0-bill-92');
      expect(result.cardType).toBe(CardType.TRAINER);
      expect(result.trainerType).toBe(TrainerType.SUPPORTER);
      expect(result.trainerEffects).toBeDefined();
      expect(result.trainerEffects!.length).toBe(1);
      expect(result.trainerEffects![0].effectType).toBe(TrainerEffectType.DRAW_CARDS);
      expect(result.trainerEffects![0].target).toBe(TargetType.SELF);
      expect(result.trainerEffects![0].value).toBe(2);
      expect(result.trainerEffects![0].description).toBe('Draw 2 cards');
    });

    it('should map trainer card with multiple trainerEffects', () => {
      // Arrange
      const trainerCard = Card.createTrainerCard(
        'uuid-888',
        'pokemon-base-set-v1.0-computer-search-73',
        '000',
        'Computer Search',
        'Base Set',
        '73',
        Rarity.RARE,
        'Discard 2 cards, search deck for any card',
        'Keiji Kinebuchi',
        'https://example.com/computer-search.png',
      );
      trainerCard.setTrainerType(TrainerType.ITEM);

      const discardEffect = new TrainerEffect(
        TrainerEffectType.DISCARD_HAND,
        TargetType.SELF,
        2,
        undefined,
        undefined,
        'Discard 2 cards from your hand',
      );
      trainerCard.addTrainerEffect(discardEffect);

      const searchEffect = new TrainerEffect(
        TrainerEffectType.SEARCH_DECK,
        TargetType.SELF,
        1,
        'Any',
        undefined,
        'Search your deck for any card',
      );
      trainerCard.addTrainerEffect(searchEffect);

      const shuffleEffect = new TrainerEffect(
        TrainerEffectType.SHUFFLE_DECK,
        TargetType.SELF,
        undefined,
        undefined,
        undefined,
        'Shuffle your deck',
      );
      trainerCard.addTrainerEffect(shuffleEffect);

      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(trainerCard);

      // Assert
      expect(result.trainerType).toBe(TrainerType.ITEM);
      expect(result.trainerEffects).toBeDefined();
      expect(result.trainerEffects!.length).toBe(3);
      expect(result.trainerEffects![0].effectType).toBe(TrainerEffectType.DISCARD_HAND);
      expect(result.trainerEffects![1].effectType).toBe(TrainerEffectType.SEARCH_DECK);
      expect(result.trainerEffects![1].cardType).toBe('Any');
      expect(result.trainerEffects![2].effectType).toBe(TrainerEffectType.SHUFFLE_DECK);
    });

    it('should return undefined for trainerEffects when card has no effects', () => {
      // Arrange
      const trainerCard = Card.createTrainerCard(
        'uuid-777',
        'pokemon-base-set-v1.0-empty-trainer-00',
        '000',
        'Empty Trainer',
        'Base Set',
        '00',
        Rarity.COMMON,
        'No effects',
        'Artist',
        'https://example.com/empty.png',
      );
      trainerCard.setTrainerType(TrainerType.ITEM);

      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(trainerCard);

      // Assert
      expect(result.trainerType).toBe(TrainerType.ITEM);
      expect(result.trainerEffects).toBeUndefined();
    });

    it('should return undefined for trainerType and trainerEffects for Pokémon cards', () => {
      // Act
      const result: CardDetailDto = CardMapper.toCardDetailDto(mockCard);

      // Assert
      expect(result.trainerType).toBeUndefined();
      expect(result.trainerEffects).toBeUndefined();
    });
  });
});

