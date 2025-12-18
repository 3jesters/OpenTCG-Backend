import { LegacyAbilityAdapter } from './legacy-ability.adapter';
import { LegacyAbilityType } from '../../domain/enums/legacy-ability-type.enum';
import { AbilityActivationType } from '../../domain/enums/ability-activation-type.enum';
import { UsageLimit } from '../../domain/enums/usage-limit.enum';
import { GameEventType } from '../../domain/enums/game-event-type.enum';
import { AbilityEffectFactory } from '../../domain/value-objects/ability-effect.value-object';
import { PokemonType } from '../../domain/enums/pokemon-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';

describe('LegacyAbilityAdapter', () => {
  describe('toAbility', () => {
    it('should convert Poké-Body to PASSIVE ability', () => {
      const legacyData = {
        name: 'Blaze',
        text: 'All your Fire Pokémon do 10 more damage',
        legacyType: LegacyAbilityType.POKE_BODY,
        effects: [
          AbilityEffectFactory.boostAttack(TargetType.ALL_YOURS, 10, [
            PokemonType.FIRE,
          ]),
        ],
      };

      const ability = LegacyAbilityAdapter.toAbility(legacyData);

      expect(ability.name).toBe('Blaze');
      expect(ability.activationType).toBe(AbilityActivationType.PASSIVE);
      expect(ability.usageLimit).toBeUndefined();
      expect(ability.triggerEvent).toBeUndefined();
    });

    it('should convert Poké-Power to ACTIVATED ability with ONCE_PER_TURN', () => {
      const legacyData = {
        name: 'Psy Shadow',
        text: 'Once during your turn, you may draw 2 cards',
        legacyType: LegacyAbilityType.POKE_POWER,
        effects: [AbilityEffectFactory.drawCards(2)],
      };

      const ability = LegacyAbilityAdapter.toAbility(legacyData);

      expect(ability.name).toBe('Psy Shadow');
      expect(ability.activationType).toBe(AbilityActivationType.ACTIVATED);
      expect(ability.usageLimit).toBe(UsageLimit.ONCE_PER_TURN);
    });

    it('should convert Pokémon Power to ACTIVATED ability by default', () => {
      const legacyData = {
        name: 'Energy Burn',
        text: 'As often as you like during your turn, you may change a Fire Energy attached',
        legacyType: LegacyAbilityType.POKEMON_POWER,
        effects: [AbilityEffectFactory.drawCards(1)], // Placeholder effect for testing
      };

      const ability = LegacyAbilityAdapter.toAbility(legacyData);

      expect(ability.activationType).toBe(AbilityActivationType.ACTIVATED);
      expect(ability.usageLimit).toBe(UsageLimit.ONCE_PER_TURN);
    });

    it('should convert Pokémon Power to TRIGGERED ability if trigger event provided', () => {
      const legacyData = {
        name: 'Damage Swap',
        text: 'When this Pokémon is played, move damage counters',
        legacyType: LegacyAbilityType.POKEMON_POWER,
        effects: [AbilityEffectFactory.heal(TargetType.BENCHED_YOURS, 10)],
        triggerEvent: GameEventType.WHEN_PLAYED,
      };

      const ability = LegacyAbilityAdapter.toAbility(legacyData);

      expect(ability.activationType).toBe(AbilityActivationType.TRIGGERED);
      expect(ability.triggerEvent).toBe(GameEventType.WHEN_PLAYED);
    });

    it('should throw error for unknown legacy type', () => {
      const legacyData = {
        name: 'Test',
        text: 'Test ability',
        legacyType: 'UNKNOWN' as any,
        effects: [],
      };

      expect(() => {
        LegacyAbilityAdapter.toAbility(legacyData);
      }).toThrow('Unknown legacy ability type');
    });
  });

  describe('detectLegacyType', () => {
    it('should detect Poké-Power from "once during your turn" pattern', () => {
      const text = 'Once during your turn, you may draw 2 cards';
      const detected = LegacyAbilityAdapter.detectLegacyType(text);

      expect(detected).toBe(LegacyAbilityType.POKE_POWER);
    });

    it('should detect Poké-Body from "all your" pattern', () => {
      const text = 'All your Fire Pokémon do 10 more damage';
      const detected = LegacyAbilityAdapter.detectLegacyType(text);

      expect(detected).toBe(LegacyAbilityType.POKE_BODY);
    });

    it('should detect Poké-Body from "as long as" pattern', () => {
      const text = 'As long as this Pokémon is your Active, prevent all damage';
      const detected = LegacyAbilityAdapter.detectLegacyType(text);

      expect(detected).toBe(LegacyAbilityType.POKE_BODY);
    });

    it('should detect Poké-Body from "prevent all" pattern', () => {
      const text = 'Prevent all damage done to this Pokémon';
      const detected = LegacyAbilityAdapter.detectLegacyType(text);

      expect(detected).toBe(LegacyAbilityType.POKE_BODY);
    });

    it('should default to Pokémon Power for ambiguous text', () => {
      const text = 'Move damage counters around';
      const detected = LegacyAbilityAdapter.detectLegacyType(text);

      expect(detected).toBe(LegacyAbilityType.POKEMON_POWER);
    });
  });

  describe('fromLegacyText', () => {
    it('should create ability from legacy text with auto-detection', () => {
      const ability = LegacyAbilityAdapter.fromLegacyText(
        'Blaze',
        'All your Fire Pokémon do 10 more damage',
        [
          AbilityEffectFactory.boostAttack(TargetType.ALL_YOURS, 10, [
            PokemonType.FIRE,
          ]),
        ],
      );

      expect(ability.name).toBe('Blaze');
      expect(ability.activationType).toBe(AbilityActivationType.PASSIVE);
    });

    it('should create ability with trigger event if provided', () => {
      const ability = LegacyAbilityAdapter.fromLegacyText(
        'Coming Up',
        'When you play this Pokémon, draw a card',
        [AbilityEffectFactory.drawCards(1)],
        GameEventType.WHEN_PLAYED,
      );

      expect(ability.activationType).toBe(AbilityActivationType.TRIGGERED);
      expect(ability.triggerEvent).toBe(GameEventType.WHEN_PLAYED);
    });
  });

  describe('getLegacyTypeDescription', () => {
    it('should return description for Pokémon Power', () => {
      const desc = LegacyAbilityAdapter.getLegacyTypeDescription(
        LegacyAbilityType.POKEMON_POWER,
      );

      expect(desc).toContain('Pokémon Power');
      expect(desc).toContain('1999-2003');
    });

    it('should return description for Poké-Body', () => {
      const desc = LegacyAbilityAdapter.getLegacyTypeDescription(
        LegacyAbilityType.POKE_BODY,
      );

      expect(desc).toContain('Poké-Body');
      expect(desc).toContain('Always active');
    });

    it('should return description for Poké-Power', () => {
      const desc = LegacyAbilityAdapter.getLegacyTypeDescription(
        LegacyAbilityType.POKE_POWER,
      );

      expect(desc).toContain('Poké-Power');
      expect(desc).toContain('Activated');
    });
  });

  describe('Real Legacy Card Examples', () => {
    it('should convert Charizard Base Set "Energy Burn" (Pokémon Power)', () => {
      const ability = LegacyAbilityAdapter.toAbility({
        name: 'Energy Burn',
        text: 'As often as you like during your turn (before your attack), you may turn all Energy attached to Charizard into Fire Energy for the rest of the turn',
        legacyType: LegacyAbilityType.POKEMON_POWER,
        effects: [AbilityEffectFactory.drawCards(1)], // Placeholder effect for testing
      });

      expect(ability.activationType).toBe(AbilityActivationType.ACTIVATED);
      expect(ability.usageLimit).toBe(UsageLimit.ONCE_PER_TURN);
    });

    it('should convert Blaziken EX "Blaze" (Poké-Body)', () => {
      const ability = LegacyAbilityAdapter.toAbility({
        name: 'Blaze',
        text: 'All Fire Energy attached to your Fire Pokémon provides Fire Energy. This power stops working while Blaziken is affected by a Special Condition',
        legacyType: LegacyAbilityType.POKE_BODY,
        effects: [AbilityEffectFactory.boostAttack(TargetType.SELF, 10)],
      });

      expect(ability.activationType).toBe(AbilityActivationType.PASSIVE);
    });

    it('should convert Gardevoir EX "Psy Shadow" (Poké-Power)', () => {
      const ability = LegacyAbilityAdapter.toAbility({
        name: 'Psy Shadow',
        text: 'Once during your turn (before your attack), you may search your discard pile for a Psychic Energy card and attach it to Gardevoir',
        legacyType: LegacyAbilityType.POKE_POWER,
        effects: [AbilityEffectFactory.drawCards(1)],
      });

      expect(ability.activationType).toBe(AbilityActivationType.ACTIVATED);
      expect(ability.usageLimit).toBe(UsageLimit.ONCE_PER_TURN);
    });

    it('should handle Pokémon Power with trigger event', () => {
      const ability = LegacyAbilityAdapter.toAbility({
        name: 'Healing Rain',
        text: 'When you play this Pokémon from your hand, heal 10 damage from each of your Pokémon',
        legacyType: LegacyAbilityType.POKEMON_POWER,
        effects: [AbilityEffectFactory.heal(TargetType.ALL_YOURS, 10)],
        triggerEvent: GameEventType.WHEN_PLAYED,
      });

      expect(ability.activationType).toBe(AbilityActivationType.TRIGGERED);
      expect(ability.triggerEvent).toBe(GameEventType.WHEN_PLAYED);
    });
  });
});
