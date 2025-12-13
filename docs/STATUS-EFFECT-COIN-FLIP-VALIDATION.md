# Status Effect Coin Flip Validation

## Overview

This document validates that all attacks with coin flips that determine status effects are correctly handled with the `STATUS_EFFECT_ONLY` damage calculation type, ensuring damage always applies regardless of coin flip result.

## Validated Attack Patterns

### Pattern: "Flip a coin. If heads, the Defending Pokémon is now [Status]."

**Examples:**
- Confuse Ray: "Flip a coin. If heads, the Defending Pokémon is now Confused." (damage: 10)
- Thunder Wave: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed." (damage: 30)
- Sing: "Flip a coin. If heads, the Defending Pokémon is now Asleep." (damage: 0)
- Poison Sting: "Flip a coin. If heads, the Defending Pokémon is now Poisoned." (damage: 20)

**Behavior:**
- ✅ Damage always applies (10, 30, 0, 20 respectively)
- ✅ Status effect only applies if coin flip is heads
- ✅ Uses `STATUS_EFFECT_ONLY` damage calculation type

### Pattern: "Flip a coin. If heads, the Defending Pokémon is now [Status1] and [Status2]."

**Examples:**
- Venom Powder: "Flip a coin. If heads, the Defending Pokémon is now Confused and Poisoned." (damage: 10)

**Behavior:**
- ✅ Damage always applies (10)
- ✅ Both status effects apply if coin flip is heads
- ✅ Uses `STATUS_EFFECT_ONLY` damage calculation type

### Pattern: "Flip a coin. If heads, [Status1]; if tails, [Status2]."

**Examples:**
- Foul Gas / Sludge: "Flip a coin. If heads, the Defending Pokémon is now Poisoned; if tails, it is now Confused." (damage: 10, 30)

**Behavior:**
- ✅ Damage always applies (10 or 30)
- ✅ Status effect depends on coin flip result (heads = Poisoned, tails = Confused)
- ✅ Uses `STATUS_EFFECT_ONLY` damage calculation type

### Pattern: "Flip a coin. If tails, [Pokemon] is now Confused (after doing damage)."

**Examples:**
- Tantrum: "Flip a coin. If tails, Primeape is now Confused (after doing damage)." (damage: 50)
- Rampage: "Flip a coin. If tails, Tauros is now Confused (after doing damage)." (damage: 20+)

**Behavior:**
- ✅ Damage always applies (50, 20+)
- ✅ Attacker gets Confused status if coin flip is tails
- ✅ Uses `STATUS_EFFECT_ONLY` damage calculation type

## Implementation Details

### Parser Logic (Pattern 5)

The `AttackCoinFlipParserService` identifies status effect coin flips using:

```typescript
if (text.includes('flip a coin') && (text.includes('if heads') || text.includes('if tails'))) {
  if (
    text.includes('now') &&
    (text.includes('paralyzed') ||
     text.includes('confused') ||
     text.includes('asleep') ||
     text.includes('poisoned'))
  ) {
    // Use STATUS_EFFECT_ONLY
  }
}
```

### Damage Calculation

For `STATUS_EFFECT_ONLY`:
- `calculateDamage()`: Always returns `baseDamage` regardless of coin flip result
- `shouldAttackProceed()`: Always returns `true` (attack always proceeds)

### Status Effect Application

Status effects are applied based on `evaluateEffectConditions()`:
- `COIN_FLIP_SUCCESS`: Checks if any flip is heads
- `COIN_FLIP_FAILURE`: Checks if any flip is tails

For attacks like Confuse Ray:
- Attack text: "If heads, the Defending Pokémon is now Confused"
- Effect condition: `COIN_FLIP_SUCCESS`
- Result:
  - Heads: Condition met → Confused status applied
  - Tails: Condition not met → No status applied
  - Damage: Always applies (10)

## Test Coverage

All patterns validated in `attack-coin-flip-parser.service.spec.ts`:
- ✅ Confuse Ray (Confused)
- ✅ Thunder Wave (Paralyzed)
- ✅ Sing (Asleep)
- ✅ Foul Gas (Poisoned or Confused)
- ✅ Venom Powder (Confused and Poisoned)
- ✅ Tantrum (Self Confusion)

## Edge Cases Handled

1. **0 damage attacks**: Status effect attacks with 0 damage still use `STATUS_EFFECT_ONLY` (e.g., Sing)
2. **Multiple status effects**: Attacks applying multiple statuses correctly use `STATUS_EFFECT_ONLY`
3. **Self-confusion**: Attacks that confuse the attacker use `STATUS_EFFECT_ONLY`
4. **Heads or tails conditions**: Attacks with "if heads, X; if tails, Y" correctly use `STATUS_EFFECT_ONLY`

## Non-Status-Effect Attacks (Correctly NOT using STATUS_EFFECT_ONLY)

These attacks correctly use other damage calculation types:
- **BASE_DAMAGE**: "Flip a coin. If tails, this attack does nothing." (Horn Hazard)
- **MULTIPLY_BY_HEADS**: "Flip 4 coins. This attack does 20 damage times the number of heads." (Pin Missile)
- **CONDITIONAL_BONUS**: "Flip a coin. If heads, this attack does 10 damage plus 20 more damage; if tails, this attack does 10 damage." (Flamethrower)

## Summary

✅ All status effect coin flip attacks correctly use `STATUS_EFFECT_ONLY`
✅ Damage always applies regardless of coin flip result
✅ Status effects are applied based on coin flip results via condition evaluation
✅ Edge cases (0 damage, multiple statuses, self-confusion) are handled correctly
✅ Non-status-effect attacks correctly use other damage calculation types
