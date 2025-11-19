import { CardRuleValidator } from './card-rule.validator';
import { CardRule, CardRuleFactory } from '../value-objects/card-rule.value-object';
import { CardRuleType } from '../enums/card-rule-type.enum';
import { RulePriority } from '../enums/rule-priority.enum';
import { ConditionFactory } from '../value-objects/condition.value-object';

describe('CardRuleValidator', () => {
  describe('validate', () => {
    describe('Basic validation', () => {
      it('should validate a valid rule', () => {
        const rule = CardRuleFactory.cannotRetreat();

        expect(() => {
          CardRuleValidator.validate(rule);
        }).not.toThrow();
      });

      it('should throw error for missing rule type', () => {
        const rule = {
          ruleType: null,
          text: 'Some text',
          priority: RulePriority.NORMAL,
        } as any;

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Rule type is required');
      });

      it('should throw error for invalid rule type', () => {
        const rule = {
          ruleType: 'INVALID_TYPE',
          text: 'Some text',
          priority: RulePriority.NORMAL,
        } as any;

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Invalid rule type');
      });

      it('should throw error for empty text', () => {
        const rule = {
          ruleType: CardRuleType.CANNOT_RETREAT,
          text: '',
          priority: RulePriority.NORMAL,
        } as any;

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Rule text is required');
      });

      it('should throw error for whitespace-only text', () => {
        const rule = {
          ruleType: CardRuleType.CANNOT_RETREAT,
          text: '   ',
          priority: RulePriority.NORMAL,
        } as any;

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Rule text is required');
      });

      it('should throw error for invalid priority', () => {
        const rule = {
          ruleType: CardRuleType.CANNOT_RETREAT,
          text: 'Text',
          priority: 'INVALID_PRIORITY',
        } as any;

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Invalid rule priority');
      });
    });

    describe('Conditions validation', () => {
      it('should validate rule with valid conditions', () => {
        const rule = new CardRule(
          CardRuleType.CANNOT_RETREAT,
          'Text',
          [ConditionFactory.always()],
        );

        expect(() => {
          CardRuleValidator.validate(rule);
        }).not.toThrow();
      });

      it('should throw error for invalid conditions', () => {
        const rule = {
          ruleType: CardRuleType.CANNOT_RETREAT,
          text: 'Text',
          priority: RulePriority.NORMAL,
          conditions: [{ type: 'INVALID_TYPE' }],
        } as any;

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Invalid conditions');
      });
    });

    describe('Metadata validation', () => {
      describe('Movement metadata', () => {
        it('should validate valid movement metadata', () => {
          const rule = CardRuleFactory.forcedSwitch('benched');

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error for invalid switch target', () => {
          const rule = new CardRule(
            CardRuleType.FORCED_SWITCH,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'movement', switchTarget: 'invalid' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Switch target must be "benched" or "random"');
        });

        it('should throw error if allowed actions is not an array', () => {
          const rule = new CardRule(
            CardRuleType.FORCED_SWITCH,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'movement', allowedActions: 'not-array' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Allowed actions must be an array');
        });
      });

      describe('Attack metadata', () => {
        it('should validate valid attack metadata', () => {
          const rule = CardRuleFactory.attackCostReduction(1);

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error for negative cost reduction', () => {
          const rule = new CardRule(
            CardRuleType.ATTACK_COST_MODIFICATION,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'attack', costReduction: -1 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Cost reduction cannot be negative');
        });

        it('should throw error for negative cost increase', () => {
          const rule = new CardRule(
            CardRuleType.ATTACK_COST_MODIFICATION,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'attack', costIncrease: -1 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Cost increase cannot be negative');
        });

        it('should throw error if affected attacks is not an array', () => {
          const rule = new CardRule(
            CardRuleType.ATTACK_COST_MODIFICATION,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'attack', affectedAttacks: 'not-array' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Affected attacks must be an array');
        });
      });

      describe('Damage metadata', () => {
        it('should validate valid damage metadata', () => {
          const rule = CardRuleFactory.damageReduction(20);

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error for negative reduction amount', () => {
          const rule = new CardRule(
            CardRuleType.DAMAGE_REDUCTION_RULE,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'damage', reductionAmount: -10 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Reduction amount cannot be negative');
        });

        it('should throw error for negative increase amount', () => {
          const rule = new CardRule(
            CardRuleType.INCREASED_DAMAGE_TAKEN,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'damage', increaseAmount: -10 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Increase amount cannot be negative');
        });

        it('should throw error if immune from is not an array', () => {
          const rule = new CardRule(
            CardRuleType.DAMAGE_IMMUNITY,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'damage', immuneFrom: 'not-array' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Immune from must be an array');
        });
      });

      describe('Status metadata', () => {
        it('should validate valid status metadata', () => {
          const rule = CardRuleFactory.statusImmunity(['PARALYZED']);

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error if immune status is not an array', () => {
          const rule = new CardRule(
            CardRuleType.STATUS_IMMUNITY,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'status', immuneStatus: 'not-array' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Immune status must be an array');
        });

        it('should throw error if effect types is not an array', () => {
          const rule = new CardRule(
            CardRuleType.EFFECT_IMMUNITY,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'status', effectTypes: 'not-array' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Effect types must be an array');
        });
      });

      describe('Prize metadata', () => {
        it('should validate valid prize metadata', () => {
          const rule = CardRuleFactory.extraPrizeCards(2);

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error if prize count is not a number', () => {
          const rule = new CardRule(
            CardRuleType.EXTRA_PRIZE_CARDS,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'prize', prizeCount: 'not-number' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Prize count must be a number');
        });

        it('should throw error for negative prize count', () => {
          const rule = new CardRule(
            CardRuleType.EXTRA_PRIZE_CARDS,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'prize', prizeCount: -1 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Prize count cannot be negative');
        });
      });

      describe('Evolution metadata', () => {
        it('should validate valid evolution metadata', () => {
          const rule = CardRuleFactory.canEvolveTurnOne();

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error if allow first turn is not a boolean', () => {
          const rule = new CardRule(
            CardRuleType.CAN_EVOLVE_TURN_ONE,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'evolution', allowFirstTurn: 'not-boolean' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Allow first turn must be a boolean');
        });

        it('should throw error if skip stages is not positive', () => {
          const rule = new CardRule(
            CardRuleType.SKIP_EVOLUTION_STAGE,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'evolution', skipStages: 0 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Skip stages must be a positive number');
        });

        it('should throw error if allowed evolutions is not an array', () => {
          const rule = new CardRule(
            CardRuleType.CAN_EVOLVE_TURN_ONE,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'evolution', allowedEvolutions: 'not-array' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Allowed evolutions must be an array');
        });
      });

      describe('Play metadata', () => {
        it('should validate valid play metadata', () => {
          const rule = CardRuleFactory.oncePerGame();

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error for invalid usage limit', () => {
          const rule = new CardRule(
            CardRuleType.ONCE_PER_GAME,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'play', usageLimit: 'invalid' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Usage limit must be "once_per_game" or "once_per_turn"');
        });

        it('should throw error for invalid discard timing', () => {
          const rule = new CardRule(
            CardRuleType.DISCARD_AFTER_USE,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'play', discardTiming: 'invalid' as any },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Discard timing must be "after_use" or "end_of_turn"');
        });
      });

      describe('Energy metadata', () => {
        it('should validate valid energy metadata', () => {
          const rule = CardRuleFactory.energyCostReduction(1);

          expect(() => {
            CardRuleValidator.validate(rule);
          }).not.toThrow();
        });

        it('should throw error for negative cost reduction', () => {
          const rule = new CardRule(
            CardRuleType.ENERGY_COST_REDUCTION,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'energy', costReduction: -1 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Cost reduction cannot be negative');
        });

        it('should throw error for invalid extra attachments', () => {
          const rule = new CardRule(
            CardRuleType.EXTRA_ENERGY_ATTACHMENT,
            'Text',
            undefined,
            RulePriority.NORMAL,
            { category: 'energy', extraAttachments: 0 },
          );

          expect(() => {
            CardRuleValidator.validate(rule);
          }).toThrow('Extra attachments must be at least 1');
        });
      });

      it('should throw error for missing category', () => {
        const rule = new CardRule(
          CardRuleType.CANNOT_RETREAT,
          'Text',
          undefined,
          RulePriority.NORMAL,
          {} as any,
        );

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Metadata must have a category');
      });

      it('should throw error for unknown category', () => {
        const rule = new CardRule(
          CardRuleType.CANNOT_RETREAT,
          'Text',
          undefined,
          RulePriority.NORMAL,
          { category: 'unknown' } as any,
        );

        expect(() => {
          CardRuleValidator.validate(rule);
        }).toThrow('Unknown metadata category: unknown');
      });
    });
  });

  describe('validateAll', () => {
    it('should validate array of valid rules', () => {
      const rules = [
        CardRuleFactory.cannotRetreat(),
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.damageReduction(20),
      ];

      expect(() => {
        CardRuleValidator.validateAll(rules);
      }).not.toThrow();
    });

    it('should throw error if rules is not an array', () => {
      expect(() => {
        CardRuleValidator.validateAll('not-array' as any);
      }).toThrow('Rules must be an array');
    });

    it('should throw error with index for invalid rule in array', () => {
      const rules = [
        CardRuleFactory.cannotRetreat(),
        {
          ruleType: 'INVALID',
          text: 'Text',
          priority: RulePriority.NORMAL,
        } as any,
        CardRuleFactory.extraPrizeCards(2),
      ];

      expect(() => {
        CardRuleValidator.validateAll(rules);
      }).toThrow('Rule at index 1');
    });

    it('should validate empty array', () => {
      expect(() => {
        CardRuleValidator.validateAll([]);
      }).not.toThrow();
    });
  });

  describe('Complex validation scenarios', () => {
    it('should validate rule with conditions and metadata', () => {
      const rule = CardRuleFactory.attackCostReduction(
        1,
        [ConditionFactory.selfHasDamage()],
        'per damage counter',
      );

      expect(() => {
        CardRuleValidator.validate(rule);
      }).not.toThrow();
    });

    it('should validate multiple rules with different priorities', () => {
      const rules = [
        CardRuleFactory.oncePerGame(), // HIGHEST
        CardRuleFactory.cannotRetreat(), // HIGH
        CardRuleFactory.attackCostReduction(1), // NORMAL
      ];

      expect(() => {
        CardRuleValidator.validateAll(rules);
      }).not.toThrow();
    });
  });
});

