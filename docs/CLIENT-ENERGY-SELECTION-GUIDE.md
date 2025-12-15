# Client Energy Selection Guide

## Overview

Some attacks require discarding energy cards as a **cost** before the attack executes. This is indicated by a structured `DISCARD_ENERGY` effect with `target: "SELF"` in the attack's `effects` array. This guide explains how the client should handle energy selection for these attacks.

**Note**: This guide covers energy discard **costs** (before attack). Energy discard **effects** (after attack, targeting DEFENDING) are handled automatically by the server and do not require client interaction.

## When Energy Selection is Required

Energy selection is required when an attack has text like:
- "Discard 1 Fire Energy card attached to Charmeleon in order to use this attack."
- "Discard all Energy cards attached to this Pokémon."
- "Discard 2 Water Energy attached to this Pokémon in order to use this attack."

**Important**: This is a **cost** that must be paid **before** the attack executes, not an effect that happens after.

## Detection Flow

### Option 1: Pre-check Attack Data (Recommended)

Before attempting the attack, check if the attack requires energy selection by examining the attack's `effects` array:

```typescript
function requiresEnergySelection(attack: Attack): boolean {
  if (!attack.effects || attack.effects.length === 0) {
    return false;
  }
  
  return attack.effects.some(
    (effect) =>
      effect.effectType === 'DISCARD_ENERGY' &&
      effect.target === 'SELF'
  );
}

function getEnergyRequirement(attack: Attack): EnergyRequirement | null {
  const discardEffect = attack.effects?.find(
    (effect) =>
      effect.effectType === 'DISCARD_ENERGY' &&
      effect.target === 'SELF'
  );
  
  if (!discardEffect) {
    return null;
  }
  
  return {
    amount: discardEffect.amount,
    energyType: discardEffect.energyType,
    target: 'self',
  };
}
```

If energy selection is required, show the modal **before** attempting the attack, then submit with `selectedEnergyIds` included.

### Option 2: Attempt Attack First (Fallback)

Alternatively, attempt the attack first and handle the error response:

### Step 1: Attempt Attack

When the player attempts to use an attack, send the ATTACK action:

```typescript
const response = await fetch('/api/v1/matches/123/actions', {
  method: 'POST',
  body: JSON.stringify({
    playerId: playerId,
    actionType: 'ATTACK',
    actionData: {
      attackIndex: 1, // Index of the attack
    }
  })
});
```

### Step 2: Check for Energy Selection Requirement

If energy selection is required but not provided, the server will return a `400 Bad Request` with a specific error structure:

```typescript
try {
  const result = await response.json();
} catch (error) {
  if (error.response?.status === 400) {
    const errorData = JSON.parse(error.response.data);
    
    if (errorData.error === 'ENERGY_SELECTION_REQUIRED') {
      // Energy selection is required - show modal
      showEnergySelectionModal(errorData);
    }
  }
}
```

### Error Response Structure

```typescript
interface EnergySelectionError {
  error: 'ENERGY_SELECTION_REQUIRED';
  message: string; // Human-readable message
  requirement: {
    amount: number | 'all'; // Number of energy to discard, or 'all'
    energyType?: EnergyType; // Specific energy type required (if any)
    target: 'self' | 'defending'; // Which Pokemon to discard from
  };
  availableEnergy: string[]; // Array of energy card IDs attached to the Pokemon
}
```

**Example Error Response:**

```json
{
  "error": "ENERGY_SELECTION_REQUIRED",
  "message": "This attack requires discarding 1 FIRE Energy card(s)",
  "requirement": {
    "amount": 1,
    "energyType": "FIRE",
    "target": "self"
  },
  "availableEnergy": [
    "energy-fire-1",
    "energy-fire-2",
    "energy-colorless-1"
  ]
}
```

## Client Implementation

### Step 1: Show Energy Selection Modal

When `ENERGY_SELECTION_REQUIRED` error is received, show a modal:

```typescript
function showEnergySelectionModal(errorData: EnergySelectionError) {
  const modal = {
    title: 'Select Energy to Discard',
    message: errorData.message,
    requirement: errorData.requirement,
    availableEnergy: errorData.availableEnergy,
    onConfirm: (selectedEnergyIds: string[]) => {
      submitAttackWithEnergySelection(selectedEnergyIds);
    }
  };
  
  openModal(modal);
}
```

### Step 2: Filter Available Energy

If `requirement.energyType` is specified, only show energy cards of that type:

```typescript
function filterAvailableEnergy(
  availableEnergyIds: string[],
  energyType?: EnergyType
): Promise<EnergyCard[]> {
  // Fetch energy card details
  const energyCards = await Promise.all(
    availableEnergyIds.map(id => fetchEnergyCard(id))
  );
  
  if (energyType) {
    // Filter by energy type
    return energyCards.filter(card => card.energyType === energyType);
  }
  
  return energyCards;
}
```

### Step 3: Validate Selection

Before submitting, validate that:
- Exactly `requirement.amount` energy cards are selected (or all if `amount === 'all'`)
- All selected cards match `requirement.energyType` (if specified)
- All selected cards are in `availableEnergy` array

```typescript
function validateSelection(
  selectedEnergyIds: string[],
  requirement: EnergyRequirement,
  availableEnergy: string[]
): string | null {
  // Check amount
  if (requirement.amount !== 'all') {
    if (selectedEnergyIds.length !== requirement.amount) {
      return `Must select exactly ${requirement.amount} energy card(s)`;
    }
  }
  
  // Check all selected are available
  for (const energyId of selectedEnergyIds) {
    if (!availableEnergy.includes(energyId)) {
      return `Energy card ${energyId} is not available`;
    }
  }
  
  return null; // Valid
}
```

### Step 4: Submit Attack with Energy Selection

After user selects energy, resubmit the attack with `selectedEnergyIds`:

```typescript
async function submitAttackWithEnergySelection(selectedEnergyIds: string[]) {
  const response = await fetch('/api/v1/matches/123/actions', {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerId,
      actionType: 'ATTACK',
      actionData: {
        attackIndex: 1,
        selectedEnergyIds: selectedEnergyIds, // Add selected energy IDs
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    // Handle error (e.g., validation failed)
    showError(error.message);
    return;
  }
  
  // Attack executed successfully
  const matchState = await response.json();
  updateGameState(matchState);
}
```

## Complete Example

### Example 1: Pre-check Attack Data (Recommended)

```typescript
async function executeAttack(attackIndex: number, attack: Attack) {
  // Check if energy selection is required before attempting attack
  const requirement = getEnergyRequirement(attack);
  
  if (requirement) {
    // Show energy selection modal first
    const selectedEnergyIds = await showEnergySelectionModal({
      requirement,
      availableEnergy: getAttachedEnergy(), // Get from game state
    });
    
    if (selectedEnergyIds.length === 0) {
      // User cancelled
      return;
    }
    
    // Submit attack with energy selection
    return await executeAttackWithEnergy(attackIndex, selectedEnergyIds);
  } else {
    // No energy selection required, proceed normally
    return await executeAttackWithEnergy(attackIndex, []);
  }
}

function getEnergyRequirement(attack: Attack): EnergyRequirement | null {
  const discardEffect = attack.effects?.find(
    (effect) =>
      effect.effectType === 'DISCARD_ENERGY' &&
      effect.target === 'SELF'
  );
  
  if (!discardEffect) {
    return null;
  }
  
  return {
    amount: discardEffect.amount,
    energyType: discardEffect.energyType,
    target: 'self',
  };
}
```

### Example 2: Attempt Attack First (Fallback)

```typescript
async function executeAttack(attackIndex: number) {
  try {
    // First attempt without energy selection
    const response = await fetch('/api/v1/matches/123/actions', {
      method: 'POST',
      body: JSON.stringify({
        playerId: playerId,
        actionType: 'ATTACK',
        actionData: { attackIndex }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, handle as regular error
        throw new Error(errorText);
      }
      
      if (errorData.error === 'ENERGY_SELECTION_REQUIRED') {
        // Show energy selection modal
        const selectedEnergyIds = await showEnergySelectionModal(errorData);
        
        // Retry with energy selection
        return await executeAttackWithEnergy(attackIndex, selectedEnergyIds);
      } else {
        throw new Error(errorData.message || 'Attack failed');
      }
    }
    
    // Attack succeeded
    return await response.json();
    
  } catch (error) {
    console.error('Attack failed:', error);
    throw error;
  }
}

async function executeAttackWithEnergy(
  attackIndex: number,
  selectedEnergyIds: string[]
) {
  const response = await fetch('/api/v1/matches/123/actions', {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerId,
      actionType: 'ATTACK',
      actionData: {
        attackIndex,
        selectedEnergyIds
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Attack failed');
  }
  
  return await response.json();
}

function showEnergySelectionModal(errorData: EnergySelectionError): Promise<string[]> {
  return new Promise((resolve) => {
    // Show modal UI
    const modal = {
      title: 'Select Energy to Discard',
      message: errorData.message,
      requirement: errorData.requirement,
      availableEnergy: errorData.availableEnergy,
      onConfirm: (selectedIds: string[]) => {
        resolve(selectedIds);
        closeModal();
      },
      onCancel: () => {
        resolve([]); // User cancelled
        closeModal();
      }
    };
    
    openModal(modal);
  });
}
```

## UI Guidelines

### Energy Selection Modal

**Display:**
- Title: "Select Energy to Discard"
- Message: Show the requirement message from server
- Energy cards: Display available energy cards (filtered by type if required)
- Selection: Allow user to select the required number of energy cards
- Buttons:
  - "Confirm" (enabled only when correct number selected)
  - "Cancel" (closes modal, cancels attack)

**Visual Indicators:**
- Highlight energy cards that match the required type (if specified)
- Show count: "Select 1 more" or "Selected: 1/1"
- Disable non-matching energy cards if type is specified
- Show energy type icons/colors

**Example UI:**

```
┌─────────────────────────────────────┐
│  Select Energy to Discard            │
├─────────────────────────────────────┤
│  This attack requires discarding     │
│  1 FIRE Energy card(s)               │
│                                      │
│  Available Energy:                  │
│  ┌─────┐  ┌─────┐  ┌─────┐         │
│  │ 🔥  │  │ 🔥  │  │ ⚪  │         │
│  │Fire │  │Fire │  │Color│         │
│  └─────┘  └─────┘  └─────┘         │
│                                      │
│  Selected: 1/1                       │
│                                      │
│  [Cancel]  [Confirm]                 │
└─────────────────────────────────────┘
```

## Validation Rules

The server validates:
1. **Amount**: Exactly `requirement.amount` energy cards selected (or all if `amount === 'all'`)
2. **Energy Type**: All selected cards match `requirement.energyType` (if specified)
3. **Attachment**: All selected cards are attached to the Pokemon
4. **Availability**: All selected cards are in the `availableEnergy` array
5. **Duplicates**: If duplicate energy card IDs exist, the server removes the first instance of each selected ID

**Validation is based on the structured `DISCARD_ENERGY` effect** from the attack's `effects` array, not text parsing. The server checks for:
- `effectType === "DISCARD_ENERGY"`
- `target === "SELF"` (costs only)
- `amount` and `energyType` values match the selected energy

If validation fails, the server returns a `400 Bad Request` with an error message.

## Edge Cases

### No Matching Energy Available

If the requirement specifies an energy type but no matching energy is attached:
- The attack should not be available/selectable in the UI
- Or show a disabled state with message: "Requires X [Type] Energy"
- Check the attack's `effects` array for `DISCARD_ENERGY` with `target: "SELF"` to determine requirements before showing the attack button

### Checking Attack Requirements Before Display

```typescript
function canUseAttack(attack: Attack, attachedEnergy: string[]): boolean {
  const requirement = getEnergyRequirement(attack);
  
  if (!requirement) {
    return true; // No energy requirement
  }
  
  // Check if required energy is available
  if (requirement.energyType) {
    const matchingEnergy = attachedEnergy.filter(
      (energyId) => getEnergyType(energyId) === requirement.energyType
    );
    
    if (requirement.amount === 'all') {
      return matchingEnergy.length > 0;
    } else {
      return matchingEnergy.length >= requirement.amount;
    }
  } else {
    // Any energy type
    if (requirement.amount === 'all') {
      return attachedEnergy.length > 0;
    } else {
      return attachedEnergy.length >= requirement.amount;
    }
  }
}
```

### "All" Energy Requirement

If `requirement.amount === 'all'`:
- Select all available energy cards (filtered by type if specified)
- Show message: "Select all [Type] Energy cards"

### Multiple Energy Types

If multiple energy types are available but only one type is required:
- Only show/allow selection of the required type
- Disable other energy types in the UI

## Testing Checklist

- [ ] Attack without energy requirement works normally
- [ ] Attack with `DISCARD_ENERGY` effect (target: SELF) shows modal
- [ ] Attack with `DISCARD_ENERGY` effect (target: DEFENDING) does NOT require selection (handled by server)
- [ ] Pre-checking attack effects correctly identifies energy requirements
- [ ] Modal displays correct requirement message
- [ ] Modal filters energy by type when `energyType` is specified
- [ ] Modal validates selection count matches `amount`
- [ ] Modal handles `amount: "all"` correctly
- [ ] Attack succeeds after valid energy selection
- [ ] Attack fails if wrong energy type selected
- [ ] Attack fails if wrong number selected
- [ ] Cancel button closes modal and cancels attack
- [ ] Energy is removed from Pokemon after attack
- [ ] Energy is added to discard pile after attack
- [ ] Duplicate energy cards are handled correctly (removes first instance)
