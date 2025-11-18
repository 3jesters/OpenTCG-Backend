# Generic Condition System

## Overview
The Condition system is a **reusable framework** for representing requirements and checks across the entire card game system. Conditions can be used in:
- Attack effects (when does an effect trigger?)
- Attack preconditions (when can an attack be used?)
- Ability effects (when does an ability activate?)
- Card rules (when does a rule apply?)

This generic design ensures consistency and reduces code duplication.

---

## Condition Structure

```typescript
interface Condition {
  type: ConditionType;        // What to check
  value?: ConditionValue;     // Additional parameters
  description?: string;       // Human-readable explanation
}
```

---

## Condition Categories

### 1. Always Conditions
No requirements - effect always happens.

```typescript
ConditionFactory.always()
```

### 2. Coin Flip Based
Depend on coin flip results (from preconditions).

```typescript
ConditionFactory.coinFlipSuccess()  // If heads
ConditionFactory.coinFlipFailure()  // If tails
```

### 3. Self (This Pokémon) Conditions
Check the state of this Pokémon.

```typescript
ConditionFactory.selfHasDamage()              // Has any damage
ConditionFactory.selfNoDamage()               // Has no damage
ConditionFactory.selfMinimumDamage(3)         // Has at least 3 damage
ConditionFactory.selfHasStatus('PARALYZED')   // Has specific status
ConditionFactory.selfHasEnergyType(EnergyType.FIRE, 2)  // Has 2+ Fire Energy
ConditionFactory.selfMinimumEnergy(3)         // Has 3+ energy total
ConditionFactory.selfHasBenched()             // Has benched Pokémon
```

### 4. Opponent Conditions
Check the state of the defending Pokémon.

```typescript
ConditionFactory.opponentHasDamage()          // Opponent has damage
ConditionFactory.opponentConfused()           // Is Confused
ConditionFactory.opponentParalyzed()          // Is Paralyzed
ConditionFactory.opponentPoisoned()           // Is Poisoned
ConditionFactory.opponentBurned()             // Is Burned
ConditionFactory.opponentAsleep()             // Is Asleep
ConditionFactory.opponentHasStatus('CONFUSED') // Has specific status
ConditionFactory.opponentHasBenched()         // Has benched Pokémon
```

### 5. Board State Conditions
Check the game board state.

```typescript
ConditionFactory.stadiumInPlay()                // Any stadium
ConditionFactory.stadiumInPlay('Power Plant')   // Specific stadium
```

---

## Complete Condition Type Reference

| ConditionType | Requires Value | Description |
|---------------|----------------|-------------|
| `ALWAYS` | No | No requirements |
| `COIN_FLIP_SUCCESS` | No | Coin flip was heads |
| `COIN_FLIP_FAILURE` | No | Coin flip was tails |
| `SELF_HAS_DAMAGE` | No | This Pokémon has damage |
| `SELF_NO_DAMAGE` | No | This Pokémon has no damage |
| `SELF_HAS_STATUS` | Yes | This Pokémon has specific status |
| `SELF_MINIMUM_DAMAGE` | Yes | This Pokémon has minimum damage |
| `OPPONENT_HAS_DAMAGE` | No | Defending Pokémon has damage |
| `OPPONENT_HAS_STATUS` | Yes | Defending has specific status |
| `OPPONENT_CONFUSED` | No | Defending is Confused |
| `OPPONENT_PARALYZED` | No | Defending is Paralyzed |
| `OPPONENT_POISONED` | No | Defending is Poisoned |
| `OPPONENT_BURNED` | No | Defending is Burned |
| `OPPONENT_ASLEEP` | No | Defending is Asleep |
| `SELF_HAS_ENERGY_TYPE` | Yes | Has specific energy type |
| `SELF_MINIMUM_ENERGY` | Yes | Has minimum energy count |
| `OPPONENT_HAS_BENCHED` | No | Opponent has benched Pokémon |
| `SELF_HAS_BENCHED` | No | Player has benched Pokémon |
| `STADIUM_IN_PLAY` | Optional | Stadium card is in play |

---

## Using Conditions

### Single Condition

```typescript
// Effect triggers only if coin flip succeeds
const effect = AttackEffectFactory.statusCondition('PARALYZED', [
  ConditionFactory.coinFlipSuccess()
]);
```

### Multiple Conditions (AND Logic)

All conditions must be met for the effect to trigger.

```typescript
// Effect only if: self has damage AND coin flip succeeds
const effect = AttackEffectFactory.damageModifier(50, [
  ConditionFactory.selfHasDamage(),
  ConditionFactory.coinFlipSuccess()
]);
```

### Complex Example

```typescript
// Heal 60 damage if:
// - This Pokémon has damage counters
// - This Pokémon has at least 2 Grass Energy
// - Opponent has benched Pokémon
const heal = AttackEffectFactory.heal('self', 60, [
  ConditionFactory.selfHasDamage(),
  ConditionFactory.selfHasEnergyType(EnergyType.GRASS, 2),
  ConditionFactory.opponentHasBenched()
]);
```

---

## Condition Values

Some condition types require additional data:

### Status Condition Value
```typescript
{
  statusCondition: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED'
}
```

### Minimum Amount Value
```typescript
{
  minimumAmount: number  // e.g., 3 damage counters
}
```

### Energy Type Value
```typescript
{
  energyType: EnergyType,
  minimumAmount: number  // e.g., 2 Fire Energy
}
```

### Stadium Value
```typescript
{
  stadiumName?: string  // Optional specific stadium
}
```

---

## Validation

All conditions are validated automatically:

### General Validation
- Condition type must be valid
- Required values must be present
- Values must be correctly formatted

### Type-Specific Validation

**Status Conditions:**
- Status must be one of: PARALYZED, POISONED, BURNED, ASLEEP, CONFUSED

**Minimum Amounts:**
- Must be at least 1
- Must be an integer

**Energy Type Conditions:**
- Energy type must be valid
- Minimum amount must be at least 1

**Example Error:**
```typescript
// This will throw an error
const invalid = ConditionFactory.selfMinimumDamage(0);
// Error: Minimum amount must be at least 1
```

---

## Helper Methods

The `ConditionHelper` class provides utilities:

```typescript
// Check condition characteristics
ConditionHelper.isAlways(condition)              // No requirements?
ConditionHelper.requiresGameState(condition)     // Needs game state?
ConditionHelper.isCoinFlipBased(condition)       // Based on coin flip?
ConditionHelper.isSelfCondition(condition)       // Checks this Pokémon?
ConditionHelper.isOpponentCondition(condition)   // Checks opponent?
ConditionHelper.requiresValue(conditionType)     // Type needs value?
```

**Usage Example:**
```typescript
const condition = ConditionFactory.selfHasDamage();

if (ConditionHelper.requiresGameState(condition)) {
  console.log('This condition needs game state to evaluate');
}

if (ConditionHelper.isSelfCondition(condition)) {
  console.log('This condition checks this Pokémon');
}
```

---

## Real Pokémon Card Examples

### Example 1: Machamp - Revenge
*"If this Pokémon has any damage counters on it, this attack does 30 more damage."*

```typescript
const revenge = new Attack(
  'Revenge',
  [EnergyType.FIGHTING],
  '30+',
  'If this Pokémon has damage, +30 damage',
  undefined,
  [
    AttackEffectFactory.damageModifier(30, [
      ConditionFactory.selfHasDamage()
    ])
  ]
);
```

### Example 2: Charizard - Blaze
*"If this Pokémon has at least 3 Fire Energy attached, this attack does 30 more damage."*

```typescript
const blaze = new Attack(
  'Blaze',
  [EnergyType.FIRE, EnergyType.COLORLESS],
  '50+',
  'If 3+ Fire Energy, +30 damage',
  undefined,
  [
    AttackEffectFactory.damageModifier(30, [
      ConditionFactory.selfHasEnergyType(EnergyType.FIRE, 3)
    ])
  ]
);
```

### Example 3: Pikachu - Thunder Shock
*"Flip a coin. If heads, the Defending Pokémon is now Paralyzed."*

```typescript
const thunderShock = new Attack(
  'Thunder Shock',
  [EnergyType.ELECTRIC],
  '10',
  'Flip a coin. If heads, paralyze',
  [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
  [
    AttackEffectFactory.statusCondition('PARALYZED', [
      ConditionFactory.coinFlipSuccess()
    ])
  ]
);
```

### Example 4: Alakazam - Future Sight
*"If the Defending Pokémon is already Confused, this attack does 50 more damage."*

```typescript
const futureSight = new Attack(
  'Future Sight',
  [EnergyType.PSYCHIC, EnergyType.COLORLESS],
  '50+',
  'If opponent is Confused, +50 damage',
  undefined,
  [
    AttackEffectFactory.damageModifier(50, [
      ConditionFactory.opponentConfused()
    ])
  ]
);
```

### Example 5: Venusaur - Synthesis
*"You can use this attack only if this Pokémon has damage counters on it. Heal 60 damage."*

```typescript
const synthesis = new Attack(
  'Synthesis',
  [EnergyType.GRASS],
  '',
  'Only if damaged. Heal 60',
  [
    // Could use as precondition
    AttackPreconditionFactory.damageCheck('has_damage', 'Requires damage')
  ],
  [
    AttackEffectFactory.heal('self', 60)
  ]
);
```

---

## Conditions vs Preconditions

**Preconditions** check if an attack **can be used**.
**Conditions** check if an effect **should trigger**.

| Preconditions | Conditions |
|---------------|-----------|
| Checked before attack selection | Checked during effect resolution |
| Prevents attack if not met | Prevents effect if not met |
| Examples: coin flips, can't use unless... | Examples: if heads, if damaged... |

**Example showing both:**
```typescript
const attack = new Attack(
  'Thunder Shock',
  [EnergyType.ELECTRIC],
  '20',
  'Flip a coin. If heads, paralyze',
  
  // PRECONDITION: Must flip coin to use attack
  [AttackPreconditionFactory.coinFlip(1, 'Flip')],
  
  // CONDITION: Paralyze only if coin was heads
  [
    AttackEffectFactory.statusCondition('PARALYZED', [
      ConditionFactory.coinFlipSuccess()
    ])
  ]
);
```

---

## Future Extensions

The condition system is designed to be extended:

### Potential Future Conditions
- `PLAYER_HAS_CARDS_IN_HAND` - Hand size checks
- `PLAYER_HAS_CARDS_IN_DECK` - Deck size checks
- `TURN_NUMBER` - Turn-based conditions
- `WEATHER_CONDITION` - Weather effects (custom rules)
- `TIME_OF_DAY` - Day/night mechanics
- `CUSTOM_COUNTER` - Generic counter checks

### Adding New Conditions
1. Add to `ConditionType` enum
2. Define value structure if needed
3. Add factory method
4. Add validation logic
5. Update documentation

---

## Implementation Status

### ✅ Phase 1 Complete
- Generic condition system
- 22 condition types
- `ConditionFactory` with helper methods
- `ConditionHelper` utilities
- `ConditionValidator` with validation
- Integration with attack effects
- Complete documentation

### 🔄 Phase 2 (Future)
- Condition evaluation engine
- Game state integration
- OR logic support (currently only AND)
- Condition negation (NOT logic)
- Complex conditional expressions

---

## Summary

The Condition system provides:
- ✅ **Reusability**: Use across effects, abilities, and rules
- ✅ **Type Safety**: Strongly typed with validation
- ✅ **Flexibility**: Support for simple and complex conditions
- ✅ **Extensibility**: Easy to add new condition types
- ✅ **Clarity**: Human-readable and well-documented

**Usage Pattern:**
```typescript
import { ConditionFactory, AttackEffectFactory } from './modules/card/domain';

// Create condition
const condition = ConditionFactory.selfHasDamage();

// Use in effect
const effect = AttackEffectFactory.damageModifier(30, [condition]);
```

---

**Built for Reusability | Type Safety | Future-Proof Design**

