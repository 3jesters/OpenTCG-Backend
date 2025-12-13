import { AttackCoinFlipParserService } from './attack-coin-flip-parser.service';
import { DamageCalculationType } from '../value-objects/coin-flip-configuration.value-object';

describe('AttackCoinFlipParserService - STATUS_EFFECT_ONLY Validation', () => {
  let parser: AttackCoinFlipParserService;

  beforeEach(() => {
    parser = new AttackCoinFlipParserService();
  });

  describe('STATUS_EFFECT_ONLY attacks (damage always applies)', () => {
    const statusEffectAttacks = [
      {
        name: 'Confuse Ray - Confused',
        text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.',
        damage: '10',
        expectedType: DamageCalculationType.STATUS_EFFECT_ONLY,
        expectedDamage: 10,
      },
      {
        name: 'Thunder Wave - Paralyzed',
        text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
        damage: '30',
        expectedType: DamageCalculationType.STATUS_EFFECT_ONLY,
        expectedDamage: 30,
      },
      {
        name: 'Sing - Asleep',
        text: 'Flip a coin. If heads, the Defending Pokémon is now Asleep.',
        damage: '0',
        expectedType: DamageCalculationType.STATUS_EFFECT_ONLY,
        expectedDamage: 0,
      },
      {
        name: 'Foul Gas - Poisoned or Confused',
        text: 'Flip a coin. If heads, the Defending Pokémon is now Poisoned; if tails, it is now Confused.',
        damage: '10',
        expectedType: DamageCalculationType.STATUS_EFFECT_ONLY,
        expectedDamage: 10,
      },
      {
        name: 'Venom Powder - Confused and Poisoned',
        text: 'Flip a coin. If heads, the Defending Pokémon is now Confused and Poisoned.',
        damage: '10',
        expectedType: DamageCalculationType.STATUS_EFFECT_ONLY,
        expectedDamage: 10,
      },
      {
        name: 'Tantrum - Self Confusion',
        text: 'Flip a coin. If tails, Primeape is now Confused (after doing damage).',
        damage: '50',
        expectedType: DamageCalculationType.STATUS_EFFECT_ONLY,
        expectedDamage: 50,
      },
    ];

    statusEffectAttacks.forEach((attack) => {
      it(`should parse ${attack.name} as STATUS_EFFECT_ONLY`, () => {
        const result = parser.parseCoinFlipFromAttack(attack.text, attack.damage);
        
        expect(result).not.toBeNull();
        expect(result?.damageCalculationType).toBe(attack.expectedType);
        expect(result?.baseDamage).toBe(attack.expectedDamage);
        expect(result?.fixedCount).toBe(1);
      });
    });
  });

  describe('Non-status-effect attacks (should not use STATUS_EFFECT_ONLY)', () => {
    const nonStatusAttacks = [
      {
        name: 'Horn Hazard - Does nothing on tails',
        text: 'Flip a coin. If tails, this attack does nothing.',
        damage: '30',
        expectedType: DamageCalculationType.BASE_DAMAGE,
      },
      {
        name: 'Pin Missile - Multiply by heads',
        text: 'Flip 4 coins. This attack does 20 damage times the number of heads.',
        damage: '20×',
        expectedType: DamageCalculationType.MULTIPLY_BY_HEADS,
      },
    ];

    nonStatusAttacks.forEach((attack) => {
      it(`should NOT parse ${attack.name} as STATUS_EFFECT_ONLY`, () => {
        const result = parser.parseCoinFlipFromAttack(attack.text, attack.damage);
        
        expect(result).not.toBeNull();
        expect(result?.damageCalculationType).toBe(attack.expectedType);
        expect(result?.damageCalculationType).not.toBe(DamageCalculationType.STATUS_EFFECT_ONLY);
      });
    });
  });
});
