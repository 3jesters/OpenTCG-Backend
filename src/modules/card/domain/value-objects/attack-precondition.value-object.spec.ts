import { EnergyType } from '../enums/energy-type.enum';
import { PreconditionType } from '../enums/precondition-type.enum';
import {
  AttackPreconditionFactory,
  CoinFlipValue,
  DamageCheckValue,
  EnergyCheckValue,
} from './attack-precondition.value-object';

describe('AttackPrecondition Value Objects', () => {
  describe('Type Definitions', () => {
    it('should allow valid CoinFlipValue', () => {
      const coinFlip: CoinFlipValue = {
        numberOfCoins: 2,
      };
      expect(coinFlip.numberOfCoins).toBe(2);
    });

    it('should allow valid DamageCheckValue with has_damage', () => {
      const damageCheck: DamageCheckValue = {
        condition: 'has_damage',
      };
      expect(damageCheck.condition).toBe('has_damage');
    });

    it('should allow valid DamageCheckValue with minimum_damage', () => {
      const damageCheck: DamageCheckValue = {
        condition: 'minimum_damage',
        minimumDamage: 3,
      };
      expect(damageCheck.condition).toBe('minimum_damage');
      expect(damageCheck.minimumDamage).toBe(3);
    });

    it('should allow valid EnergyCheckValue', () => {
      const energyCheck: EnergyCheckValue = {
        energyType: EnergyType.FIRE,
        minimum: 2,
      };
      expect(energyCheck.energyType).toBe(EnergyType.FIRE);
      expect(energyCheck.minimum).toBe(2);
    });
  });

  describe('AttackPreconditionFactory', () => {
    describe('coinFlip', () => {
      it('should create a coin flip precondition', () => {
        const precondition = AttackPreconditionFactory.coinFlip(
          1,
          'Flip a coin',
        );

        expect(precondition.type).toBe(PreconditionType.COIN_FLIP);
        expect(precondition.description).toBe('Flip a coin');
        expect(precondition.value).toEqual({ numberOfCoins: 1 });
      });

      it('should create a multi-coin flip precondition', () => {
        const precondition = AttackPreconditionFactory.coinFlip(
          3,
          'Flip 3 coins',
        );

        const value = precondition.value as CoinFlipValue;
        expect(value.numberOfCoins).toBe(3);
      });
    });

    describe('damageCheck', () => {
      it('should create a has_damage precondition', () => {
        const precondition = AttackPreconditionFactory.damageCheck(
          'has_damage',
          'You can use this attack only if this Pokémon has damage counters',
        );

        expect(precondition.type).toBe(PreconditionType.DAMAGE_CHECK);
        expect(precondition.value).toEqual({
          condition: 'has_damage',
          minimumDamage: undefined,
        });
      });

      it('should create a minimum_damage precondition', () => {
        const precondition = AttackPreconditionFactory.damageCheck(
          'minimum_damage',
          'You can use this attack only if this Pokémon has at least 3 damage counters',
          3,
        );

        const value = precondition.value as DamageCheckValue;
        expect(value.condition).toBe('minimum_damage');
        expect(value.minimumDamage).toBe(3);
      });

      it('should create a no_damage precondition', () => {
        const precondition = AttackPreconditionFactory.damageCheck(
          'no_damage',
          'You can use this attack only if this Pokémon has no damage counters',
        );

        const value = precondition.value as DamageCheckValue;
        expect(value.condition).toBe('no_damage');
      });
    });

    describe('energyCheck', () => {
      it('should create an energy check precondition', () => {
        const precondition = AttackPreconditionFactory.energyCheck(
          EnergyType.FIRE,
          2,
          'This attack can be used only if this Pokémon has at least 2 Fire Energy',
        );

        expect(precondition.type).toBe(PreconditionType.ENERGY_CHECK);
        const value = precondition.value as EnergyCheckValue;
        expect(value.energyType).toBe(EnergyType.FIRE);
        expect(value.minimum).toBe(2);
      });

      it('should create energy check with different energy types', () => {
        const waterCheck = AttackPreconditionFactory.energyCheck(
          EnergyType.WATER,
          1,
          'Requires Water energy',
        );

        const value = waterCheck.value as EnergyCheckValue;
        expect(value.energyType).toBe(EnergyType.WATER);
      });
    });
  });
});
