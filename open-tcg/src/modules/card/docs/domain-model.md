# Card Domain Model

## Overview
The Card entity represents a trading card in the OpenTCG system, following Pokémon TCG rules as a template.

## Card Identification Hierarchy

The card system uses a four-level identification hierarchy:

```
pokemonNumber (Pokédex #)
    ↓
level/stage (Evolution level & stage)
    ↓
cardId (unique per variant/printing)
    ↓
instanceId (UUID - unique for each physical instance)
```

### Example:
- **pokemonNumber**: "025" (Pikachu)
- **level**: 12
- **stage**: BASIC
- **cardId**: "base-set-025-pikachu-lv12"
- **instanceId**: "550e8400-e29b-41d4-a716-446655440000" (UUID)

## Card Types

The system supports three main card types:

### 1. Pokémon Cards
Cards that represent Pokémon creatures with battle stats and attacks.

**Required Fields:**
- All base identification fields
- `cardType`: POKEMON
- `pokemonType`: Fire, Water, Grass, etc.
- `stage`: BASIC, STAGE_1, STAGE_2, etc.
- `hp`: Health points
- `attacks`: Array of attacks

**Optional Fields:**
- `level`: Numeric level (used in older card sets)
- `retreatCost`: Number of energy cards needed to retreat
- `weakness`: Type weakness with modifier
- `resistance`: Type resistance with modifier
- `ability`: Passive or triggered ability
- `evolvesFrom`: Previous evolution in chain
- `evolvesTo`: Possible next evolutions
- `subtypes`: Additional classifications (e.g., "Pokémon V", "Rapid Strike")

### 2. Trainer Cards
Cards that provide special effects or actions during gameplay.

**Required Fields:**
- All base identification fields
- `cardType`: TRAINER
- `trainerType`: ITEM, SUPPORTER, STADIUM, or TOOL
- `trainerEffect`: Description of what the trainer does

### 3. Energy Cards
Cards that provide energy to power Pokémon attacks.

**Required Fields:**
- All base identification fields
- `cardType`: ENERGY
- `energyType`: Type of energy provided
- `isSpecialEnergy`: Boolean (basic vs special energy)

**Optional Fields:**
- `specialEnergyEffect`: Description of special energy effects (only if isSpecialEnergy is true)

## Evolution Chain

Pokémon cards can define evolution relationships:

### Evolution Structure
```typescript
{
  pokemonNumber: string;  // Pokédex number of the evolution
  stage: EvolutionStage;  // Evolution stage
  condition?: string;     // Special condition (e.g., "Dark", "Water Stone")
}
```

### Examples:

**Basic Pokémon (Pikachu)**
- `evolvesFrom`: null
- `evolvesTo`: [{ pokemonNumber: "026", stage: STAGE_1 }] // Raichu

**Stage 1 Pokémon (Raichu)**
- `evolvesFrom`: { pokemonNumber: "025", stage: BASIC } // Pikachu
- `evolvesTo`: [] // No further evolution

**Conditional Evolution (Dark Raichu)**
- `evolvesFrom`: { pokemonNumber: "025", stage: BASIC, condition: "Dark" }
- `evolvesTo`: []

**Branching Evolution (Eevee)**
- `evolvesFrom`: null
- `evolvesTo`: [
    { pokemonNumber: "134", stage: STAGE_1 }, // Vaporeon
    { pokemonNumber: "135", stage: STAGE_1 }, // Jolteon
    { pokemonNumber: "136", stage: STAGE_1 }, // Flareon
    // ... etc
  ]

## Combat Modifiers

### Weakness
Represents increased damage from a specific energy type.
- **Type**: Energy type the Pokémon is weak to
- **Modifier**: Damage multiplier or addition (e.g., "×2", "+20")

### Resistance
Represents reduced damage from a specific energy type.
- **Type**: Energy type the Pokémon resists
- **Modifier**: Damage reduction (e.g., "-20", "-30")

## Attacks

Each attack consists of:
- **Name**: Attack name
- **Energy Cost**: Array of energy types required (e.g., [ELECTRIC, ELECTRIC, COLORLESS])
- **Damage**: Damage output (e.g., "90", "30+", "20×", "" for non-damage attacks)
- **Text**: Human-readable effect description
- **Preconditions**: Conditions to check before attack executes (e.g., coin flips) (placeholder)
- **Effects**: Structured effects for game engine (placeholder)

### Attack Preconditions

Preconditions are checks or actions that must occur before the attack executes. Common examples:
- **Coin flips**: "Flip a coin. If tails, this attack does nothing."
- **Damage checks**: "You can use this attack only if this Pokémon has damage counters on it."
- **Energy requirements**: "This attack can't be used unless [condition]."
- **Position checks**: "You can use this attack only if [condition]."

Preconditions are structured as:
```typescript
{
  type: string;        // e.g., "COIN_FLIP", "DAMAGE_CHECK"
  value?: any;         // Parameters (number of coins, etc.)
  description: string; // Human-readable description
}
```

### Example Attacks:

**Simple Attack (No Preconditions):**
```typescript
{
  name: "Thunderbolt",
  energyCost: [ELECTRIC, ELECTRIC, COLORLESS],
  damage: "90",
  text: "Discard all Energy from this Pokémon.",
  preconditions: undefined,
  effects: [] // Placeholder
}
```

**Attack with Precondition:**
```typescript
{
  name: "Razor Leaf",
  energyCost: [GRASS],
  damage: "30",
  text: "Flip a coin. If tails, this attack does nothing.",
  preconditions: [
    {
      type: "COIN_FLIP",
      value: 1,
      description: "Flip a coin. If tails, this attack does nothing."
    }
  ],
  effects: [] // Placeholder
}
```

**Attack with Multiple Preconditions:**
```typescript
{
  name: "Flare Blitz",
  energyCost: [FIRE, FIRE, COLORLESS],
  damage: "120",
  text: "Flip 2 coins. This attack does 40 damage for each heads.",
  preconditions: [
    {
      type: "COIN_FLIP",
      value: 2,
      description: "Flip 2 coins"
    }
  ],
  effects: [] // Placeholder
}
```

## Attack Effects

Attack effects define what happens when an attack executes. Each attack can have multiple effects.

### Effect Structure
All effects share a common structure:
- **effectType**: Type of effect (DISCARD_ENERGY, STATUS_CONDITION, etc.)
- **target**: Who is affected (self, defending, benched)
- **requiredConditions**: Optional conditions that must be met

### 8 Core Effect Types

1. **DISCARD_ENERGY**: Discard energy from this or defending Pokémon
2. **STATUS_CONDITION**: Apply status (Paralyzed, Poisoned, Burned, Asleep, Confused)
3. **DAMAGE_MODIFIER**: Increase or decrease attack damage
4. **HEAL**: Heal damage from this or defending Pokémon
5. **PREVENT_DAMAGE**: Prevent damage during next/this turn
6. **RECOIL_DAMAGE**: This Pokémon takes recoil damage
7. **ENERGY_ACCELERATION**: Attach energy from deck/discard/hand
8. **SWITCH_POKEMON**: Switch this Pokémon with benched

### Example Effects

**Simple Status Effect:**
```typescript
{
  effectType: AttackEffectType.STATUS_CONDITION,
  target: 'defending',
  statusCondition: 'PARALYZED'
}
```

**Conditional Effect:**
```typescript
{
  effectType: AttackEffectType.DAMAGE_MODIFIER,
  modifier: 30,
  requiredConditions: [
    { type: ConditionType.SELF_HAS_DAMAGE }
  ]
}
```

**Complex Effect:**
```typescript
{
  effectType: AttackEffectType.DISCARD_ENERGY,
  target: 'self',
  amount: 2,
  energyType: EnergyType.FIRE
}
```

See [ATTACK-EFFECTS.md](./ATTACK-EFFECTS.md) for complete documentation.

---

## Generic Condition System

Conditions are reusable requirements that can be attached to effects, abilities, and rules. They determine when something should trigger or apply.

### Condition Categories

1. **Always**: No requirements
2. **Coin Flip Based**: COIN_FLIP_SUCCESS, COIN_FLIP_FAILURE
3. **Self Conditions**: SELF_HAS_DAMAGE, SELF_NO_DAMAGE, SELF_HAS_STATUS, etc.
4. **Opponent Conditions**: OPPONENT_CONFUSED, OPPONENT_HAS_DAMAGE, etc.
5. **Board State**: STADIUM_IN_PLAY, OPPONENT_HAS_BENCHED, etc.

### Example Conditions

```typescript
// Simple condition
{ type: ConditionType.SELF_HAS_DAMAGE }

// Condition with value
{
  type: ConditionType.SELF_HAS_ENERGY_TYPE,
  value: { energyType: EnergyType.FIRE, minimumAmount: 3 }
}

// Multiple conditions (AND logic)
[
  { type: ConditionType.COIN_FLIP_SUCCESS },
  { type: ConditionType.OPPONENT_HAS_DAMAGE }
]
```

See [CONDITION-SYSTEM.md](./CONDITION-SYSTEM.md) for complete documentation.

---

## Abilities

Abilities are passive, triggered, or activated effects that Pokémon can have. The ability system is fully implemented with structured effects and validation.

### Ability Structure
- **name**: Ability name
- **text**: Human-readable description
- **activationType**: How the ability activates (PASSIVE, TRIGGERED, or ACTIVATED)
- **effects**: Array of structured effects
- **triggerEvent**: Game event that triggers the ability (for TRIGGERED abilities)
- **usageLimit**: Usage restriction (for ACTIVATED abilities): `UsageLimit.ONCE_PER_TURN` or `UsageLimit.UNLIMITED`

### Activation Types

**1. PASSIVE** - Always active, no player action required
- Example: "All your Fire Pokémon do 10 more damage"

**2. TRIGGERED** - Automatically activates on specific game events
- Game Events: WHEN_PLAYED, WHEN_DAMAGED, WHEN_ATTACKING, WHEN_DEFENDING, BETWEEN_TURNS, WHEN_KNOCKED_OUT, START_OF_TURN, END_OF_TURN
- Example: "When this Pokémon is damaged, draw a card"

**3. ACTIVATED** - Player chooses to use it
- Usage Limits: UsageLimit.ONCE_PER_TURN or UsageLimit.UNLIMITED
- Example: "Once during your turn, you may heal 30 damage"

### Ability Effects (13 types)

**Shared with Attacks (5):**
1. HEAL - Heal damage from Pokémon
2. PREVENT_DAMAGE - Prevent damage
3. STATUS_CONDITION - Apply status conditions
4. ENERGY_ACCELERATION - Attach energy from deck/discard/hand
5. SWITCH_POKEMON - Switch active/benched Pokémon

**Ability-Specific (8):**
6. DRAW_CARDS - Draw cards from deck
7. SEARCH_DECK - Search deck for specific cards
8. BOOST_ATTACK - Increase attack damage (for self or allies)
9. BOOST_HP - Increase maximum HP
10. REDUCE_DAMAGE - Reduce incoming damage
11. DISCARD_FROM_HAND - Discard cards from hand
12. ATTACH_FROM_DISCARD - Attach from discard pile
13. RETRIEVE_FROM_DISCARD - Put cards from discard to hand

### Example Abilities

**Passive Ability:**
```typescript
const blaze = new Ability(
  'Blaze',
  'All your Fire Pokémon do 10 more damage',
  AbilityActivationType.PASSIVE,
  [AbilityEffectFactory.boostAttack('all_yours', 10, [PokemonType.FIRE])]
);
```

**Triggered Ability:**
```typescript
const roughSkin = new Ability(
  'Rough Skin',
  'When this Pokémon is damaged, draw a card',
  AbilityActivationType.TRIGGERED,
  [AbilityEffectFactory.drawCards(1)],
  GameEventType.WHEN_DAMAGED
);
```

**Activated Ability:**
```typescript
const solarPower = new Ability(
  'Solar Power',
  'Once during your turn, you may heal 30 damage',
  AbilityActivationType.ACTIVATED,
  [AbilityEffectFactory.heal('benched_yours', 30)],
  undefined,
  UsageLimit.ONCE_PER_TURN
);
```

See [ABILITY-EFFECTS.md](./ABILITY-EFFECTS.md) for complete documentation.

## Card Rules

Special rules that modify card behavior:
- **rulesText**: Human-readable rules printed on card (e.g., "This Pokémon can't retreat")
- **cardRules**: Programmatic representation for game engine (placeholder)

## Subtypes

Cards can have multiple subtypes for additional classification:
- Pokémon: "Pokémon V", "Pokémon VMAX", "Rapid Strike", "Fusion Strike"
- Trainer: Additional categorizations beyond the main trainer type
- Special mechanics: "Team Plasma", "Delta Species"

## Metadata

Additional information about the card:
- **description**: Flavor text
- **artist**: Illustrator name
- **imageUrl**: Path to card image
- **regulationMark**: Tournament legality marker (e.g., "D", "E", "F")
- **rarity**: Card rarity (COMMON, UNCOMMON, RARE, etc.)

## Business Logic

### Validation Rules
1. Pokémon-specific fields (HP, attacks, etc.) can only be set on Pokémon cards
2. Trainer-specific fields can only be set on Trainer cards
3. Energy-specific fields can only be set on Energy cards
4. HP must be greater than 0
5. Retreat cost cannot be negative
6. Basic Pokémon cannot have `evolvesFrom`
7. Special energy effects can only be set on special energy cards

### Query Methods
- `isPokemonCard()`: Check if card is a Pokémon
- `isTrainerCard()`: Check if card is a Trainer
- `isEnergyCard()`: Check if card is an Energy
- `isBasicPokemon()`: Check if Pokémon is Basic stage
- `isEvolutionPokemon()`: Check if Pokémon is an evolution
- `canRetreat()`: Check if Pokémon can retreat (checks for retreat-blocking rules)
- `hasAbility()`: Check if card has an ability
- `hasWeakness()`: Check if card has weakness
- `hasResistance()`: Check if card has resistance

## Factory Methods

The Card entity provides factory methods for creating specific card types:

```typescript
// Create a Pokémon card
Card.createPokemonCard(instanceId, cardId, pokemonNumber, name, ...);

// Create a Trainer card
Card.createTrainerCard(instanceId, cardId, pokemonNumber, name, ...);

// Create an Energy card
Card.createEnergyCard(instanceId, cardId, pokemonNumber, name, ...);
```

## Implementation Status

### ✅ Phase 1 Complete
1. **Card Entity**: 30+ fields with business logic
2. **Attack Preconditions**: Type-safe precondition system (COIN_FLIP, DAMAGE_CHECK, ENERGY_CHECK)
3. **Attack Effects**: 8 core effect types with validation
4. **Generic Condition System**: Reusable conditions for effects, abilities, and rules
5. **Ability Effects**: 13 effect types (5 shared, 8 ability-specific) with 3 activation types
6. **Game Event System**: Reusable game event types for triggers
7. **Validation**: Comprehensive validators for all systems
8. **Factory Methods**: Easy creation with type safety
9. **Complete Documentation**: Detailed guides and examples

### 🔄 Phase 2 (To Be Implemented)
1. **Card Rules**: Programmatic rule execution (last placeholder)
2. **Game Engine Integration**: Execute preconditions, effects, and conditions
3. **Effect Resolution**: Handle complex effect interactions and ordering
4. **Additional Effect Types**: Expand as needed for more card mechanics

