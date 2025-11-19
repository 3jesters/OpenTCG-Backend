# Attack Preconditions

## Overview
Attack preconditions are conditions that must be checked or resolved **before** an attack executes. This is crucial for implementing Pokémon TCG mechanics like coin flips, damage checks, and conditional requirements.

## What Are Preconditions?

Preconditions are distinct from attack effects:
- **Preconditions**: Happen BEFORE the attack executes (e.g., "Flip a coin")
- **Effects**: Happen DURING or AFTER the attack (e.g., "Discard all Energy")

## Precondition Structure

```typescript
enum PreconditionType {
  COIN_FLIP = 'COIN_FLIP',
  DAMAGE_CHECK = 'DAMAGE_CHECK',
  ENERGY_CHECK = 'ENERGY_CHECK',
}

interface AttackPrecondition {
  type: PreconditionType; // Type of precondition (strongly typed)
  value?: CoinFlipValue | DamageCheckValue | EnergyCheckValue;
  description: string;    // Human-readable description
}

// Specific value types
interface CoinFlipValue {
  numberOfCoins: number; // Number of coins to flip (1-10)
}

interface DamageCheckValue {
  condition: 'has_damage' | 'no_damage' | 'minimum_damage';
  minimumDamage?: number; // Required if condition is 'minimum_damage'
}

interface EnergyCheckValue {
  energyType: EnergyType;
  minimum: number; // Minimum number of that energy type
}
```

## Common Precondition Types

### 1. Coin Flip
The most common precondition in Pokémon TCG.

```typescript
// Using the factory method (recommended)
AttackPreconditionFactory.coinFlip(1, 'Flip a coin. If tails, this attack does nothing.');

// Or manually
{
  type: PreconditionType.COIN_FLIP,
  value: { numberOfCoins: 1 },
  description: 'Flip a coin. If tails, this attack does nothing.'
}
```

**Examples:**
- "Flip a coin. If tails, this attack does nothing."
- "Flip 2 coins. This attack does 20 damage times the number of heads."

**Validation Rules:**
- `numberOfCoins` must be between 1 and 10
- `numberOfCoins` must be an integer

### 2. Damage Check
Attack can only be used if certain damage conditions are met.

```typescript
// Using the factory method (recommended)
AttackPreconditionFactory.damageCheck(
  'has_damage',
  'You can use this attack only if this Pokémon has damage counters on it.'
);

// For minimum damage
AttackPreconditionFactory.damageCheck(
  'minimum_damage',
  'You can use this attack only if this Pokémon has at least 3 damage counters',
  3
);

// Or manually
{
  type: PreconditionType.DAMAGE_CHECK,
  value: { condition: 'has_damage' },
  description: 'You can use this attack only if this Pokémon has damage counters on it.'
}
```

**Conditions:**
- `'has_damage'`: Pokémon must have at least 1 damage counter
- `'no_damage'`: Pokémon must have no damage counters
- `'minimum_damage'`: Pokémon must have at least X damage counters (requires `minimumDamage` value)

**Validation Rules:**
- `condition` must be one of: 'has_damage', 'no_damage', 'minimum_damage'
- If condition is 'minimum_damage', `minimumDamage` is required
- `minimumDamage` must be at least 1
- `minimumDamage` must be an integer

### 3. Energy Check
Attack requires specific energy configuration beyond the cost.

```typescript
// Using the factory method (recommended)
AttackPreconditionFactory.energyCheck(
  EnergyType.FIRE,
  2,
  "This attack can't be used unless this Pokémon has at least 2 Fire Energy attached."
);

// Or manually
{
  type: PreconditionType.ENERGY_CHECK,
  value: { energyType: EnergyType.FIRE, minimum: 2 },
  description: "This attack can't be used unless this Pokémon has at least 2 Fire Energy attached."
}
```

**Validation Rules:**
- `energyType` must be a valid EnergyType enum value
- `minimum` must be at least 1
- `minimum` must be an integer

### 4. Position Check (Future)
Attack depends on board state.

**Status:** Not yet implemented. Placeholder for future development.

### 5. Stadium Check (Future)
Attack depends on stadium card.

**Status:** Not yet implemented. Placeholder for future development.

## Real Pokémon Card Examples

### Example 1: Bulbasaur's Razor Leaf
```typescript
const razorLeaf = new Attack(
  'Razor Leaf',
  [EnergyType.GRASS],
  '30',
  'Flip a coin. If tails, this attack does nothing.',
  [
    AttackPreconditionFactory.coinFlip(1, 'Flip a coin. If tails, this attack does nothing.')
  ]
);
```

### Example 2: Charizard's Fire Blast
```typescript
const fireBlast = new Attack(
  'Fire Blast',
  [EnergyType.FIRE, EnergyType.FIRE, EnergyType.FIRE, EnergyType.COLORLESS],
  '100',
  'Discard 1 Energy card attached to Charizard.',
  undefined, // No preconditions - attack always executes
  [] // Effects handled separately
);
```

### Example 3: Machamp's Revenge
```typescript
const revenge = new Attack(
  'Revenge',
  [EnergyType.FIGHTING, EnergyType.COLORLESS],
  '30+',
  'If this Pokémon has any damage counters on it, this attack does 30 more damage.',
  [
    AttackPreconditionFactory.damageCheck(
      'has_damage',
      'Requires damage counters'
    )
  ]
);
```

### Example 4: Electrode's Chain Lightning
```typescript
const chainLightning = new Attack(
  'Chain Lightning',
  [EnergyType.ELECTRIC, EnergyType.ELECTRIC, EnergyType.COLORLESS],
  '20',
  'Flip 2 coins. If both are heads, this attack does 30 damage to 1 of your opponent\'s Benched Pokémon.',
  [
    AttackPreconditionFactory.coinFlip(2, 'Flip 2 coins')
  ]
);
```

### Example 5: Charizard's Blaze
```typescript
const blaze = new Attack(
  'Blaze',
  [EnergyType.FIRE, EnergyType.COLORLESS],
  '50+',
  'If this Pokémon has at least 3 Fire Energy attached, this attack does 30 more damage.',
  [
    AttackPreconditionFactory.energyCheck(
      EnergyType.FIRE,
      3,
      'At least 3 Fire Energy'
    )
  ]
);
```

## Flow Diagram

```
Player selects attack
    ↓
Check if energy cost is met
    ↓
Process preconditions (if any)
    ├─→ Coin flips
    ├─→ Damage checks
    ├─→ Board state checks
    └─→ Player choices
    ↓
If preconditions pass:
    ↓
Execute attack (deal damage + effects)
    ↓
Else:
    ↓
Attack fails/does nothing
```

## Validation

All preconditions are automatically validated when an Attack is created. The `AttackPreconditionValidator` ensures:

### General Rules
- Precondition type is required
- Description is required and non-empty
- Type must be a valid `PreconditionType`

### Coin Flip Rules
- Number of coins must be between 1 and 10
- Must be an integer

### Damage Check Rules
- Condition must be one of: 'has_damage', 'no_damage', 'minimum_damage'
- If condition is 'minimum_damage', `minimumDamage` is required
- `minimumDamage` must be at least 1 and an integer

### Energy Check Rules
- Energy type is required and must be valid
- Minimum must be at least 1 and an integer

**Example of validation error:**
```typescript
// This will throw an error
const invalidAttack = new Attack(
  'Bad Attack',
  [EnergyType.FIRE],
  '50',
  'text',
  [
    {
      type: PreconditionType.COIN_FLIP,
      value: { numberOfCoins: 0 }, // Invalid: < 1
      description: 'test',
    },
  ]
);
// Error: Attack "Bad Attack" has invalid preconditions: Number of coins must be at least 1
```

## Implementation Status

### ✅ Completed (Phase 1)
- `PreconditionType` enum with COIN_FLIP, DAMAGE_CHECK, ENERGY_CHECK
- Strongly-typed value interfaces (CoinFlipValue, DamageCheckValue, EnergyCheckValue)
- `AttackPreconditionFactory` for easy creation
- `AttackPreconditionValidator` with comprehensive validation
- Automatic validation in Attack constructor
- Helper methods: `hasPreconditions()`, `getPreconditionsByType()`
- Complete unit test coverage
- Updated documentation

### 🔄 To Be Implemented (Future - Phase 2)
- Game engine execution of preconditions
- Precondition result handling (coin flip outcomes, etc.)
- Additional precondition types (POSITION_CHECK, STADIUM_CHECK, TARGET_SELECTION)
- Precondition execution service in application layer

## Usage in Code

```typescript
import { 
  Attack, 
  AttackPreconditionFactory,
  PreconditionType,
  EnergyType 
} from './modules/card/domain';

// Method 1: Using factory (recommended)
const attack = new Attack(
  'Thunder Shock',
  [EnergyType.ELECTRIC],
  '10',
  'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
  [
    AttackPreconditionFactory.coinFlip(1, 'Flip a coin')
  ]
);

// Method 2: Manual creation
const attack2 = new Attack(
  'Revenge',
  [EnergyType.FIGHTING],
  '30+',
  'If this Pokémon has damage counters, this attack does more damage.',
  [
    {
      type: PreconditionType.DAMAGE_CHECK,
      value: { condition: 'has_damage' },
      description: 'Requires damage'
    }
  ]
);

// Check if attack has preconditions
if (attack.hasPreconditions()) {
  console.log('This attack has preconditions');
  
  // Get coin flip preconditions
  const coinFlips = attack.getPreconditionsByType(PreconditionType.COIN_FLIP);
  if (coinFlips.length > 0) {
    const coinFlipValue = coinFlips[0].value as CoinFlipValue;
    console.log(`Number of coins to flip: ${coinFlipValue.numberOfCoins}`);
  }
}

// Creating multiple preconditions
const complexAttack = new Attack(
  'Complex Attack',
  [EnergyType.FIRE, EnergyType.FIRE],
  '60+',
  'Flip a coin. If this Pokémon has at least 3 Fire Energy and has damage counters, this attack does 30 more damage.',
  [
    AttackPreconditionFactory.coinFlip(1, 'Flip a coin'),
    AttackPreconditionFactory.energyCheck(EnergyType.FIRE, 3, 'At least 3 Fire Energy'),
    AttackPreconditionFactory.damageCheck('has_damage', 'Has damage counters')
  ]
);
```

## Notes for Game Engine

When implementing the game engine, preconditions should be:
1. **Validated** before allowing attack selection
2. **Processed** in order defined in the array
3. **Result-dependent** (attack may fail based on precondition result)
4. **Interactive** (player may need to make choices)
5. **Logged** for game replay and verification

## Future Enhancements

Consider adding:
- `PreconditionResult` interface for tracking outcomes
- `PreconditionValidator` service for validation
- `PreconditionExecutor` for game engine integration
- Support for complex precondition chains
- Support for "reroll" mechanics (e.g., certain abilities let you reflip coins)

