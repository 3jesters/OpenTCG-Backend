# Status Effect Coin Flip Fix - Client Documentation

## Overview

Fixed a bug where status effects from attacks were being applied incorrectly when coin flips were involved. Status effects now correctly respect coin flip results.

## What Changed

### Previous Behavior (Bug)
- Status effects (Paralysis, Confusion, Poison, Sleep, Burn) were applied **regardless** of coin flip results
- Example: An attack that says "Flip a coin. If heads, the Defending Pokémon is now Paralyzed" would apply paralysis even on **tails**

### New Behavior (Fixed)
- Status effects are now **only applied** when the coin flip condition is met
- Example: An attack that says "Flip a coin. If heads, the Defending Pokémon is now Paralyzed" will:
  - ✅ Apply paralysis if coin flip is **heads**
  - ❌ **Not** apply paralysis if coin flip is **tails**

## Affected Attack Patterns

This fix affects attacks with the following patterns:

### Pattern 1: "If heads" status effects
**Example Attacks:**
- Thunder Wave: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed."
- Confuse Ray: "Flip a coin. If heads, the Defending Pokémon is now Confused."
- Sing: "Flip a coin. If heads, the Defending Pokémon is now Asleep."
- Poison Sting: "Flip a coin. If heads, the Defending Pokémon is now Poisoned."

**Behavior:**
- Status effect applies **only** if coin flip is **heads**
- Damage still applies regardless of coin flip result (if the attack has damage)

### Pattern 2: "If tails" status effects
**Example Attacks:**
- Attacks that say "Flip a coin. If tails, the Defending Pokémon is now [Status]."

**Behavior:**
- Status effect applies **only** if coin flip is **tails**
- Damage still applies regardless of coin flip result (if the attack has damage)

## API Response Changes

### Before Fix
```json
{
  "lastAction": {
    "actionType": "ATTACK",
    "actionData": {
      "coinFlipResults": [
        {
          "flipIndex": 0,
          "result": "tails"
        }
      ],
      "statusEffectApplied": true,  // ❌ Wrong - applied even on tails
      "statusEffect": "PARALYZED"
    }
  },
  "opponentState": {
    "activePokemon": {
      "statusEffects": ["PARALYZED"]  // ❌ Wrong - should not be paralyzed
    }
  }
}
```

### After Fix
```json
{
  "lastAction": {
    "actionType": "ATTACK",
    "actionData": {
      "coinFlipResults": [
        {
          "flipIndex": 0,
          "result": "tails"
        }
      ],
      "statusEffectApplied": false,  // ✅ Correct - not applied on tails
      "statusEffect": null
    }
  },
  "opponentState": {
    "activePokemon": {
      "statusEffects": []  // ✅ Correct - no status effect applied
    }
  }
}
```

## Client-Side Impact

### What Clients Need to Update

1. **Status Effect Display Logic**
   - Previously, clients could assume `statusEffectApplied: true` meant the status was applied
   - Now, clients should check both:
     - `statusEffectApplied: true/false` (indicates if status effect was attempted)
     - `coinFlipResults` (if present, verify the result matches the requirement)
     - `opponentState.activePokemon.statusEffects` (actual status effects on the Pokemon)

2. **User Feedback Messages**
   - Update messages to reflect accurate coin flip results
   - Example: "Attack succeeded! Flip 1: Tails. Dealt 20 damage. Status effect not applied (requires heads)."

3. **Visual Indicators**
   - Ensure status effect indicators (paralysis icon, confusion icon, etc.) only appear when the Pokemon actually has the status effect
   - Don't show status effects based solely on `statusEffectApplied` flag

### Recommended Client Implementation

```typescript
// Example: Check if status effect should be displayed
function shouldShowStatusEffect(
  actionData: AttackActionData,
  opponentPokemon: PokemonState
): boolean {
  // Check if Pokemon actually has the status effect
  const hasStatusEffect = opponentPokemon.statusEffects.length > 0;
  
  // If coin flip was involved, verify it succeeded
  if (actionData.coinFlipResults && actionData.coinFlipResults.length > 0) {
    const attackText = getAttackText(actionData.attackIndex);
    const requiresHeads = attackText.toLowerCase().includes('if heads');
    const requiresTails = attackText.toLowerCase().includes('if tails');
    
    if (requiresHeads || requiresTails) {
      const coinFlipResult = actionData.coinFlipResults[0].result;
      const conditionMet = requiresHeads 
        ? coinFlipResult === 'heads' 
        : coinFlipResult === 'tails';
      
      // Only show status effect if condition was met AND Pokemon has it
      return conditionMet && hasStatusEffect;
    }
  }
  
  // For attacks without coin flips, show if Pokemon has status effect
  return hasStatusEffect;
}
```

## Testing Recommendations

### Test Cases for Clients

1. **Heads Required - Heads Result**
   - Attack with "Flip a coin. If heads, paralyze"
   - Coin flip: **heads**
   - Expected: Status effect applied ✅

2. **Heads Required - Tails Result**
   - Attack with "Flip a coin. If heads, paralyze"
   - Coin flip: **tails**
   - Expected: Status effect **not** applied ✅

3. **Tails Required - Tails Result**
   - Attack with "Flip a coin. If tails, confuse"
   - Coin flip: **tails**
   - Expected: Status effect applied ✅

4. **Tails Required - Heads Result**
   - Attack with "Flip a coin. If tails, confuse"
   - Coin flip: **heads**
   - Expected: Status effect **not** applied ✅

## Migration Notes

- **Breaking Change**: No breaking changes to API structure
- **Behavioral Change**: Yes - status effects now correctly respect coin flip results
- **Backward Compatibility**: Existing API responses maintain the same structure, but values may differ based on coin flip results

## Related Documentation

- [Status Effect Coin Flip Validation](./STATUS-EFFECT-COIN-FLIP-VALIDATION.md)
- [Attack Execution Flow](./ATTACK-EXECUTION-FLOW.md)

## Date

**Fixed:** December 22, 2025

## Questions?

If you encounter any issues or have questions about this fix, please contact the development team.

