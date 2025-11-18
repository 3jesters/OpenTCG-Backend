# Attack Effects

## Overview
Attack effects are structured representations of what happens when an attack executes. They define damage modifications, status conditions, energy manipulation, healing, and other game mechanics.

## Effect Structure

All attack effects follow a common pattern:

```typescript
interface AttackEffect {
  effectType: AttackEffectType;  // Type of effect
  target?: 'self' | 'defending' | 'benched'; // Who is affected
  // Effect-specific properties
  requiredConditions?: Condition[]; // Optional conditions that must be met
}
```

---

## 8 Core Effect Types

### 1. DISCARD_ENERGY

Discard energy cards from this Pokémon or the defending Pokémon.

**Structure:**
```typescript
{
  effectType: AttackEffectType.DISCARD_ENERGY,
  target: 'self' | 'defending',
  amount: number | 'all',
  energyType?: EnergyType,  // Optional: specific energy type
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Discard all energy from self
AttackEffectFactory.discardEnergy('self', 'all');

// Discard 2 Fire energy from self
AttackEffectFactory.discardEnergy('self', 2, EnergyType.FIRE);

// Discard 1 energy from defending Pokémon
AttackEffectFactory.discardEnergy('defending', 1);
```

**Real Card Examples:**
- **Charizard - Fire Blast**: "Discard 1 Energy card attached to Charizard"
- **Blastoise - Hydro Pump**: "Does 40 damage plus 10 more damage for each Water Energy attached"

**Validation Rules:**
- target must be 'self' or 'defending'
- amount must be positive integer or 'all'
- energyType is optional

---

### 2. STATUS_CONDITION

Apply a status condition to the defending Pokémon.

**Structure:**
```typescript
{
  effectType: AttackEffectType.STATUS_CONDITION,
  target: 'defending',
  statusCondition: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Paralyze defending Pokémon
AttackEffectFactory.statusCondition('PARALYZED');

// Poison with coin flip condition
AttackEffectFactory.statusCondition('POISONED', [
  ConditionFactory.coinFlipSuccess()
]);

// Confuse if opponent already has damage
AttackEffectFactory.statusCondition('CONFUSED', [
  ConditionFactory.opponentHasDamage()
]);
```

**Real Card Examples:**
- **Pikachu - Thunder Shock**: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed"
- **Koffing - Poison Gas**: "The Defending Pokémon is now Poisoned"
- **Vulpix - Confuse Ray**: "The Defending Pokémon is now Confused"

**Validation Rules:**
- target must be 'defending'
- statusCondition must be one of the 5 valid conditions

---

### 3. DAMAGE_MODIFIER

Increase or decrease the attack's damage.

**Structure:**
```typescript
{
  effectType: AttackEffectType.DAMAGE_MODIFIER,
  modifier: number,  // Positive = increase, negative = decrease
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Increase damage by 30
AttackEffectFactory.damageModifier(30);

// Increase by 50 if self has damage
AttackEffectFactory.damageModifier(50, [
  ConditionFactory.selfHasDamage()
]);

// Decrease damage by 10
AttackEffectFactory.damageModifier(-10);
```

**Real Card Examples:**
- **Machamp - Revenge**: "If this Pokémon has damage counters, this attack does 30 more damage"
- **Charizard - Blaze**: "If this Pokémon has at least 3 Fire Energy, this attack does 30 more damage"

**Validation Rules:**
- modifier must be non-zero integer
- can be positive (increase) or negative (decrease)

---

### 4. HEAL

Heal damage from this Pokémon or the defending Pokémon.

**Structure:**
```typescript
{
  effectType: AttackEffectType.HEAL,
  target: 'self' | 'defending',
  amount: number,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Heal 20 damage from self
AttackEffectFactory.heal('self', 20);

// Heal 30 damage from defending
AttackEffectFactory.heal('defending', 30);

// Heal if coin flip succeeds
AttackEffectFactory.heal('self', 40, [
  ConditionFactory.coinFlipSuccess()
]);
```

**Real Card Examples:**
- **Chansey - Scrunch**: "Heal 10 damage from this Pokémon"
- **Venusaur - Synthesis**: "Remove all damage counters from this Pokémon"

**Validation Rules:**
- target must be 'self' or 'defending'
- amount must be positive integer

---

### 5. PREVENT_DAMAGE

Prevent damage to this Pokémon during a future turn.

**Structure:**
```typescript
{
  effectType: AttackEffectType.PREVENT_DAMAGE,
  target: 'self' | 'defending',
  duration: 'next_turn' | 'this_turn',
  amount?: number | 'all',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Prevent all damage next turn
AttackEffectFactory.preventDamage('self', 'next_turn', 'all');

// Prevent 20 damage next turn
AttackEffectFactory.preventDamage('self', 'next_turn', 20);

// Prevent damage this turn
AttackEffectFactory.preventDamage('defending', 'this_turn', 'all');
```

**Real Card Examples:**
- **Alakazam - Barrier**: "Prevent all damage done to this Pokémon during opponent's next turn"
- **Machop - Low Kick**: "Does 20 damage. Prevent 10 damage to this Pokémon"

**Validation Rules:**
- target must be 'self' or 'defending'
- duration must be 'next_turn' or 'this_turn'
- amount can be number, 'all', or undefined (default all)

---

### 6. RECOIL_DAMAGE

This Pokémon takes recoil damage from its own attack.

**Structure:**
```typescript
{
  effectType: AttackEffectType.RECOIL_DAMAGE,
  target: 'self',
  amount: number,
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Take 20 recoil damage
AttackEffectFactory.recoilDamage(20);

// Take 30 recoil damage
AttackEffectFactory.recoilDamage(30);
```

**Real Card Examples:**
- **Electrode - Explosion**: "Does 100 damage. Electrode does 100 damage to itself"
- **Charizard - Fire Spin**: "Discard 2 Energy. Does 20 damage to itself"

**Validation Rules:**
- target must be 'self'
- amount must be positive integer

---

### 7. ENERGY_ACCELERATION

Attach energy cards from deck, discard pile, or hand.

**Structure:**
```typescript
{
  effectType: AttackEffectType.ENERGY_ACCELERATION,
  target: 'self' | 'benched',
  source: 'deck' | 'discard' | 'hand',
  count: number,
  energyType?: EnergyType,
  selector?: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Attach 1 energy from deck to self
AttackEffectFactory.energyAcceleration('self', 'deck', 1);

// Attach 2 Grass energy from discard to benched
AttackEffectFactory.energyAcceleration(
  'benched',
  'discard',
  2,
  EnergyType.GRASS,
  'choice'
);

// Attach energy from hand
AttackEffectFactory.energyAcceleration('self', 'hand', 1);
```

**Real Card Examples:**
- **Venusaur - Energy Trans**: "Attach an Energy from your discard pile"
- **Meganium - Wild Growth**: "Attach 2 Grass Energy from your deck"

**Validation Rules:**
- target must be 'self' or 'benched'
- source must be 'deck', 'discard', or 'hand'
- count must be positive integer
- selector must be 'choice' or 'random' if provided

---

### 8. SWITCH_POKEMON

Switch this Pokémon with a benched Pokémon.

**Structure:**
```typescript
{
  effectType: AttackEffectType.SWITCH_POKEMON,
  target: 'self',
  with: 'benched',
  selector: 'choice' | 'random',
  requiredConditions?: Condition[]
}
```

**Examples:**
```typescript
// Switch with benched Pokémon (player chooses)
AttackEffectFactory.switchPokemon('choice');

// Switch with random benched Pokémon
AttackEffectFactory.switchPokemon('random');
```

**Real Card Examples:**
- **Electrode - Tackle**: "Switch this Pokémon with 1 of your Benched Pokémon"
- **Pidgeot - Whirlwind**: "Switch with your Benched Pokémon"

**Validation Rules:**
- target must be 'self'
- with must be 'benched'
- selector must be 'choice' or 'random'

---

## Using Conditions with Effects

Effects can have required conditions that must be met for the effect to trigger:

```typescript
// Effect only triggers if coin flip succeeds
const paralyzeEffect = AttackEffectFactory.statusCondition('PARALYZED', [
  ConditionFactory.coinFlipSuccess()
]);

// Effect only triggers if self has damage
const boostedDamage = AttackEffectFactory.damageModifier(30, [
  ConditionFactory.selfHasDamage()
]);

// Multiple conditions (all must be met)
const conditionalHeal = AttackEffectFactory.heal('self', 50, [
  ConditionFactory.selfHasDamage(),
  ConditionFactory.selfHasEnergyType(EnergyType.GRASS, 2)
]);
```

---

## Complete Attack Examples

### Example 1: Thunder Shock (Simple with Status)
```typescript
const thunderShock = new Attack(
  'Thunder Shock',
  [EnergyType.ELECTRIC],
  '10',
  'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
  [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
  [
    AttackEffectFactory.statusCondition('PARALYZED', [
      ConditionFactory.coinFlipSuccess()
    ])
  ]
);
```

### Example 2: Fire Blast (Multiple Effects)
```typescript
const fireBlast = new Attack(
  'Fire Blast',
  [EnergyType.FIRE, EnergyType.FIRE, EnergyType.COLORLESS],
  '120',
  'Discard 2 Fire Energy from this Pokémon. This attack does 20 recoil damage.',
  undefined,
  [
    AttackEffectFactory.discardEnergy('self', 2, EnergyType.FIRE),
    AttackEffectFactory.recoilDamage(20)
  ]
);
```

### Example 3: Revenge (Conditional Damage)
```typescript
const revenge = new Attack(
  'Revenge',
  [EnergyType.FIGHTING],
  '30+',
  'If this Pokémon has any damage counters, this attack does 30 more damage.',
  undefined,
  [
    AttackEffectFactory.damageModifier(30, [
      ConditionFactory.selfHasDamage()
    ])
  ]
);
```

### Example 4: Synthesis (Healing)
```typescript
const synthesis = new Attack(
  'Synthesis',
  [EnergyType.GRASS],
  '',
  'Heal 30 damage from this Pokémon.',
  undefined,
  [AttackEffectFactory.heal('self', 30)]
);
```

### Example 5: Barrier (Prevent Damage)
```typescript
const barrier = new Attack(
  'Barrier',
  [EnergyType.PSYCHIC, EnergyType.COLORLESS],
  '30',
  'Prevent all damage done to this Pokémon during opponent\'s next turn.',
  undefined,
  [AttackEffectFactory.preventDamage('self', 'next_turn', 'all')]
);
```

---

## Validation

All effects are automatically validated when an Attack is created. The `AttackEffectValidator` ensures:

### General Rules
- Effect type is required
- Effect type must be valid
- Required conditions (if present) must be valid

### Type-Specific Rules
Each effect type has specific validation rules (see individual effect sections above).

**Validation Example:**
```typescript
// This will throw an error
const invalidAttack = new Attack(
  'Bad Attack',
  [EnergyType.FIRE],
  '50',
  'text',
  undefined,
  [
    {
      effectType: AttackEffectType.HEAL,
      target: 'self',
      amount: 0  // Invalid: must be at least 1
    }
  ]
);
// Error: Attack "Bad Attack" has invalid effects: Heal amount must be at least 1
```

---

## Implementation Status

### ✅ Phase 1 Complete
- 8 core effect types implemented
- Type-safe value interfaces
- `AttackEffectFactory` for easy creation
- `AttackEffectValidator` with comprehensive validation
- Automatic validation in Attack constructor
- Integration with generic Condition system
- Helper methods: `hasEffects()`, `getEffectsByType()`
- Complete unit test coverage
- Full documentation

### 🔄 Phase 2 (Future)
- Effect execution engine
- Game state integration
- Effect resolution order
- Effect stacking/combining
- Additional effect types as needed

---

## Usage Summary

```typescript
import {
  Attack,
  AttackEffectFactory,
  AttackEffectType,
  ConditionFactory,
  EnergyType
} from './modules/card/domain';

// Create attack with effects
const attack = new Attack(
  'Thunder Shock',
  [EnergyType.ELECTRIC],
  '20',
  'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
  [AttackPreconditionFactory.coinFlip(1, 'Flip')],
  [
    AttackEffectFactory.statusCondition('PARALYZED', [
      ConditionFactory.coinFlipSuccess()
    ])
  ]
);

// Query effects
if (attack.hasEffects()) {
  const statusEffects = attack.getEffectsByType(AttackEffectType.STATUS_CONDITION);
  console.log(`Has ${statusEffects.length} status effects`);
}
```

---

**Built with Clean Architecture | Type Safety | Comprehensive Validation**

