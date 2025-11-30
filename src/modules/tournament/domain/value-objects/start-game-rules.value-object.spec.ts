import {
  StartGameRules,
  StartGameRuleType,
} from './start-game-rules.value-object';

describe('StartGameRules Value Object', () => {
  describe('Creation', () => {
    it('should create start game rules with valid values', () => {
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      expect(rules.rules).toHaveLength(1);
      expect(rules.rules[0].type).toBe(StartGameRuleType.HAS_BASIC_POKEMON);
      expect(rules.rules[0].minCount).toBe(1);
    });

    it('should create rules with multiple rule types', () => {
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 2,
        },
      ]);

      expect(rules.rules).toHaveLength(2);
      expect(rules.rules[0].type).toBe(StartGameRuleType.HAS_BASIC_POKEMON);
      expect(rules.rules[1].type).toBe(StartGameRuleType.HAS_ENERGY_CARD);
      expect(rules.rules[1].minCount).toBe(2);
    });

    it('should create default rules using factory method', () => {
      const rules = StartGameRules.createDefault();

      expect(rules.rules).toHaveLength(1);
      expect(rules.rules[0].type).toBe(StartGameRuleType.HAS_BASIC_POKEMON);
      expect(rules.rules[0].minCount).toBe(1);
    });

    it('should create empty rules using factory method', () => {
      const rules = StartGameRules.createEmpty();

      expect(rules.rules).toHaveLength(0);
      expect(rules.isEmpty()).toBe(true);
    });

    it('should throw error if rules is not an array', () => {
      expect(() => {
        new StartGameRules(null as any);
      }).toThrow('Rules must be an array');
    });

    it('should throw error if rule type is invalid', () => {
      expect(() => {
        new StartGameRules([
          {
            type: 'INVALID_TYPE' as StartGameRuleType,
            minCount: 1,
          },
        ]);
      }).toThrow('Invalid rule type: INVALID_TYPE');
    });

    it('should throw error if minCount is not a number', () => {
      expect(() => {
        new StartGameRules([
          {
            type: StartGameRuleType.HAS_BASIC_POKEMON,
            minCount: '1' as any,
          },
        ]);
      }).toThrow('Min count must be a positive number');
    });

    it('should throw error if minCount is less than 1', () => {
      expect(() => {
        new StartGameRules([
          {
            type: StartGameRuleType.HAS_BASIC_POKEMON,
            minCount: 0,
          },
        ]);
      }).toThrow('Min count must be a positive number');
    });

    it('should throw error if minCount is negative', () => {
      expect(() => {
        new StartGameRules([
          {
            type: StartGameRuleType.HAS_BASIC_POKEMON,
            minCount: -1,
          },
        ]);
      }).toThrow('Min count must be a positive number');
    });
  });

  describe('isEmpty', () => {
    it('should return true when rules array is empty', () => {
      const rules = StartGameRules.createEmpty();

      expect(rules.isEmpty()).toBe(true);
    });

    it('should return false when rules array has items', () => {
      const rules = StartGameRules.createDefault();

      expect(rules.isEmpty()).toBe(false);
    });
  });

  describe('getRulesByType', () => {
    it('should return all rules of a specific type', () => {
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      const basicPokemonRules = rules.getRulesByType(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );

      expect(basicPokemonRules).toHaveLength(2);
      expect(
        basicPokemonRules.every(
          (r) => r.type === StartGameRuleType.HAS_BASIC_POKEMON,
        ),
      ).toBe(true);
    });

    it('should return empty array when no rules of type exist', () => {
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      const energyRules = rules.getRulesByType(
        StartGameRuleType.HAS_ENERGY_CARD,
      );

      expect(energyRules).toHaveLength(0);
    });
  });

  describe('hasRuleType', () => {
    it('should return true when rule type exists', () => {
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      expect(rules.hasRuleType(StartGameRuleType.HAS_BASIC_POKEMON)).toBe(
        true,
      );
    });

    it('should return false when rule type does not exist', () => {
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      expect(rules.hasRuleType(StartGameRuleType.HAS_ENERGY_CARD)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true when rules are identical', () => {
      const rules1 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      const rules2 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      expect(rules1.equals(rules2)).toBe(true);
    });

    it('should return true when rules are identical but in different order', () => {
      const rules1 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 2,
        },
      ]);
      const rules2 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 2,
        },
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      expect(rules1.equals(rules2)).toBe(true);
    });

    it('should return false when rules have different lengths', () => {
      const rules1 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      const rules2 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      expect(rules1.equals(rules2)).toBe(false);
    });

    it('should return false when rules have different types', () => {
      const rules1 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      const rules2 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      expect(rules1.equals(rules2)).toBe(false);
    });

    it('should return false when rules have different minCount', () => {
      const rules1 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      const rules2 = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
      ]);

      expect(rules1.equals(rules2)).toBe(false);
    });
  });
});

