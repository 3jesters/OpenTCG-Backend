# Client Retreat Guide

## Overview

The RETREAT action allows a player to switch their active Pokemon with a benched Pokemon. Retreating requires discarding energy cards equal to the Pokemon's retreat cost. This guide explains how to implement retreat functionality in the client, including energy selection handling.

**Key Points:**
- Retreat can only be performed during `MAIN_PHASE`
- Retreat cost is determined by the Pokemon's `retreatCost` property (or card rules)
- Energy selection is required if retreat cost > 0
- Status effects are cleared on both Pokemon when retreating
- Paralyzed Pokemon cannot retreat

---

## API Endpoint

**Endpoint:** `POST /api/v1/matches/{matchId}/actions`

**Content-Type:** `application/json`

---

## When to Use Retreat

Retreat can be performed when:
- Match state is `PLAYER_TURN`
- Current phase is `MAIN_PHASE`
- Player has an active Pokemon
- Player has at least one Pokemon on the bench
- Active Pokemon is not paralyzed
- Active Pokemon does not have `CANNOT_RETREAT` card rule

---

## Request Structure

### Basic Request (Free Retreat)

If the Pokemon has a retreat cost of 0 (or `FREE_RETREAT` rule), no energy selection is needed:

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "test-player-1",
  "actionType": "RETREAT",
  "actionData": {
    "target": "BENCH_0"
  }
}
```

### Request with Energy Selection

If the Pokemon has a retreat cost > 0, energy selection is required:

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "test-player-1",
  "actionType": "RETREAT",
  "actionData": {
    "target": "BENCH_0",
    "selectedEnergyIds": [
      "pokemon-base-set-v1.0-water-energy--103",
      "pokemon-base-set-v1.0-water-energy--103"
    ]
  }
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `playerId` | string | Yes | The player's ID |
| `actionType` | string | Yes | Must be `"RETREAT"` |
| `actionData.target` | string | Yes | Bench position to switch with (e.g., `"BENCH_0"`, `"BENCH_1"`, etc.) |
| `actionData.selectedEnergyIds` | string[] | Conditional | Required if retreat cost > 0. Array of energy card IDs to discard |

**Target Values:**
- `"BENCH_0"` through `"BENCH_4"` - Bench position to switch with

---

## Energy Selection Handling

### Option 1: Pre-check Retreat Cost (Recommended)

Before attempting retreat, check the Pokemon's retreat cost from the card data:

```typescript
interface PokemonCard {
  retreatCost?: number;
  cardRules?: CardRule[];
  // ... other properties
}

function canRetreat(pokemon: PokemonCard): boolean {
  // Check for CANNOT_RETREAT rule
  if (pokemon.cardRules?.some(rule => rule.ruleType === 'CANNOT_RETREAT')) {
    return false;
  }
  
  // Check for FREE_RETREAT rule
  if (pokemon.cardRules?.some(rule => rule.ruleType === 'FREE_RETREAT')) {
    return true; // Can retreat, no cost
  }
  
  // Use retreatCost from card (defaults to 0 if undefined)
  return true; // Can retreat, but may have cost
}

function getRetreatCost(pokemon: PokemonCard): number {
  // Check for FREE_RETREAT rule
  if (pokemon.cardRules?.some(rule => rule.ruleType === 'FREE_RETREAT')) {
    return 0;
  }
  
  // Return retreat cost (defaults to 0)
  return pokemon.retreatCost || 0;
}

async function attemptRetreat(
  matchId: string,
  playerId: string,
  target: string,
  activePokemon: PokemonCard,
  attachedEnergy: string[]
): Promise<MatchResponse> {
  const retreatCost = getRetreatCost(activePokemon);
  
  if (retreatCost > 0) {
    // Show energy selection modal first
    const selectedEnergyIds = await showEnergySelectionModal({
      amount: retreatCost,
      energyType: null, // Retreat accepts any energy type
      availableEnergy: attachedEnergy,
      title: 'Select Energy to Discard for Retreat',
    });
    
    // Submit retreat with energy selection
    return await submitRetreat(matchId, playerId, target, selectedEnergyIds);
  } else {
    // Free retreat, no energy needed
    return await submitRetreat(matchId, playerId, target);
  }
}

async function submitRetreat(
  matchId: string,
  playerId: string,
  target: string,
  selectedEnergyIds?: string[]
): Promise<MatchResponse> {
  const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
      actionType: 'RETREAT',
      actionData: {
        target,
        ...(selectedEnergyIds && { selectedEnergyIds }),
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Retreat failed');
  }
  
  return await response.json();
}
```

### Option 2: Handle Error Response (Fallback)

Alternatively, attempt retreat first and handle the energy selection error:

```typescript
async function attemptRetreatWithErrorHandling(
  matchId: string,
  playerId: string,
  target: string
): Promise<MatchResponse> {
  try {
    // First attempt without energy selection
    const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        actionType: 'RETREAT',
        actionData: { target },
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Parse the error message (it's a JSON string)
      let errorData;
      try {
        errorData = JSON.parse(error.message);
      } catch {
        // Not JSON, handle as regular error
        throw new Error(error.message || 'Retreat failed');
      }
      
      // Check if energy selection is required
      if (errorData.error === 'ENERGY_SELECTION_REQUIRED') {
        // Show energy selection modal
        const selectedEnergyIds = await showEnergySelectionModal(errorData);
        
        // Retry with energy selection
        return await submitRetreat(matchId, playerId, target, selectedEnergyIds);
      } else {
        // Other error
        throw new Error(errorData.message || error.message || 'Retreat failed');
      }
    }
    
    // Retreat succeeded
    return await response.json();
    
  } catch (error) {
    console.error('Retreat failed:', error);
    throw error;
  }
}
```

### Energy Selection Modal

The energy selection modal should display:

```typescript
interface EnergySelectionModalProps {
  amount: number;
  energyType: string | null; // null for retreat (any type accepted)
  availableEnergy: string[];
  title?: string;
  onConfirm: (selectedEnergyIds: string[]) => void;
  onCancel: () => void;
}

function showEnergySelectionModal(
  props: EnergySelectionModalProps
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Show modal UI
    // User selects exactly `amount` energy cards
    // On confirm, resolve with selectedEnergyIds
    // On cancel, reject
  });
}
```

**Modal Requirements:**
- Display all available energy cards from `availableEnergy`
- Allow selection of exactly `amount` cards (no more, no less)
- Show count: "Selected: X / {amount}"
- Disable confirm button until exactly `amount` cards selected
- No energy type restriction for retreat (unlike attacks)

---

## Response Structure

### Success Response

```json
{
  "matchId": "4e9f1128-c575-4598-9ee4-0e65c3c87375",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 3,
  "phase": "MAIN_PHASE",
  "playerState": {
    "activePokemon": {
      "instanceId": "bench-pokemon-instance-id",
      "cardId": "pokemon-base-set-v1.0-bulbasaur--46",
      "position": "ACTIVE",
      "currentHp": 40,
      "maxHp": 40,
      "attachedEnergy": [],
      "statusEffect": "NONE",
      "damageCounters": 0
    },
    "bench": [
      {
        "instanceId": "retreating-pokemon-instance-id",
        "cardId": "pokemon-base-set-v1.0-squirtle--65",
        "position": "BENCH_0",
        "currentHp": 40,
        "maxHp": 40,
        "attachedEnergy": [],
        "statusEffect": "NONE",
        "damageCounters": 0
      }
    ],
    "discardPile": [
      "pokemon-base-set-v1.0-water-energy--103",
      "pokemon-base-set-v1.0-water-energy--103"
    ],
    "discardCount": 2
  },
  "lastAction": {
    "actionId": "action-uuid",
    "playerId": "PLAYER1",
    "actionType": "RETREAT",
    "timestamp": "2025-11-30T12:50:52.553Z",
    "actionData": {
      "activePokemonInstanceId": "retreating-pokemon-instance-id",
      "activePokemonCardId": "pokemon-base-set-v1.0-squirtle--65",
      "benchPokemonInstanceId": "bench-pokemon-instance-id",
      "benchPokemonCardId": "pokemon-base-set-v1.0-bulbasaur--46",
      "target": "BENCH_0",
      "selectedEnergyIds": [
        "pokemon-base-set-v1.0-water-energy--103",
        "pokemon-base-set-v1.0-water-energy--103"
      ],
      "retreatCost": 2
    }
  },
  "availableActions": [
    "ATTACH_ENERGY",
    "PLAY_POKEMON",
    "EVOLVE_POKEMON",
    "PLAY_TRAINER",
    "USE_ABILITY",
    "ATTACK",
    "END_TURN"
  ]
}
```

**Key Changes:**
- `playerState.activePokemon` is now the Pokemon that was on the bench
- `playerState.bench` contains the retreating Pokemon (at the target position)
- Selected energy cards are moved to `playerState.discardPile`
- Both Pokemon have status effects cleared (`statusEffect: "NONE"`)
- Phase remains `MAIN_PHASE` (can perform more actions)

---

## Error Responses

### Energy Selection Required

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "{\"error\":\"ENERGY_SELECTION_REQUIRED\",\"message\":\"This Pokemon requires discarding 1 Energy card(s) to retreat\",\"requirement\":{\"amount\":1,\"energyType\":null,\"target\":\"self\"},\"availableEnergy\":[\"pokemon-base-set-v1.0-water-energy--103\",\"pokemon-base-set-v1.0-water-energy--103\"]}",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Parsed Error Data:**
```typescript
{
  error: 'ENERGY_SELECTION_REQUIRED',
  message: 'This Pokemon requires discarding 1 Energy card(s) to retreat',
  requirement: {
    amount: 1,
    energyType: null, // null means any energy type is accepted
    target: 'self',
  },
  availableEnergy: [
    'pokemon-base-set-v1.0-water-energy--103',
    'pokemon-base-set-v1.0-water-energy--103'
  ]
}
```

**Handling:**
1. Parse the `message` field (it's a JSON string)
2. Check if `error === 'ENERGY_SELECTION_REQUIRED'`
3. Show energy selection modal with the requirement data
4. Resubmit retreat with `selectedEnergyIds`

### Paralyzed Pokemon

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "Cannot retreat while Paralyzed",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Disable retreat button/action if active Pokemon is paralyzed
- Show error message to user

### Cannot Retreat Rule

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "This Pokemon cannot retreat",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Check for `CANNOT_RETREAT` card rule before showing retreat option
- Disable retreat button/action if rule exists

### Invalid Target

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "Invalid bench position format: INVALID. Must be BENCH_0, BENCH_1, etc.",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Validate target format before submitting
- Ensure target is `BENCH_0` through `BENCH_4`
- Ensure target position has a Pokemon

### No Pokemon at Bench Position

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "No Pokemon at bench position 0",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Only show retreat option for bench positions that have Pokemon
- Validate bench position before submitting

### Insufficient Energy

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "Insufficient energy to retreat. Requires 2 Energy card(s), but only 1 attached",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Check energy availability before showing retreat option
- Disable retreat if insufficient energy attached

### Wrong Number of Energy Selected

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "Must select exactly 2 energy card(s) to retreat, but 1 were selected",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Validate energy selection count matches retreat cost
- Show error in energy selection modal if count is wrong

### Energy Not Attached

**Status:** `400 Bad Request`

**Response:**
```json
{
  "message": "Energy card energy-not-attached is not attached to this Pokemon",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Handling:**
- Only allow selection of energy cards from `availableEnergy` array
- Validate selected energy IDs before submitting

---

## Complete Example

```typescript
// Complete retreat implementation example

interface RetreatRequirement {
  amount: number;
  energyType: string | null;
  target: 'self';
}

interface EnergySelectionError {
  error: 'ENERGY_SELECTION_REQUIRED';
  message: string;
  requirement: RetreatRequirement;
  availableEnergy: string[];
}

class RetreatService {
  /**
   * Check if Pokemon can retreat
   */
  canRetreat(pokemon: PokemonCard, statusEffects: StatusEffect[]): boolean {
    // Check if paralyzed
    if (statusEffects.includes('PARALYZED')) {
      return false;
    }
    
    // Check for CANNOT_RETREAT rule
    if (pokemon.cardRules?.some(rule => rule.ruleType === 'CANNOT_RETREAT')) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get retreat cost for Pokemon
   */
  getRetreatCost(pokemon: PokemonCard): number {
    // Check for FREE_RETREAT rule
    if (pokemon.cardRules?.some(rule => rule.ruleType === 'FREE_RETREAT')) {
      return 0;
    }
    
    return pokemon.retreatCost || 0;
  }
  
  /**
   * Attempt retreat with automatic energy selection handling
   */
  async retreat(
    matchId: string,
    playerId: string,
    target: string,
    activePokemon: PokemonCard,
    attachedEnergy: string[]
  ): Promise<MatchResponse> {
    const retreatCost = this.getRetreatCost(activePokemon);
    
    if (retreatCost > 0) {
      // Show energy selection modal
      const selectedEnergyIds = await this.showEnergySelectionModal({
        amount: retreatCost,
        energyType: null,
        availableEnergy: attachedEnergy,
      });
      
      return await this.submitRetreat(matchId, playerId, target, selectedEnergyIds);
    } else {
      // Free retreat
      return await this.submitRetreat(matchId, playerId, target);
    }
  }
  
  /**
   * Submit retreat action to server
   */
  private async submitRetreat(
    matchId: string,
    playerId: string,
    target: string,
    selectedEnergyIds?: string[]
  ): Promise<MatchResponse> {
    const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        actionType: 'RETREAT',
        actionData: {
          target,
          ...(selectedEnergyIds && { selectedEnergyIds }),
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Try to parse energy selection error
      try {
        const errorData: EnergySelectionError = JSON.parse(error.message);
        if (errorData.error === 'ENERGY_SELECTION_REQUIRED') {
          // Show modal and retry
          const selectedEnergyIds = await this.showEnergySelectionModal(errorData);
          return await this.submitRetreat(matchId, playerId, target, selectedEnergyIds);
        }
      } catch {
        // Not an energy selection error, throw as-is
      }
      
      throw new Error(error.message || 'Retreat failed');
    }
    
    return await response.json();
  }
  
  /**
   * Show energy selection modal (UI implementation)
   */
  private async showEnergySelectionModal(
    data: EnergySelectionError | { amount: number; energyType: string | null; availableEnergy: string[] }
  ): Promise<string[]> {
    const requirement = 'requirement' in data ? data.requirement : {
      amount: data.amount,
      energyType: data.energyType,
      target: 'self' as const,
    };
    const availableEnergy = 'availableEnergy' in data ? data.availableEnergy : data.availableEnergy;
    
    // Show modal UI
    // Return selected energy IDs when user confirms
    // This is a placeholder - implement your UI modal here
    return new Promise((resolve, reject) => {
      // Modal implementation
      // User selects exactly requirement.amount cards
      // On confirm: resolve(selectedEnergyIds)
      // On cancel: reject()
    });
  }
}

// Usage
const retreatService = new RetreatService();

// Check if can retreat
if (retreatService.canRetreat(activePokemonCard, activePokemon.statusEffects)) {
  const retreatCost = retreatService.getRetreatCost(activePokemonCard);
  
  // Show retreat button/option
  // When user clicks, attempt retreat
  try {
    const result = await retreatService.retreat(
      matchId,
      playerId,
      'BENCH_0',
      activePokemonCard,
      activePokemon.attachedEnergy
    );
    
    // Update UI with result
    updateMatchState(result);
  } catch (error) {
    // Handle error
    showError(error.message);
  }
}
```

---

## Validation Rules

The server validates:
1. **Paralyze Check**: Active Pokemon must not be paralyzed
2. **Card Rule Check**: Pokemon must not have `CANNOT_RETREAT` rule
3. **Target Validation**: Target must be valid bench position (`BENCH_0` through `BENCH_4`)
4. **Bench Position**: Target position must have a Pokemon
5. **Retreat Cost**: Calculated from card's `retreatCost` or `FREE_RETREAT` rule
6. **Energy Availability**: If retreat cost > 0, must have enough energy attached
7. **Energy Selection**: If retreat cost > 0, must provide exactly `retreatCost` energy cards
8. **Energy Attachment**: All selected energy must be attached to active Pokemon
9. **Energy Type**: No type restriction (unlike attacks, retreat accepts any energy type)

---

## Status Effect Clearing

When retreat succeeds:
- **Retreating Pokemon** (active → bench): All status effects are cleared
- **New Active Pokemon** (bench → active): All status effects are cleared

Both Pokemon will have `statusEffect: "NONE"` after retreat.

---

## Best Practices

1. **Pre-check Retreat Cost**: Check retreat cost before showing retreat option to avoid unnecessary API calls
2. **Validate Before Submit**: Ensure target bench position has a Pokemon before submitting
3. **Handle Energy Selection**: Always handle `ENERGY_SELECTION_REQUIRED` error gracefully
4. **Disable When Invalid**: Disable retreat button/action when:
   - Pokemon is paralyzed
   - Pokemon has `CANNOT_RETREAT` rule
   - Insufficient energy attached (if retreat cost > 0)
   - No bench Pokemon available
5. **Show Clear Feedback**: Display retreat cost and energy requirements clearly to the user
6. **Error Handling**: Provide user-friendly error messages for all error cases

---

## Related Documentation

- [Client Energy Selection Guide](./CLIENT-ENERGY-SELECTION-GUIDE.md) - Energy selection pattern for attacks
- [Client Gameplay Actions](./CLIENT-GAMEPLAY-ACTIONS.md) - Other gameplay actions
- [Match API](./MATCH-API.md) - Complete API reference
- [Effects Specification](./EFFECTS-SPECIFICATION.md) - Status effects and their interactions

