# Client Guide: Energy Acceleration Source Pokemon Selection

## Overview

This guide documents the new `sourcePokemonTarget` metadata field for `ENERGY_ACCELERATION` abilities. This feature allows abilities like Venusaur's "Energy Trans" to specify which Pokemon(s) can be selected as the source when moving energy from attached Pokemon (`source: SELF`).

## Problem Solved

Previously, when an ability had `source: SELF`, the backend always used the Pokemon with the ability as the source. This was hardcoded and didn't support abilities that allow selecting any Pokemon as the source.

**Example:** Venusaur's "Energy Trans" ability allows taking energy from ANY of your Pokemon, not just Venusaur itself.

## API Changes

### Ability Effect DTO - New Field

The `AbilityEffectDto` now includes an optional `sourcePokemonTarget` field:

```typescript
interface AbilityEffectDto {
  effectType: AbilityEffectType.ENERGY_ACCELERATION;
  target: TargetType; // e.g., BENCHED_YOURS
  source: EnergySource.SELF;
  count: number;
  energyType?: EnergyType; // e.g., GRASS
  targetPokemonType?: PokemonType;
  sourcePokemonType?: PokemonType;
  sourcePokemonTarget?: TargetType; // NEW FIELD
  // ... other fields
}
```

### Field Details

**`sourcePokemonTarget`** (optional, `TargetType`)
- **When present**: Specifies which Pokemon(s) can be selected as the source when `source === SELF`
- **Valid values**: `SELF`, `ALL_YOURS`, `BENCHED_YOURS`, `ACTIVE_YOURS`
- **Default**: If not specified, defaults to `SELF` (backward compatible)
- **Only valid**: When `source === EnergySource.SELF`

### USE_ABILITY Action Data - New Field

The `EnergyAccelerationAbilityActionData` now includes an optional `sourcePokemon` field:

```typescript
interface EnergyAccelerationAbilityActionData {
  cardId: string; // Pokemon using the ability
  target: PokemonPosition; // Position of Pokemon using the ability
  targetPokemon?: PokemonPosition; // Target Pokemon to attach energy to
  sourcePokemon?: PokemonPosition; // NEW: Source Pokemon when sourcePokemonTarget !== SELF
  selectedCardIds?: string[]; // Energy cards selected
}
```

## API Response Examples

### Example 1: Venusaur - Energy Trans (with sourcePokemonTarget)

**GET `/api/v1/cards/pokemon-base-set-v1.0-venusaur--15`**

```json
{
  "id": "pokemon-base-set-v1.0-venusaur--15",
  "abilities": [
    {
      "name": "Energy Trans",
      "text": "As often as you like during your turn (before your attack), you may take 1 Grass Energy card attached to 1 of your Pokémon and attach it to a different one.",
      "activationType": "ACTIVATED",
      "usageLimit": "UNLIMITED",
      "effects": [
        {
          "effectType": "ENERGY_ACCELERATION",
          "target": "BENCHED_YOURS",
          "source": "SELF",
          "count": 1,
          "energyType": "GRASS",
          "sourcePokemonTarget": "ALL_YOURS"
        }
      ]
    }
  ]
}
```

### Example 2: Blastoise - Rain Dance (no sourcePokemonTarget, uses default)

**GET `/api/v1/cards/pokemon-base-set-v1.0-blastoise--2`**

```json
{
  "id": "pokemon-base-set-v1.0-blastoise--2",
  "abilities": [
    {
      "name": "Rain Dance",
      "text": "As often as you like during your turn (before your attack), you may attach 1 Water Energy card from your hand to 1 of your Water Pokémon.",
      "activationType": "ACTIVATED",
      "usageLimit": "UNLIMITED",
      "effects": [
        {
          "effectType": "ENERGY_ACCELERATION",
          "target": "BENCHED_YOURS",
          "source": "DECK",
          "count": 1,
          "energyType": "WATER",
          "targetPokemonType": "WATER"
          // sourcePokemonTarget not present (not applicable for DECK source)
        }
      ]
    }
  ]
}
```

## Client Implementation Guide

### Step 1: Check for sourcePokemonTarget

When processing an `ENERGY_ACCELERATION` effect with `source === SELF`, check if `sourcePokemonTarget` is present:

```typescript
const effect = ability.effects[0]; // ENERGY_ACCELERATION effect

if (effect.source === EnergySource.SELF) {
  const sourcePokemonTarget = effect.sourcePokemonTarget || TargetType.SELF;
  
  if (sourcePokemonTarget !== TargetType.SELF) {
    // Step 1: Show Pokemon selection modal
    // Step 2: Show energy selection from selected Pokemon
    // Step 3: Show target Pokemon selection (if target !== SELF)
  } else {
    // Default behavior: Use Pokemon with ability
    // Step 1: Show energy selection from ability user
    // Step 2: Show target Pokemon selection (if target !== SELF)
  }
}
```

### Step 2: Selection Flow

#### Flow A: sourcePokemonTarget !== SELF (e.g., Venusaur)

**Step 1: Select Source Pokemon**
- Show Pokemon selection modal
- Filter Pokemon based on `sourcePokemonTarget`:
  - `ALL_YOURS`: Show all your Pokemon (active + bench)
  - `BENCHED_YOURS`: Show only benched Pokemon
  - `ACTIVE_YOURS`: Show only active Pokemon
- User selects one Pokemon
- Store selected Pokemon position in `sourcePokemon`

**Step 2: Select Energy from Source Pokemon**
- Show energy selection modal for the selected source Pokemon
- Filter by `energyType` if specified
- User selects `count` number of energy cards
- Store selected energy card IDs in `selectedCardIds`

**Step 3: Select Target Pokemon** (if `target !== SELF`)
- Show Pokemon selection modal
- Filter Pokemon based on `target`:
  - `BENCHED_YOURS`: Show only benched Pokemon
  - `ALL_YOURS`: Show all your Pokemon
  - `ACTIVE_YOURS`: Show only active Pokemon
- Filter by `targetPokemonType` if specified
- User selects one Pokemon
- Store selected Pokemon position in `targetPokemon`

#### Flow B: sourcePokemonTarget === SELF (default, backward compatible)

**Step 1: Select Energy from Ability User**
- Show energy selection modal for the Pokemon using the ability
- Filter by `energyType` if specified
- User selects `count` number of energy cards
- Store selected energy card IDs in `selectedCardIds`

**Step 2: Select Target Pokemon** (if `target !== SELF`)
- Same as Flow A, Step 3

### Step 3: Submit USE_ABILITY Action

**POST `/api/v1/matches/:matchId/actions`**

```json
{
  "playerId": "player-123",
  "actionType": "USE_ABILITY",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-venusaur--15",
    "target": "BENCH_0",
    "sourcePokemon": "ACTIVE",
    "targetPokemon": "BENCH_1",
    "selectedCardIds": ["pokemon-base-set-v1.0-grass-energy--98"]
  }
}
```

**Field Requirements:**
- `cardId`: Required - The Pokemon card template ID
- `target`: Required - Position of Pokemon using the ability
- `sourcePokemon`: **Required** when `sourcePokemonTarget !== SELF` - Position of Pokemon to take energy from
- `targetPokemon`: Required when `target !== SELF` - Position of Pokemon to attach energy to
- `selectedCardIds`: Required when `source === SELF` - Array of energy card IDs to move

## Validation Rules

### Backend Validation

The backend will validate:

1. **sourcePokemon required**: If `sourcePokemonTarget !== SELF`, `sourcePokemon` must be provided
2. **sourcePokemon exists**: The `sourcePokemon` position must have a valid Pokemon
3. **Energy cards exist**: All `selectedCardIds` must be attached to the `sourcePokemon`
4. **Energy type match**: If `energyType` is specified, all selected energy cards must match
5. **Energy count match**: Number of `selectedCardIds` must equal `count`

### Error Responses

**Missing sourcePokemon:**
```json
{
  "statusCode": 400,
  "message": "sourcePokemon is required for ENERGY_ACCELERATION effect when sourcePokemonTarget is not SELF",
  "error": "Bad Request"
}
```

**Invalid sourcePokemon:**
```json
{
  "statusCode": 400,
  "message": "Source Pokemon not found",
  "error": "Bad Request"
}
```

**Energy not attached to source:**
```json
{
  "statusCode": 400,
  "message": "Energy card pokemon-base-set-v1.0-grass-energy--98 is not attached to this Pokemon",
  "error": "Bad Request"
}
```

## Complete Example: Venusaur Energy Trans

### Initial State
- **Active Pokemon**: Venusaur (BENCH_0) - has 1 Grass Energy
- **Bench Pokemon 1**: Bulbasaur (BENCH_1) - has 1 Grass Energy
- **Bench Pokemon 2**: Pikachu (BENCH_2) - no energy

### Goal
Move 1 Grass Energy from Bulbasaur (BENCH_1) to Pikachu (BENCH_2)

### Step-by-Step Flow

**1. User clicks "Use Ability" on Venusaur**
- Ability metadata shows: `sourcePokemonTarget: "ALL_YOURS"`

**2. Client shows Pokemon selection modal**
- Filter: `ALL_YOURS` → Show all Pokemon
- Options: Venusaur (BENCH_0), Bulbasaur (BENCH_1), Pikachu (BENCH_2)
- User selects: Bulbasaur (BENCH_1)
- Store: `sourcePokemon = "BENCH_1"`

**3. Client shows energy selection modal**
- Target: Bulbasaur (BENCH_1)
- Available: 1 Grass Energy
- Filter: `energyType: "GRASS"` → Only Grass Energy shown
- User selects: 1 Grass Energy card
- Store: `selectedCardIds = ["pokemon-base-set-v1.0-grass-energy--98"]`

**4. Client shows target Pokemon selection modal**
- Filter: `target: "BENCHED_YOURS"` → Show only benched Pokemon
- Options: Venusaur (BENCH_0), Bulbasaur (BENCH_1), Pikachu (BENCH_2)
- User selects: Pikachu (BENCH_2)
- Store: `targetPokemon = "BENCH_2"`

**5. Client submits USE_ABILITY action**
```json
POST /api/v1/matches/match-123/actions
{
  "playerId": "player-1",
  "actionType": "USE_ABILITY",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-venusaur--15",
    "target": "BENCH_0",
    "sourcePokemon": "BENCH_1",
    "targetPokemon": "BENCH_2",
    "selectedCardIds": ["pokemon-base-set-v1.0-grass-energy--98"]
  }
}
```

**6. Backend Response**
```json
{
  "id": "match-123",
  "gameState": {
    "player1State": {
      "bench": [
        {
          "instanceId": "instance-1",
          "cardId": "pokemon-base-set-v1.0-venusaur--15",
          "position": "BENCH_0",
          "attachedEnergy": []
        },
        {
          "instanceId": "instance-2",
          "cardId": "pokemon-base-set-v1.0-bulbasaur--44",
          "position": "BENCH_1",
          "attachedEnergy": [] // Energy removed
        },
        {
          "instanceId": "instance-3",
          "cardId": "pokemon-base-set-v1.0-pikachu--60",
          "position": "BENCH_2",
          "attachedEnergy": ["pokemon-base-set-v1.0-grass-energy--98"] // Energy attached
        }
      ]
    }
  }
}
```

## Backward Compatibility

### Existing Abilities (no sourcePokemonTarget)

Abilities without `sourcePokemonTarget` continue to work as before:

- `sourcePokemonTarget` defaults to `SELF`
- No `sourcePokemon` field needed in actionData
- Energy is taken from the Pokemon using the ability

**Example:**
```json
{
  "effectType": "ENERGY_ACCELERATION",
  "source": "SELF",
  "target": "BENCHED_YOURS",
  "count": 1
  // sourcePokemonTarget not present → defaults to SELF
}
```

**Action Data:**
```json
{
  "cardId": "pokemon-card-id",
  "target": "ACTIVE",
  "targetPokemon": "BENCH_0",
  "selectedCardIds": ["energy-card-id"]
  // sourcePokemon not needed
}
```

## TypeScript Type Definitions

```typescript
enum TargetType {
  SELF = 'SELF',
  ALL_YOURS = 'ALL_YOURS',
  ACTIVE_YOURS = 'ACTIVE_YOURS',
  BENCHED_YOURS = 'BENCHED_YOURS',
  // ... other values
}

enum EnergySource {
  DECK = 'DECK',
  DISCARD = 'DISCARD',
  HAND = 'HAND',
  SELF = 'SELF',
}

interface AbilityEffectDto {
  effectType: AbilityEffectType.ENERGY_ACCELERATION;
  target: TargetType;
  source: EnergySource;
  count: number;
  energyType?: EnergyType;
  targetPokemonType?: PokemonType;
  sourcePokemonType?: PokemonType;
  sourcePokemonTarget?: TargetType; // NEW
}

interface EnergyAccelerationActionData {
  cardId: string;
  target: PokemonPosition;
  targetPokemon?: PokemonPosition;
  sourcePokemon?: PokemonPosition; // NEW - Required when sourcePokemonTarget !== SELF
  selectedCardIds?: string[];
}
```

## Summary

### Key Changes
1. **New field in API response**: `sourcePokemonTarget` in `AbilityEffectDto`
2. **New field in action data**: `sourcePokemon` in `USE_ABILITY` actionData
3. **New selection step**: When `sourcePokemonTarget !== SELF`, client must show Pokemon selection before energy selection

### When to Use sourcePokemon
- **Required**: When `effect.sourcePokemonTarget !== SELF` (or undefined defaults to SELF)
- **Not needed**: When `effect.sourcePokemonTarget === SELF` or not present (default behavior)

### Selection Order
1. **If `sourcePokemonTarget !== SELF`**: Select source Pokemon → Select energy → Select target Pokemon
2. **If `sourcePokemonTarget === SELF`**: Select energy → Select target Pokemon

### Example Cards
- **Venusaur - Energy Trans**: `sourcePokemonTarget: "ALL_YOURS"` (can select any Pokemon)
- **Most other abilities**: No `sourcePokemonTarget` (uses ability user as source)

