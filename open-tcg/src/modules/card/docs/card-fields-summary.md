# Card Fields Summary

Complete list of all fields a Card can hold in the OpenTCG system.

## 🆔 Identity & Cataloging

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instanceId` | `string` (UUID) | ✅ Yes | Unique identifier for this specific card instance |
| `cardId` | `string` | ✅ Yes | Unique identifier for this card variant/printing |
| `pokemonNumber` | `string` | ✅ Yes | Pokédex number (e.g., "025" for Pikachu) |
| `name` | `string` | ✅ Yes | Card name |
| `setName` | `string` | ✅ Yes | Expansion set name |
| `cardNumber` | `string` | ✅ Yes | Card position in set (e.g., "25/102") |
| `rarity` | `Rarity` enum | ✅ Yes | Card rarity (COMMON, UNCOMMON, RARE, etc.) |

## 🃏 Card Type & Classification

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `cardType` | `CardType` enum | ✅ Yes | All | POKEMON, TRAINER, or ENERGY |
| `pokemonType` | `PokemonType` enum | Conditional | Pokémon only | Fire, Water, Grass, Electric, etc. |
| `stage` | `EvolutionStage` enum | Conditional | Pokémon only | BASIC, STAGE_1, STAGE_2, VMAX, etc. |
| `level` | `number` | ⚪ Optional | Pokémon only | Numeric level (used in older sets, e.g., 12, 45) |
| `subtypes` | `string[]` | ⚪ Optional | All | Additional classifications (e.g., ["Pokémon V", "Rapid Strike"]) |

## 🧬 Evolution Chain

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `evolvesFrom` | `Evolution` | ⚪ Optional | Pokémon only | Previous evolution with optional condition |
| `evolvesTo` | `Evolution[]` | ⚪ Optional | Pokémon only | Possible next evolutions (array for branching) |

**Evolution Object Structure:**
```typescript
{
  pokemonNumber: string,  // Pokédex number
  stage: EvolutionStage,  // Evolution stage
  condition?: string      // Optional condition (e.g., "Dark", "Water Stone")
}
```

## ⚔️ Battle Stats

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `hp` | `number` | Conditional | Pokémon only | Health points (must be > 0) |
| `retreatCost` | `number` | ⚪ Optional | Pokémon only | Number of energy cards needed to retreat |

## 🛡️ Combat Modifiers

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `weakness` | `Weakness` | ⚪ Optional | Pokémon only | Type weakness with modifier |
| `resistance` | `Resistance` | ⚪ Optional | Pokémon only | Type resistance with modifier |

**Weakness Object Structure:**
```typescript
{
  type: EnergyType,     // Energy type (e.g., FIRE, WATER)
  modifier: string      // Damage modifier (e.g., "×2", "+20")
}
```

**Resistance Object Structure:**
```typescript
{
  type: EnergyType,     // Energy type (e.g., FIRE, WATER)
  modifier: string      // Damage reduction (e.g., "-20", "-30")
}
```

## 💥 Actions & Abilities

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `attacks` | `Attack[]` | ⚪ Optional | Pokémon only | Array of attacks the Pokémon can perform |
| `ability` | `Ability` | ⚪ Optional | Pokémon only | Passive or triggered ability |

**Attack Object Structure:**
```typescript
{
  name: string,                        // Attack name (e.g., "Thunderbolt")
  energyCost: EnergyType[],            // Required energy (e.g., [ELECTRIC, ELECTRIC, COLORLESS])
  damage: string,                      // Damage output (e.g., "90", "30+", "20×", "")
  text: string,                        // Human-readable description
  preconditions?: AttackPrecondition[] // Conditions before attack (e.g., coin flips)
  effects?: AttackEffect[]             // Structured effects (placeholder)
}
```

**AttackPrecondition Structure:**
```typescript
{
  type: string,        // e.g., "COIN_FLIP", "DAMAGE_CHECK"
  value?: any,         // Parameters (number of coins, etc.)
  description: string  // Human-readable description
}
```

**Ability Object Structure:**
```typescript
{
  name: string,             // Ability name
  text: string,             // Human-readable description
  effects?: AbilityEffect[] // Structured effects (placeholder)
}
```

## 📜 Rules & Effects

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `rulesText` | `string` | ⚪ Optional | All | Human-readable special rules printed on card |
| `cardRules` | `CardRule[]` | ⚪ Optional | All | Programmatic rule representation for game engine (placeholder) |

**CardRule Structure (Placeholder):**
```typescript
{
  ruleType: string,    // Type of rule (e.g., "CANNOT_RETREAT")
  condition?: string,  // When rule applies
  effect: any,         // Structured effect data
  priority?: number    // Execution order
}
```

## 🎴 Trainer Card Specific

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `trainerType` | `TrainerType` enum | Conditional | Trainer only | ITEM, SUPPORTER, STADIUM, or TOOL |
| `trainerEffect` | `string` | ⚪ Optional | Trainer only | Description of trainer effect |

## ⚡ Energy Card Specific

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `energyType` | `EnergyType` enum | Conditional | Energy only | Type of energy provided |
| `isSpecialEnergy` | `boolean` | ✅ Yes | Energy only | Basic vs Special energy (default: false) |
| `specialEnergyEffect` | `string` | ⚪ Optional | Energy only | Special energy effects (only if isSpecialEnergy is true) |

## 📝 Metadata

| Field | Type | Required | Applies To | Description |
|-------|------|----------|------------|-------------|
| `description` | `string` | ✅ Yes | All | Flavor text or card description |
| `artist` | `string` | ✅ Yes | All | Illustrator name |
| `imageUrl` | `string` | ✅ Yes | All | Path/URL to card image |
| `regulationMark` | `string` | ⚪ Optional | All | Tournament legality marker (e.g., "D", "E", "F") |

---

## Enums Reference

### CardType
```typescript
POKEMON, TRAINER, ENERGY
```

### EvolutionStage
```typescript
BASIC, STAGE_1, STAGE_2, VMAX, VSTAR, GX, EX, MEGA, BREAK, LEGEND
```

### PokemonType / EnergyType
```typescript
FIRE, WATER, GRASS, ELECTRIC, PSYCHIC, FIGHTING, 
DARKNESS, METAL, FAIRY, DRAGON, COLORLESS
```

### Rarity
```typescript
COMMON, UNCOMMON, RARE, HOLO_RARE, RARE_HOLO, 
ULTRA_RARE, SECRET_RARE, PROMO
```

### TrainerType
```typescript
ITEM, SUPPORTER, STADIUM, TOOL
```

---

## Field Count Summary

- **Total Fields**: 30+
- **Required Fields (all cards)**: 10
- **Pokémon-specific Fields**: 15+
- **Trainer-specific Fields**: 2
- **Energy-specific Fields**: 3
- **Metadata Fields**: 4
- **Placeholder Fields (for future expansion)**: 3

---

## Validation Rules

1. ✅ All required fields must be present
2. ✅ Pokémon-specific fields can only be set on Pokémon cards
3. ✅ Trainer-specific fields can only be set on Trainer cards
4. ✅ Energy-specific fields can only be set on Energy cards
5. ✅ HP must be greater than 0
6. ✅ Retreat cost cannot be negative
7. ✅ Level cannot be negative
8. ✅ Basic Pokémon cannot have `evolvesFrom`
9. ✅ Special energy effects require `isSpecialEnergy` to be true
10. ✅ Weakness modifier must match format: `×2`, `+20`, etc.
11. ✅ Resistance modifier must match format: `-20`, `-30`, etc.

---

## Example: Complete Pokémon Card (Pikachu)

```typescript
{
  // Identity
  instanceId: "550e8400-e29b-41d4-a716-446655440000",
  cardId: "base-set-025-pikachu-lv12",
  pokemonNumber: "025",
  name: "Pikachu",
  setName: "Base Set",
  cardNumber: "58/102",
  rarity: Rarity.COMMON,
  
  // Classification
  cardType: CardType.POKEMON,
  pokemonType: PokemonType.ELECTRIC,
  stage: EvolutionStage.BASIC,
  level: 12,
  subtypes: [],
  
  // Evolution
  evolvesFrom: null,
  evolvesTo: [
    { pokemonNumber: "026", stage: EvolutionStage.STAGE_1 }
  ],
  
  // Battle Stats
  hp: 60,
  retreatCost: 1,
  
  // Combat Modifiers
  weakness: { type: EnergyType.FIGHTING, modifier: "×2" },
  resistance: null,
  
  // Actions
  attacks: [
    {
      name: "Thunder Shock",
      energyCost: [EnergyType.ELECTRIC],
      damage: "10",
      text: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed.",
      preconditions: [
        {
          type: "COIN_FLIP",
          value: 1,
          description: "Flip a coin"
        }
      ],
      effects: []
    }
  ],
  ability: null,
  
  // Metadata
  description: "When several of these Pokémon gather, their electricity could build and cause lightning storms.",
  artist: "Mitsuhiro Arita",
  imageUrl: "/cards/base-set/pikachu-58.png",
  regulationMark: null
}
```

