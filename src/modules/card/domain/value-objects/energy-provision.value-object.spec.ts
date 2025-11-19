import { EnergyProvision } from './energy-provision.value-object';
import { EnergyType } from '../enums/energy-type.enum';

describe('EnergyProvision Value Object', () => {
  describe('Constructor & Validation', () => {
    it('should create a valid basic energy provision', () => {
      const provision = new EnergyProvision(
        [EnergyType.FIRE],
        1,
        false,
      );

      expect(provision.energyTypes).toEqual([EnergyType.FIRE]);
      expect(provision.amount).toBe(1);
      expect(provision.isSpecial).toBe(false);
    });

    it('should create a valid special energy provision', () => {
      const provision = new EnergyProvision(
        [EnergyType.COLORLESS],
        2,
        true,
        ["Can't be used for Pokémon Powers"],
      );

      expect(provision.energyTypes).toEqual([EnergyType.COLORLESS]);
      expect(provision.amount).toBe(2);
      expect(provision.isSpecial).toBe(true);
      expect(provision.restrictions).toHaveLength(1);
    });

    it('should throw error if energy types is empty', () => {
      expect(() => {
        new EnergyProvision(
          [],
          1,
          false,
        );
      }).toThrow('At least one energy type is required');
    });

    it('should throw error if energy types is null', () => {
      expect(() => {
        new EnergyProvision(
          null as any,
          1,
          false,
        );
      }).toThrow('At least one energy type is required');
    });

    it('should throw error if energy type is invalid', () => {
      expect(() => {
        new EnergyProvision(
          ['INVALID_TYPE' as any],
          1,
          false,
        );
      }).toThrow('Invalid energy type');
    });

    it('should throw error if amount is less than 1', () => {
      expect(() => {
        new EnergyProvision(
          [EnergyType.WATER],
          0,
          false,
        );
      }).toThrow('Energy amount must be at least 1');
    });

    it('should require isSpecial=true for amount > 1', () => {
      expect(() => {
        new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          false,
        );
      }).toThrow('Energy cards with multiple energy, restrictions, or effects must be marked as special');
    });

    it('should require isSpecial=true when restrictions present', () => {
      expect(() => {
        new EnergyProvision(
          [EnergyType.GRASS],
          1,
          false,
          ['Some restriction'],
        );
      }).toThrow('Energy cards with multiple energy, restrictions, or effects must be marked as special');
    });

    it('should require isSpecial=true when additional effects present', () => {
      expect(() => {
        new EnergyProvision(
          [EnergyType.PSYCHIC],
          1,
          false,
          undefined,
          'Some effect',
        );
      }).toThrow('Energy cards with multiple energy, restrictions, or effects must be marked as special');
    });
  });

  describe('Helper Methods', () => {
    describe('isBasicEnergy', () => {
      it('should return true for basic energy', () => {
        const provision = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );

        expect(provision.isBasicEnergy()).toBe(true);
      });

      it('should return false for special energy', () => {
        const provision = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
        );

        expect(provision.isBasicEnergy()).toBe(false);
      });

      it('should return false if has restrictions', () => {
        const provision = new EnergyProvision(
          [EnergyType.GRASS],
          1,
          true,
          ['Restriction'],
        );

        expect(provision.isBasicEnergy()).toBe(false);
      });
    });

    describe('getPrimaryType', () => {
      it('should return the first energy type', () => {
        const provision = new EnergyProvision(
          [EnergyType.ELECTRIC, EnergyType.WATER],
          1,
          true,
        );

        expect(provision.getPrimaryType()).toBe(EnergyType.ELECTRIC);
      });
    });

    describe('providesType', () => {
      it('should return true if provides the specified type', () => {
        const provision = new EnergyProvision(
          [EnergyType.FIGHTING],
          1,
          false,
        );

        expect(provision.providesType(EnergyType.FIGHTING)).toBe(true);
      });

      it('should return false if does not provide the specified type', () => {
        const provision = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );

        expect(provision.providesType(EnergyType.WATER)).toBe(false);
      });

      it('should work with multiple energy types', () => {
        const provision = new EnergyProvision(
          [EnergyType.GRASS, EnergyType.PSYCHIC],
          1,
          true,
        );

        expect(provision.providesType(EnergyType.GRASS)).toBe(true);
        expect(provision.providesType(EnergyType.PSYCHIC)).toBe(true);
        expect(provision.providesType(EnergyType.FIRE)).toBe(false);
      });
    });

    describe('providesColorless', () => {
      it('should return true if provides colorless energy', () => {
        const provision = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
        );

        expect(provision.providesColorless()).toBe(true);
      });

      it('should return false if does not provide colorless energy', () => {
        const provision = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );

        expect(provision.providesColorless()).toBe(false);
      });
    });

    describe('getTotalEnergy', () => {
      it('should return the amount', () => {
        const provision = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
        );

        expect(provision.getTotalEnergy()).toBe(2);
      });
    });

    describe('hasRestrictions', () => {
      it('should return true if has restrictions', () => {
        const provision = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
          ["Can't be used for Pokémon Powers"],
        );

        expect(provision.hasRestrictions()).toBe(true);
      });

      it('should return false if no restrictions', () => {
        const provision = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );

        expect(provision.hasRestrictions()).toBe(false);
      });
    });

    describe('hasAdditionalEffects', () => {
      it('should return true if has additional effects', () => {
        const provision = new EnergyProvision(
          [EnergyType.METAL],
          1,
          true,
          undefined,
          'Reduces damage taken',
        );

        expect(provision.hasAdditionalEffects()).toBe(true);
      });

      it('should return false if no additional effects', () => {
        const provision = new EnergyProvision(
          [EnergyType.WATER],
          1,
          false,
        );

        expect(provision.hasAdditionalEffects()).toBe(false);
      });
    });

    describe('getDescription', () => {
      it('should generate description for basic energy', () => {
        const provision = new EnergyProvision(
          [EnergyType.GRASS],
          1,
          false,
        );

        expect(provision.getDescription()).toBe('Provides GRASS Energy');
      });

      it('should generate description for special energy with amount > 1', () => {
        const provision = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
        );

        expect(provision.getDescription()).toBe('Provides 2 COLORLESS Energy');
      });

      it('should include restrictions in description', () => {
        const provision = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
          ["Can't be used for Pokémon Powers"],
        );

        expect(provision.getDescription()).toContain("Restrictions: Can't be used for Pokémon Powers");
      });

      it('should include additional effects in description', () => {
        const provision = new EnergyProvision(
          [EnergyType.METAL],
          1,
          true,
          undefined,
          'Reduces damage taken by 10',
        );

        expect(provision.getDescription()).toContain('Reduces damage taken by 10');
      });
    });

    describe('equals', () => {
      it('should return true for identical provisions', () => {
        const provision1 = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );
        const provision2 = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );

        expect(provision1.equals(provision2)).toBe(true);
      });

      it('should return false for different energy types', () => {
        const provision1 = new EnergyProvision(
          [EnergyType.FIRE],
          1,
          false,
        );
        const provision2 = new EnergyProvision(
          [EnergyType.WATER],
          1,
          false,
        );

        expect(provision1.equals(provision2)).toBe(false);
      });

      it('should return false for different amounts', () => {
        const provision1 = new EnergyProvision(
          [EnergyType.COLORLESS],
          1,
          true,
        );
        const provision2 = new EnergyProvision(
          [EnergyType.COLORLESS],
          2,
          true,
        );

        expect(provision1.equals(provision2)).toBe(false);
      });
    });
  });
});

