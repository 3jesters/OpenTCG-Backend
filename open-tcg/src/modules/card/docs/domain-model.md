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

## Abilities

Abilities are passive or triggered effects that Pokémon can have:
- **Name**: Ability name
- **Text**: Human-readable description
- **Effects**: Structured effects for game engine (placeholder)

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

## Future Enhancements

### Placeholders (To Be Implemented)
1. **Attack Effects**: Structured representation of attack effects for game engine
2. **Ability Effects**: Structured representation of ability effects
3. **Card Rules**: Structured rules for game engine execution
4. **Effect System**: Complete effect resolution system

