import {
  CardRule,
  CardRuleFactory,
  RuleMetadata,
  PrizeRuleMetadata,
  DamageRuleMetadata,
  AttackRuleMetadata,
} from './card-rule.value-object';
import { CardRuleType } from '../enums/card-rule-type.enum';
import { RulePriority } from '../enums/rule-priority.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { ConditionFactory } from './condition.value-object';

describe('CardRule', () => {
  describe('constructor', () => {
    it('should create a rule with required fields', () => {
      const rule = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        "This Pokémon can't retreat",
      );

      expect(rule.ruleType).toBe(CardRuleType.CANNOT_RETREAT);
      expect(rule.text).toBe("This Pokémon can't retreat");
      expect(rule.priority).toBe(RulePriority.NORMAL);
      expect(rule.conditions).toBeUndefined();
      expect(rule.metadata).toBeUndefined();
    });

    it('should create a rule with all fields', () => {
      const conditions = [ConditionFactory.always()];
      const metadata: PrizeRuleMetadata = {
        category: 'prize',
        prizeCount: 2,
      };

      const rule = new CardRule(
        CardRuleType.EXTRA_PRIZE_CARDS,
        'When Knocked Out, opponent takes 2 more prizes',
        conditions,
        RulePriority.HIGH,
        metadata,
      );

      expect(rule.ruleType).toBe(CardRuleType.EXTRA_PRIZE_CARDS);
      expect(rule.text).toBe('When Knocked Out, opponent takes 2 more prizes');
      expect(rule.conditions).toEqual(conditions);
      expect(rule.priority).toBe(RulePriority.HIGH);
      expect(rule.metadata).toEqual(metadata);
    });

    it('should throw error for missing rule type', () => {
      expect(() => {
        new CardRule(null as any, 'Some text');
      }).toThrow('Rule type is required');
    });

    it('should throw error for invalid rule type', () => {
      expect(() => {
        new CardRule('INVALID_TYPE' as any, 'Some text');
      }).toThrow('Invalid rule type');
    });

    it('should throw error for empty text', () => {
      expect(() => {
        new CardRule(CardRuleType.CANNOT_RETREAT, '');
      }).toThrow('Rule text is required');
    });

    it('should throw error for invalid priority', () => {
      expect(() => {
        new CardRule(
          CardRuleType.CANNOT_RETREAT,
          'Text',
          undefined,
          'INVALID' as any,
        );
      }).toThrow('Invalid rule priority');
    });

    it('should throw error for negative prize count', () => {
      expect(() => {
        new CardRule(
          CardRuleType.EXTRA_PRIZE_CARDS,
          'Text',
          undefined,
          RulePriority.NORMAL,
          { category: 'prize', prizeCount: -1 },
        );
      }).toThrow('Prize count must be at least 1');
    });

    it('should throw error for negative cost reduction', () => {
      expect(() => {
        new CardRule(
          CardRuleType.ATTACK_COST_MODIFICATION,
          'Text',
          undefined,
          RulePriority.NORMAL,
          { category: 'attack', costReduction: -1 },
        );
      }).toThrow('Cost reduction cannot be negative');
    });

    it('should throw error for negative damage reduction', () => {
      expect(() => {
        new CardRule(
          CardRuleType.DAMAGE_REDUCTION_RULE,
          'Text',
          undefined,
          RulePriority.NORMAL,
          { category: 'damage', reductionAmount: -10 },
        );
      }).toThrow('Damage reduction cannot be negative');
    });

    it('should throw error for invalid extra attachments', () => {
      expect(() => {
        new CardRule(
          CardRuleType.EXTRA_ENERGY_ATTACHMENT,
          'Text',
          undefined,
          RulePriority.NORMAL,
          { category: 'energy', extraAttachments: 0 },
        );
      }).toThrow('Extra attachments must be at least 1');
    });
  });

  describe('getPriority', () => {
    it('should return the priority', () => {
      const rule = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.HIGH,
      );

      expect(rule.getPriority()).toBe(RulePriority.HIGH);
    });
  });

  describe('getPriorityValue', () => {
    it('should return correct priority values for sorting', () => {
      const highest = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.HIGHEST,
      );
      const high = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.HIGH,
      );
      const normal = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.NORMAL,
      );
      const low = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.LOW,
      );
      const lowest = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.LOWEST,
      );

      expect(highest.getPriorityValue()).toBe(5);
      expect(high.getPriorityValue()).toBe(4);
      expect(normal.getPriorityValue()).toBe(3);
      expect(low.getPriorityValue()).toBe(2);
      expect(lowest.getPriorityValue()).toBe(1);

      // Verify sorting order
      expect(highest.getPriorityValue()).toBeGreaterThan(
        high.getPriorityValue(),
      );
      expect(high.getPriorityValue()).toBeGreaterThan(normal.getPriorityValue());
      expect(normal.getPriorityValue()).toBeGreaterThan(low.getPriorityValue());
      expect(low.getPriorityValue()).toBeGreaterThan(lowest.getPriorityValue());
    });
  });

  describe('hasConditions', () => {
    it('should return true when conditions exist', () => {
      const rule = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        [ConditionFactory.always()],
      );

      expect(rule.hasConditions()).toBe(true);
    });

    it('should return false when no conditions', () => {
      const rule = new CardRule(CardRuleType.CANNOT_RETREAT, 'Text');

      expect(rule.hasConditions()).toBe(false);
    });
  });

  describe('hasMetadata', () => {
    it('should return true when metadata exists', () => {
      const rule = new CardRule(
        CardRuleType.CANNOT_RETREAT,
        'Text',
        undefined,
        RulePriority.NORMAL,
        { category: 'movement' },
      );

      expect(rule.hasMetadata()).toBe(true);
    });

    it('should return false when no metadata', () => {
      const rule = new CardRule(CardRuleType.CANNOT_RETREAT, 'Text');

      expect(rule.hasMetadata()).toBe(false);
    });
  });
});

describe('CardRuleFactory', () => {
  // ========================================
  // MOVEMENT RULES
  // ========================================

  describe('Movement Rules', () => {
    it('should create cannotRetreat rule', () => {
      const rule = CardRuleFactory.cannotRetreat();

      expect(rule.ruleType).toBe(CardRuleType.CANNOT_RETREAT);
      expect(rule.text).toBe("This Pokémon can't retreat");
      expect(rule.priority).toBe(RulePriority.HIGH);
      expect(rule.metadata).toEqual({ category: 'movement' });
    });

    it('should create freeRetreat rule', () => {
      const rule = CardRuleFactory.freeRetreat();

      expect(rule.ruleType).toBe(CardRuleType.FREE_RETREAT);
      expect(rule.text).toBe("This Pokémon's Retreat Cost is 0");
      expect(rule.priority).toBe(RulePriority.NORMAL);
    });

    it('should create forcedSwitch rule', () => {
      const rule = CardRuleFactory.forcedSwitch('benched');

      expect(rule.ruleType).toBe(CardRuleType.FORCED_SWITCH);
      expect(rule.metadata).toEqual({
        category: 'movement',
        switchTarget: 'benched',
      });
    });
  });

  // ========================================
  // ATTACK RULES
  // ========================================

  describe('Attack Rules', () => {
    it('should create cannotAttack rule', () => {
      const rule = CardRuleFactory.cannotAttack();

      expect(rule.ruleType).toBe(CardRuleType.CANNOT_ATTACK);
      expect(rule.text).toBe("This Pokémon can't attack");
      expect(rule.priority).toBe(RulePriority.HIGH);
    });

    it('should create attackCostReduction rule', () => {
      const rule = CardRuleFactory.attackCostReduction(1);

      expect(rule.ruleType).toBe(CardRuleType.ATTACK_COST_MODIFICATION);
      expect(rule.text).toBe("This Pokémon's attacks cost 1 less Energy");
      expect((rule.metadata as AttackRuleMetadata).costReduction).toBe(1);
    });

    it('should create attackCostReduction with per condition', () => {
      const rule = CardRuleFactory.attackCostReduction(
        1,
        undefined,
        'per damage counter',
      );

      expect(rule.text).toContain('per damage counter');
      expect((rule.metadata as AttackRuleMetadata).perCondition).toBe(
        'per damage counter',
      );
    });
  });

  // ========================================
  // DAMAGE RULES
  // ========================================

  describe('Damage Rules', () => {
    it('should create damageImmunity rule', () => {
      const rule = CardRuleFactory.damageImmunity('Pokémon-EX');

      expect(rule.ruleType).toBe(CardRuleType.DAMAGE_IMMUNITY);
      expect(rule.text).toContain('Pokémon-EX');
      expect(rule.priority).toBe(RulePriority.HIGH);
      expect((rule.metadata as DamageRuleMetadata).immuneFromSubtype).toBe(
        'Pokémon-EX',
      );
    });

    it('should create damageReduction rule', () => {
      const rule = CardRuleFactory.damageReduction(20);

      expect(rule.ruleType).toBe(CardRuleType.DAMAGE_REDUCTION_RULE);
      expect(rule.text).toBe('This Pokémon takes 20 less damage from attacks');
      expect((rule.metadata as DamageRuleMetadata).reductionAmount).toBe(20);
    });
  });

  // ========================================
  // STATUS RULES
  // ========================================

  describe('Status Rules', () => {
    it('should create statusImmunity rule', () => {
      const rule = CardRuleFactory.statusImmunity(['PARALYZED', 'POISONED']);

      expect(rule.ruleType).toBe(CardRuleType.STATUS_IMMUNITY);
      expect(rule.text).toContain('PARALYZED, POISONED');
      expect(rule.priority).toBe(RulePriority.HIGH);
    });

    it('should create effectImmunity rule', () => {
      const rule = CardRuleFactory.effectImmunity();

      expect(rule.ruleType).toBe(CardRuleType.EFFECT_IMMUNITY);
      expect(rule.text).toContain('Prevent all effects');
      expect(rule.priority).toBe(RulePriority.HIGH);
    });
  });

  // ========================================
  // PRIZE RULES
  // ========================================

  describe('Prize Rules', () => {
    it('should create extraPrizeCards rule', () => {
      const rule = CardRuleFactory.extraPrizeCards(2);

      expect(rule.ruleType).toBe(CardRuleType.EXTRA_PRIZE_CARDS);
      expect(rule.text).toContain('2 more Prize cards');
      expect((rule.metadata as PrizeRuleMetadata).prizeCount).toBe(2);
    });

    it('should create noPrizeCards rule', () => {
      const rule = CardRuleFactory.noPrizeCards();

      expect(rule.ruleType).toBe(CardRuleType.NO_PRIZE_CARDS);
      expect(rule.text).toContain("doesn't take any Prize cards");
      expect((rule.metadata as PrizeRuleMetadata).prizeCount).toBe(0);
    });
  });

  // ========================================
  // EVOLUTION RULES
  // ========================================

  describe('Evolution Rules', () => {
    it('should create canEvolveTurnOne rule', () => {
      const rule = CardRuleFactory.canEvolveTurnOne();

      expect(rule.ruleType).toBe(CardRuleType.CAN_EVOLVE_TURN_ONE);
      expect(rule.text).toContain('first turn');
    });

    it('should create cannotEvolve rule', () => {
      const rule = CardRuleFactory.cannotEvolve();

      expect(rule.ruleType).toBe(CardRuleType.CANNOT_EVOLVE);
      expect(rule.text).toBe("This Pokémon can't evolve");
      expect(rule.priority).toBe(RulePriority.HIGH);
    });
  });

  // ========================================
  // PLAY RULES
  // ========================================

  describe('Play Rules', () => {
    it('should create oncePerGame rule', () => {
      const rule = CardRuleFactory.oncePerGame();

      expect(rule.ruleType).toBe(CardRuleType.ONCE_PER_GAME);
      expect(rule.text).toBe('You can use this only once per game');
      expect(rule.priority).toBe(RulePriority.HIGHEST);
    });

    it('should create discardAfterUse rule', () => {
      const rule = CardRuleFactory.discardAfterUse();

      expect(rule.ruleType).toBe(CardRuleType.DISCARD_AFTER_USE);
      expect(rule.text).toBe('Discard this card after you use it');
    });
  });

  // ========================================
  // ENERGY RULES
  // ========================================

  describe('Energy Rules', () => {
    it('should create energyCostReduction rule', () => {
      const rule = CardRuleFactory.energyCostReduction(1);

      expect(rule.ruleType).toBe(CardRuleType.ENERGY_COST_REDUCTION);
      expect(rule.text).toContain('cost 1 less');
    });

    it('should create energyCostReduction with energy type', () => {
      const rule = CardRuleFactory.energyCostReduction(1, EnergyType.FIRE);

      expect(rule.text).toContain('FIRE');
    });

    it('should create extraEnergyAttachment rule', () => {
      const rule = CardRuleFactory.extraEnergyAttachment(2);

      expect(rule.ruleType).toBe(CardRuleType.EXTRA_ENERGY_ATTACHMENT);
      expect(rule.text).toContain('2 extra Energy cards');
    });

    it('should create energyTypeChange rule', () => {
      const rule = CardRuleFactory.energyTypeChange(EnergyType.WATER);

      expect(rule.ruleType).toBe(CardRuleType.ENERGY_TYPE_CHANGE);
      expect(rule.text).toContain('WATER Energy');
    });
  });

  // ========================================
  // REAL POKÉMON CARD EXAMPLES
  // ========================================

  describe('Real Pokémon Card Examples', () => {
    it('should create Pokémon VMAX prize rule', () => {
      const rule = CardRuleFactory.extraPrizeCards(2, [
        ConditionFactory.always(),
      ]);

      expect(rule.ruleType).toBe(CardRuleType.EXTRA_PRIZE_CARDS);
      expect(rule.text).toContain('2 more Prize cards');
      expect((rule.metadata as PrizeRuleMetadata).prizeCount).toBe(2);
    });

    it('should create rooted Pokémon (cannot retreat)', () => {
      const rule = CardRuleFactory.cannotRetreat();

      expect(rule.ruleType).toBe(CardRuleType.CANNOT_RETREAT);
      expect(rule.priority).toBe(RulePriority.HIGH);
    });

    it('should create Giratina Anti-EX (damage immunity)', () => {
      const rule = CardRuleFactory.damageImmunity('Pokémon-EX');

      expect(rule.ruleType).toBe(CardRuleType.DAMAGE_IMMUNITY);
      expect(rule.text).toContain('Pokémon-EX');
      expect(rule.priority).toBe(RulePriority.HIGH);
    });

    it('should create conditional energy cost reduction', () => {
      const rule = CardRuleFactory.attackCostReduction(
        1,
        [ConditionFactory.selfHasDamage()],
        'per damage counter',
      );

      expect(rule.ruleType).toBe(CardRuleType.ATTACK_COST_MODIFICATION);
      expect(rule.hasConditions()).toBe(true);
      expect((rule.metadata as AttackRuleMetadata).perCondition).toBe(
        'per damage counter',
      );
    });

    it('should create status immunity', () => {
      const rule = CardRuleFactory.statusImmunity([
        'PARALYZED',
        'POISONED',
        'BURNED',
      ]);

      expect(rule.ruleType).toBe(CardRuleType.STATUS_IMMUNITY);
      expect(rule.text).toContain('PARALYZED');
      expect(rule.text).toContain('POISONED');
      expect(rule.text).toContain('BURNED');
    });

    it('should create GX attack once per game rule', () => {
      const rule = CardRuleFactory.oncePerGame();

      expect(rule.ruleType).toBe(CardRuleType.ONCE_PER_GAME);
      expect(rule.priority).toBe(RulePriority.HIGHEST);
    });
  });

  // ========================================
  // RULES WITH CONDITIONS
  // ========================================

  describe('Rules with Conditions', () => {
    it('should create rule with single condition', () => {
      const conditions = [ConditionFactory.selfHasDamage()];
      const rule = CardRuleFactory.attackCostReduction(1, conditions);

      expect(rule.hasConditions()).toBe(true);
      expect(rule.conditions).toHaveLength(1);
    });

    it('should create rule with multiple conditions', () => {
      const conditions = [
        ConditionFactory.selfHasDamage(),
        ConditionFactory.selfMinimumEnergy(2),
      ];
      const rule = new CardRule(
        CardRuleType.ATTACK_COST_MODIFICATION,
        'Complex rule',
        conditions,
      );

      expect(rule.hasConditions()).toBe(true);
      expect(rule.conditions).toHaveLength(2);
    });
  });

  // ========================================
  // PRIORITY SORTING
  // ========================================

  describe('Priority Sorting', () => {
    it('should sort rules by priority correctly', () => {
      const rules = [
        CardRuleFactory.attackCostReduction(1), // NORMAL
        CardRuleFactory.oncePerGame(), // HIGHEST
        CardRuleFactory.cannotRetreat(), // HIGH
        CardRuleFactory.discardAfterUse(), // NORMAL
      ];

      const sorted = rules.sort(
        (a, b) => b.getPriorityValue() - a.getPriorityValue(),
      );

      expect(sorted[0].priority).toBe(RulePriority.HIGHEST);
      expect(sorted[1].priority).toBe(RulePriority.HIGH);
      expect(sorted[2].priority).toBe(RulePriority.NORMAL);
      expect(sorted[3].priority).toBe(RulePriority.NORMAL);
    });
  });
});

