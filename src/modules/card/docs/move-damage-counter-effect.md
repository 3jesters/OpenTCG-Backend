# MOVE_DAMAGE_COUNTER Ability Effect - Client Documentation

## Overview

A new ability effect type `MOVE_DAMAGE_COUNTER` has been implemented to properly represent abilities that **transfer damage counters** from one Pokémon to another, rather than simply healing damage.

## What Changed

### Previous Implementation (Incorrect)

Previously, Alakazam's "Damage Swap" ability was incorrectly represented using the `HEAL` effect:

```json
{
  "effectType": "HEAL",
  "target": "ALL_YOURS",
  "amount": 10
}
```

**Problem**: This only healed damage but didn't actually move it from one Pokémon to another, which is what the ability text specifies.

### New Implementation (Correct)

Alakazam's ability now uses the new `MOVE_DAMAGE_COUNTER` effect:

```json
{
  "effectType": "MOVE_DAMAGE_COUNTER",
  "sourceTarget": "ALL_YOURS",
  "destinationTarget": "ALL_YOURS",
  "amount": 1,
  "preventKnockout": true
}
```

**Solution**: This correctly represents moving 1 damage counter (10 HP) from one of your Pokémon to another, with protection against KO'ing the source Pokémon.

---

## Effect Structure

### MOVE_DAMAGE_COUNTER Effect

```typescript
{
  effectType: "MOVE_DAMAGE_COUNTER",
  sourceTarget: TargetType,        // Required: Where to take damage from
  destinationTarget: TargetType,   // Required: Where to add damage to
  amount: number,                  // Required: Number of damage counters (1 counter = 10 HP)
  preventKnockout?: boolean        // Optional: Prevent KO'ing source (default: true)
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `effectType` | `"MOVE_DAMAGE_COUNTER"` | ✅ | Must be exactly this value |
| `sourceTarget` | `TargetType` | ✅ | Source Pokémon(s) to take damage from |
| `destinationTarget` | `TargetType` | ✅ | Destination Pokémon(s) to add damage to |
| `amount` | `number` | ✅ | Number of damage counters to move (≥ 1) |
| `preventKnockout` | `boolean` | ❌ | If `true`, cannot move damage that would KO source (default: `true`) |

### Valid Target Types

Both `sourceTarget` and `destinationTarget` must be one of:
- `"SELF"` - The Pokémon using the ability
- `"ALL_YOURS"` - Any of your Pokémon (active or bench)
- `"BENCHED_YOURS"` - Any of your benched Pokémon
- `"ACTIVE_YOURS"` - Your active Pokémon

**Note**: Source and destination cannot be the same Pokémon.

---

## API Usage

### When Creating Cards via Card Editor

If you're creating a card with an ability that moves damage counters, use this structure:

```json
{
  "ability": {
    "name": "Damage Swap",
    "text": "Move 1 damage counter from 1 of your Pokémon to another",
    "activationType": "ACTIVATED",
    "usageLimit": "UNLIMITED",
    "effects": [
      {
        "effectType": "MOVE_DAMAGE_COUNTER",
        "sourceTarget": "ALL_YOURS",
        "destinationTarget": "ALL_YOURS",
        "amount": 1,
        "preventKnockout": true
      }
    ]
  }
}
```

### When Using Abilities in Game

When a player uses an ability with `MOVE_DAMAGE_COUNTER`, the client must send:

```json
{
  "actionType": "USE_ABILITY",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-alakazam--1",
    "target": "ACTIVE",  // Position of Pokémon using the ability
    "sourcePokemon": "BENCH_0",      // Required: Source Pokémon position
    "destinationPokemon": "ACTIVE"   // Required: Destination Pokémon position
  }
}
```

**Important**: Both `sourcePokemon` and `destinationPokemon` must be provided in `actionData`.

---

## Differences from HEAL

| Aspect | HEAL | MOVE_DAMAGE_COUNTER |
|--------|------|---------------------|
| **Effect** | Removes damage (heals) | Transfers damage from source to destination |
| **Targets** | Single target | Two targets (source + destination) |
| **Damage** | Damage is removed from game | Damage is preserved, just moved |
| **Use Case** | Healing abilities | Damage redistribution abilities |

### Example: HEAL vs MOVE_DAMAGE_COUNTER

**HEAL Example** (Slowbro's "Strange Behavior"):
```json
{
  "effectType": "HEAL",
  "target": "SELF",
  "amount": 20
}
```
- Removes 20 HP of damage from Slowbro
- Damage is gone from the game

**MOVE_DAMAGE_COUNTER Example** (Alakazam's "Damage Swap"):
```json
{
  "effectType": "MOVE_DAMAGE_COUNTER",
  "sourceTarget": "ALL_YOURS",
  "destinationTarget": "ALL_YOURS",
  "amount": 1
}
```
- Takes 10 HP of damage from one Pokémon
- Adds 10 HP of damage to another Pokémon
- Total damage in play remains the same

---

## Validation Rules

1. **Amount**: Must be ≥ 1 (represents number of damage counters)
2. **Source ≠ Destination**: Source and destination cannot be the same Pokémon
3. **Prevent Knockout**: If `preventKnockout: true`, the move will fail if it would KO the source Pokémon
4. **Target Types**: Both targets must be valid `TargetType` values (see above)
5. **Pokémon Selection**: Client must provide both `sourcePokemon` and `destinationPokemon` positions in `actionData`

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"Source Pokemon not found"` | Invalid `sourcePokemon` position | Ensure position exists in player's field |
| `"Destination Pokemon not found"` | Invalid `destinationPokemon` position | Ensure position exists in player's field |
| `"Source and destination Pokemon cannot be the same"` | Same position for both | Select different Pokémon |
| `"Cannot move damage: would Knock Out the source Pokemon"` | Moving damage would KO source (if `preventKnockout: true`) | Select a different source or reduce amount |

---

## Example: Alakazam's Damage Swap

### Card Data
```json
{
  "name": "Alakazam",
  "ability": {
    "name": "Damage Swap",
    "text": "As often as you like during your turn (before your attack), you may move 1 damage counter from 1 of your Pokémon to another as long as you don't Knock Out that Pokémon.",
    "activationType": "ACTIVATED",
    "usageLimit": "UNLIMITED",
    "effects": [
      {
        "effectType": "MOVE_DAMAGE_COUNTER",
        "sourceTarget": "ALL_YOURS",
        "destinationTarget": "ALL_YOURS",
        "amount": 1,
        "preventKnockout": true
      }
    ]
  }
}
```

### Game Usage
```json
{
  "actionType": "USE_ABILITY",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-alakazam--1",
    "target": "ACTIVE",
    "sourcePokemon": "BENCH_0",    // Take 10 HP from bench Pokémon
    "destinationPokemon": "ACTIVE"  // Add 10 HP to Alakazam
  }
}
```

**Result**:
- Bench Pokémon at `BENCH_0`: Loses 10 HP
- Alakazam (active): Gains 10 HP of damage
- Total damage in play: Unchanged (just redistributed)

---

## Migration Notes

### For Existing Cards

If you have cards using `HEAL` that should actually move damage:
1. Change `effectType` from `"HEAL"` to `"MOVE_DAMAGE_COUNTER"`
2. Add `sourceTarget` and `destinationTarget` fields
3. Convert `amount` from HP to damage counters (divide by 10)
4. Add `preventKnockout: true` if the ability text prevents KO

### For Clients

Update your ability usage UI to:
1. Show source Pokémon selection when `MOVE_DAMAGE_COUNTER` is present
2. Show destination Pokémon selection
3. Validate that source ≠ destination
4. Check if move would KO source (if `preventKnockout: true`)

---

## Summary

- ✅ **New Effect Type**: `MOVE_DAMAGE_COUNTER` for damage transfer abilities
- ✅ **Correct Implementation**: Alakazam's ability now properly moves damage
- ✅ **Two-Target System**: Requires both source and destination Pokémon
- ✅ **KO Protection**: Optional `preventKnockout` flag prevents accidental KOs
- ✅ **Backward Compatible**: Existing `HEAL` effects continue to work

For questions or issues, refer to the main [Card Editor API Documentation](./card-editor-api.md).

