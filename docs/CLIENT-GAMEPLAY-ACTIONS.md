# Client Gameplay Actions Guide

Complete guide for implementing gameplay actions during a match, including drawing cards, attaching energy, evolving Pokemon, and ending turns.

## Table of Contents

- [Overview](#overview)
- [Gameplay Actions](#gameplay-actions)
  - [DRAW_CARD](#draw_card)
  - [ATTACH_ENERGY](#attach_energy)
  - [EVOLVE_POKEMON](#evolve_pokemon)
  - [END_TURN](#end_turn)
- [Complete Gameplay Flow Example](#complete-gameplay-flow-example)
- [State Polling During Opponent's Turn](#state-polling-during-opponents-turn)
- [Response Structure](#response-structure)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

During a match in `PLAYER_TURN` state, players can perform various actions based on the current turn phase:

- **DRAW Phase**: Draw a card (usually automatic at start of turn)
- **MAIN_PHASE**: Attach energy, evolve Pokemon, play Pokemon, play trainer cards, retreat, attack
- **ATTACK Phase**: Declare and execute attacks
- **END Phase**: End turn actions

All actions are submitted via `POST /api/v1/matches/:matchId/actions` and return the updated match state.

---

## Gameplay Actions

### DRAW_CARD

Draw one card from the top of your deck.

**When to Use:**
- During `PLAYER_TURN` state
- When `phase` is `DRAW`
- Usually done automatically at the start of each turn (except first turn of first player)

**Request:**

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "test-player-1",
  "actionType": "DRAW_CARD",
  "actionData": {}
}
```

**Response:**

```json
{
  "matchId": "mock-test-2",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 1,
  "phase": "MAIN_PHASE",
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-pokemon-breeder--78",
      "pokemon-base-set-v1.0-fire-energy--99"
    ],
    "handCount": 7,
    "deckCount": 46,
    "discardCount": 0,
    "activePokemon": {
      "instanceId": "78dadb92-eb0b-4dbd-b51e-db9be356b27f",
      "cardId": "pokemon-base-set-v1.0-ponyta--62",
      "position": "ACTIVE",
      "currentHp": 100,
      "maxHp": 100,
      "attachedEnergy": [],
      "statusEffect": "NONE",
      "damageCounters": 0
    },
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 2,
    "deckCount": 47,
    "discardCount": 0,
    "activePokemon": { /* ... */ },
    "bench": [ /* ... */ ],
    "prizeCardsRemaining": 6
  },
  "availableActions": [
    "PLAY_POKEMON",
    "ATTACH_ENERGY",
    "PLAY_TRAINER",
    "EVOLVE_POKEMON",
    "RETREAT",
    "USE_ABILITY",
    "END_TURN",
    "CONCEDE"
  ],
  "lastAction": {
    "actionId": "action-uuid",
    "playerId": "PLAYER1",
    "actionType": "DRAW_CARD",
    "timestamp": "2025-11-30T12:50:48.553Z",
    "actionData": {}
  }
}
```

**Key Changes:**
- `phase` transitions from `DRAW` to `MAIN_PHASE`
- `playerState.hand` increases by 1 card
- `playerState.deckCount` decreases by 1
- `availableActions` now includes MAIN_PHASE actions (including ATTACK)

---

### ATTACH_ENERGY

Attach an energy card from your hand to a Pokemon (active or bench).

**When to Use:**
- During `PLAYER_TURN` state
- When `phase` is `MAIN_PHASE`
- Energy card must be in your hand
- Target Pokemon must be in play (active or bench)

**Request:**

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "test-player-1",
  "actionType": "ATTACH_ENERGY",
  "actionData": {
    "energyCardId": "pokemon-base-set-v1.0-fire-energy--99",
    "target": "ACTIVE"
  }
}
```

**Target Values:**
- `"ACTIVE"` - Attach to active Pokemon
- `"BENCH_0"` - Attach to bench Pokemon at position 0
- `"BENCH_1"` - Attach to bench Pokemon at position 1
- `"BENCH_2"` - Attach to bench Pokemon at position 2
- `"BENCH_3"` - Attach to bench Pokemon at position 3
- `"BENCH_4"` - Attach to bench Pokemon at position 4

**Response:**

```json
{
  "matchId": "mock-test-2",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 1,
  "phase": "MAIN_PHASE",
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-pokemon-breeder--78"
    ],
    "handCount": 6,
    "deckCount": 46,
    "activePokemon": {
      "instanceId": "78dadb92-eb0b-4dbd-b51e-db9be356b27f",
      "cardId": "pokemon-base-set-v1.0-ponyta--62",
      "position": "ACTIVE",
      "currentHp": 100,
      "maxHp": 100,
      "attachedEnergy": [
        "pokemon-base-set-v1.0-fire-energy--99"
      ],
      "statusEffect": "NONE",
      "damageCounters": 0
    }
  },
  "lastAction": {
    "actionId": "action-uuid",
    "playerId": "PLAYER1",
    "actionType": "ATTACH_ENERGY",
    "timestamp": "2025-11-30T12:50:49.553Z",
    "actionData": {
      "energyCardId": "pokemon-base-set-v1.0-fire-energy--99",
      "target": "ACTIVE"
    }
  }
}
```

**Key Changes:**
- Energy card is removed from `playerState.hand`
- Energy card is added to target Pokemon's `attachedEnergy` array
- `playerState.handCount` decreases by 1
- Phase remains `MAIN_PHASE` (can perform more actions)

---

### EVOLVE_POKEMON

Evolve a Pokemon on your bench or active position using an evolution card from your hand.

**When to Use:**
- During `PLAYER_TURN` state
- When `phase` is `MAIN_PHASE`
- Evolution card must be in your hand
- Target Pokemon must be in play (active or bench)
- Evolution must be valid (e.g., Bulbasaur → Ivysaur → Venusaur)

**Request:**

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "test-player-2",
  "actionType": "EVOLVE_POKEMON",
  "actionData": {
    "evolutionCardId": "pokemon-base-set-v1.0-ivysaur--30",
    "target": "BENCH_0"
  }
}
```

**Target Values:**
- `"ACTIVE"` - Evolve active Pokemon
- `"BENCH_0"` through `"BENCH_4"` - Evolve bench Pokemon at specified position

**Response:**

```json
{
  "matchId": "mock-test-2",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER2",
  "turnNumber": 2,
  "phase": "MAIN_PHASE",
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-grass-energy--100"
    ],
    "handCount": 1,
    "bench": [
      {
        "instanceId": "faf5c1d8-4e2a-4c51-b8ad-a22f4a3d63ef",
        "cardId": "pokemon-base-set-v1.0-ivysaur--30",
        "position": "BENCH_0",
        "currentHp": 100,
        "maxHp": 100,
        "attachedEnergy": [],
        "statusEffect": "NONE",
        "damageCounters": 0
      }
    ]
  },
  "lastAction": {
    "actionId": "action-uuid",
    "playerId": "PLAYER2",
    "actionType": "EVOLVE_POKEMON",
    "timestamp": "2025-11-30T12:50:50.553Z",
    "actionData": {
      "evolutionCardId": "pokemon-base-set-v1.0-ivysaur--30",
      "target": "BENCH_0"
    }
  }
}
```

**Key Changes:**
- Evolution card is removed from `playerState.hand`
- Target Pokemon's `cardId` changes to the evolution card ID
- Pokemon's `instanceId` remains the same (same Pokemon instance)
- Pokemon's HP, attached energy, and status effects are preserved
- Phase remains `MAIN_PHASE` (can perform more actions)

**Important Notes:**
- The evolved Pokemon keeps the same `instanceId` (it's the same Pokemon, just evolved)
- All attached energy, HP, and status effects are preserved
- Evolution can only be done once per Pokemon per turn
- Evolution must follow the evolution chain (Basic → Stage 1 → Stage 2)

---

### END_TURN

End your current turn and pass control to your opponent.

**When to Use:**
- During `PLAYER_TURN` state
- Can be used in any phase (`DRAW`, `MAIN_PHASE`, `ATTACK`, `END`)
- Typically used after completing all desired actions in MAIN_PHASE

**Request:**

```http
POST /api/v1/matches/{matchId}/actions
Content-Type: application/json

{
  "playerId": "test-player-1",
  "actionType": "END_TURN",
  "actionData": {}
}
```

**Response:**

```json
{
  "matchId": "mock-test-2",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER2",
  "turnNumber": 2,
  "phase": "DRAW",
  "playerState": {
    "hand": [ /* ... */ ],
    "handCount": 6,
    "deckCount": 46
  },
  "opponentState": {
    "handCount": 2,
    "deckCount": 47
  },
  "lastAction": {
    "actionId": "action-uuid",
    "playerId": "PLAYER1",
    "actionType": "END_TURN",
    "timestamp": "2025-11-30T12:50:51.553Z",
    "actionData": {}
  }
}
```

**Key Changes:**
- `currentPlayer` switches to the opponent
- `turnNumber` increments
- `phase` resets to `DRAW` for the next player
- Match state may briefly be `BETWEEN_TURNS` before transitioning to `PLAYER_TURN` for the next player

**Note:** The response may show `state: "BETWEEN_TURNS"` briefly. The system automatically processes between-turn effects and transitions to the next player's turn. You can poll the state again if needed.

---

## Complete Gameplay Flow Example

Here's a complete example of a turn sequence:

### Player 1's Turn

**1. Draw Card (DRAW phase)**

```typescript
const drawResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-1',
    actionType: 'DRAW_CARD',
    actionData: {}
  })
});

// Response: phase changes from DRAW to MAIN_PHASE
// handCount increases by 1
// deckCount decreases by 1
```

**2. Attach Energy (MAIN_PHASE)**

```typescript
const attachEnergyResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-1',
    actionType: 'ATTACH_ENERGY',
    actionData: {
      energyCardId: 'pokemon-base-set-v1.0-fire-energy--99',
      target: 'ACTIVE'
    }
  })
});

// Response: energy card removed from hand
// energy added to activePokemon.attachedEnergy
// phase remains MAIN_PHASE
```

**3. End Turn**

```typescript
const endTurnResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-1',
    actionType: 'END_TURN',
    actionData: {}
  })
});

// Response: currentPlayer changes to PLAYER2
// turnNumber increments
// phase resets to DRAW
```

### Player 2's Turn

**1. Draw Card**

```typescript
const drawResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-2',
    actionType: 'DRAW_CARD',
    actionData: {}
  })
});
```

**2. Attach Energy**

```typescript
const attachEnergyResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-2',
    actionType: 'ATTACH_ENERGY',
    actionData: {
      energyCardId: 'pokemon-base-set-v1.0-grass-energy--100',
      target: 'ACTIVE'
    }
  })
});
```

**3. Evolve Pokemon**

```typescript
const evolveResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-2',
    actionType: 'EVOLVE_POKEMON',
    actionData: {
      evolutionCardId: 'pokemon-base-set-v1.0-ivysaur--30',
      target: 'BENCH_0'
    }
  })
});

// Response: evolution card removed from hand
// bench[0].cardId changes to evolution card ID
// Pokemon instance ID and other properties preserved
```

**4. End Turn**

```typescript
const endTurnResponse = await fetch(`/api/v1/matches/${matchId}/actions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerId: 'test-player-2',
    actionType: 'END_TURN',
    actionData: {}
  })
});
```

---

## State Polling During Opponent's Turn

When it's not your turn, poll the match state to detect opponent actions:

```typescript
// Poll every 1-2 seconds during opponent's turn
const pollInterval = setInterval(async () => {
  const stateResponse = await fetch(`/api/v1/matches/${matchId}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'test-player-1' })
  });
  
  const state = await stateResponse.json();
  
  // Check if it's now your turn
  if (state.currentPlayer === 'PLAYER1' && state.state === 'PLAYER_TURN') {
    clearInterval(pollInterval);
    // It's your turn - enable actions
  }
  
  // Check for opponent actions via lastAction
  if (state.lastAction && state.lastAction.playerId === 'PLAYER2') {
    console.log('Opponent performed:', state.lastAction.actionType);
    // Update UI to show opponent's action
  }
}, 1500); // Poll every 1.5 seconds
```

**Detecting Opponent Actions:**

The `lastAction` field shows the most recent action:

```json
{
  "lastAction": {
    "actionId": "action-uuid",
    "playerId": "PLAYER2",
    "actionType": "DRAW_CARD",
    "timestamp": "2025-11-30T12:50:48.553Z",
    "actionData": {}
  }
}
```

Use this to:
- Show opponent's actions in the UI
- Update opponent's visible state (hand count, deck count, etc.)
- Detect when opponent ends their turn

---

## Response Structure

All action responses follow this structure:

```typescript
interface MatchStateResponse {
  matchId: string;
  state: MatchState; // 'PLAYER_TURN', 'BETWEEN_TURNS', etc.
  currentPlayer: PlayerIdentifier | null; // 'PLAYER1' or 'PLAYER2'
  turnNumber: number;
  phase: TurnPhase | null; // 'DRAW', 'MAIN_PHASE', 'ATTACK', 'END'
  playerState: PlayerState;
  opponentState: OpponentState;
  availableActions: string[]; // Actions you can perform
  lastAction?: ActionSummary;
  playerDeckId: string | null;
  opponentDeckId: string | null;
  coinTossResult: PlayerIdentifier | null;
  playerHasDrawnValidHand: boolean;
  opponentHasDrawnValidHand: boolean;
}
```

**PlayerState** (your full state):

```typescript
interface PlayerState {
  hand: string[]; // Array of card IDs
  handCount: number;
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlay | null;
  bench: PokemonInPlay[];
  prizeCardsRemaining: number;
  attachedEnergy: string[]; // Energy on active Pokemon
}
```

**OpponentState** (limited opponent state):

```typescript
interface OpponentState {
  handCount: number; // Count only, not actual cards
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlay | null;
  bench: PokemonInPlay[];
  benchCount: number;
  prizeCardsRemaining: number;
  attachedEnergy: string[]; // Energy on opponent's active Pokemon
}
```

---

## Error Handling

All actions return appropriate HTTP status codes:

- **200 OK**: Action successful
- **400 Bad Request**: Invalid action (wrong phase, missing data, invalid target, etc.)
- **404 Not Found**: Match not found
- **500 Internal Server Error**: Server error

**Example Error Response:**

```json
{
  "statusCode": 400,
  "message": "Energy card must be in hand",
  "error": "Bad Request"
}
```

**Common Error Scenarios:**

1. **Action not available in current phase:**
   ```json
   {
     "message": "Cannot attach energy in phase DRAW. Must be MAIN_PHASE"
   }
   ```

2. **Card not in hand:**
   ```json
   {
     "message": "Energy card must be in hand"
   }
   ```

3. **Invalid target:**
   ```json
   {
     "message": "Invalid bench position: BENCH_5"
   }
   ```

4. **Not your turn:**
   ```json
   {
     "message": "Invalid action: Not your turn"
   }
   ```

Always check the response status and handle errors appropriately in your UI.

---

## Best Practices

### 1. Check Available Actions

Before performing an action, check if it's available:

```typescript
const state = await getMatchState(matchId, playerId);

if (state.availableActions.includes('ATTACH_ENERGY')) {
  // Show "Attach Energy" button
}

if (state.availableActions.includes('EVOLVE_POKEMON')) {
  // Show evolution options
}
```

### 2. Validate Before Submitting

Validate action data on the client before submitting:

```typescript
function canAttachEnergy(energyCardId: string, target: string): boolean {
  // Check if energy card is in hand
  if (!playerState.hand.includes(energyCardId)) {
    return false;
  }
  
  // Check if target is valid
  if (target === 'ACTIVE' && !playerState.activePokemon) {
    return false;
  }
  
  if (target.startsWith('BENCH_')) {
    const benchIndex = parseInt(target.replace('BENCH_', ''));
    if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
      return false;
    }
  }
  
  return true;
}
```

### 3. Update UI Immediately

Update your UI optimistically, then sync with server response:

```typescript
// Optimistic update
const optimisticHand = playerState.hand.filter(id => id !== energyCardId);
updateUI({ hand: optimisticHand });

// Submit action
const response = await attachEnergy(matchId, playerId, energyCardId, target);

// Sync with server response
updateUI(response.body.playerState);
```

### 4. Handle State Transitions

Watch for state and phase changes:

```typescript
const previousState = currentState;
const newState = await performAction(action);

if (previousState.phase !== newState.phase) {
  // Phase changed - update UI accordingly
  onPhaseChange(newState.phase);
}

if (previousState.currentPlayer !== newState.currentPlayer) {
  // Turn changed - switch to polling mode
  startPolling();
}
```

### 5. Poll Efficiently

- Poll every 1-2 seconds during opponent's turn
- Stop polling when it's your turn
- Increase polling frequency when opponent is taking actions
- Use exponential backoff if no changes detected

### 6. Show Loading States

Show loading indicators during actions:

```typescript
setLoading(true);
try {
  const response = await performAction(action);
  updateGameState(response);
} catch (error) {
  showError(error.message);
} finally {
  setLoading(false);
}
```

---

## Summary

The gameplay actions follow this pattern:

1. **Check available actions** from match state
2. **Validate action** on client side
3. **Submit action** via POST to `/api/v1/matches/:matchId/actions`
4. **Update UI** with response state
5. **Poll for updates** during opponent's turn
6. **Detect changes** via `lastAction` and state comparisons

All actions return the complete updated match state, allowing you to keep your UI in sync with the server.

