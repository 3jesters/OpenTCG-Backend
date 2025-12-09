# Client-Side Update: Coin Toss State and API

## Overview

A new `FIRST_PLAYER_SELECTION` state has been added to the match flow. This state occurs after both players complete their initial setup (set active and bench Pokemon). In this state, the coin toss determines who goes first, and both players must confirm the result before the match transitions to `PLAYER_TURN`.

## State Flow Changes

### Previous Flow
```
SELECT_BENCH_POKEMON 
  → Both players ready (COMPLETE_INITIAL_SETUP)
  → PLAYER_TURN (coin toss happened automatically)
```

### New Flow
```
SELECT_BENCH_POKEMON 
  → Both players ready (COMPLETE_INITIAL_SETUP)
  → FIRST_PLAYER_SELECTION (new state)
  → Coin toss happens automatically when first player confirms
  → Both players confirm (CONFIRM_FIRST_PLAYER)
  → PLAYER_TURN
```

## New Match State: FIRST_PLAYER_SELECTION

### State Details

- **State Name**: `FIRST_PLAYER_SELECTION`
- **Purpose**: Coin toss to determine who goes first
- **When It Occurs**: After both players complete initial setup (both have called `COMPLETE_INITIAL_SETUP`)
- **Duration**: Until both players confirm the coin toss result

### State Detection

Check the match state response:
```typescript
const state = matchStateResponse.state;
if (state === 'FIRST_PLAYER_SELECTION') {
  // Handle coin toss confirmation UI
}
```

## New API Endpoint: Confirm First Player

### Endpoint

```
POST /api/v1/matches/:matchId/actions
```

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "playerId": "player-1",
  "actionType": "CONFIRM_FIRST_PLAYER",
  "actionData": {}
}
```

**Request Fields:**
- `playerId` (string, required): The ID of the player confirming
- `actionType` (string, required): Must be `"CONFIRM_FIRST_PLAYER"`
- `actionData` (object, required): Empty object `{}`

### Response

**Success Response (200 OK):**
```json
{
  "id": "match-id",
  "state": "FIRST_PLAYER_SELECTION" | "PLAYER_TURN",
  "currentPlayer": "PLAYER1" | "PLAYER2" | null,
  "coinTossResult": "PLAYER1" | "PLAYER2" | null,
  "firstPlayer": "PLAYER1" | "PLAYER2" | null,
  "playerHasConfirmedFirstPlayer": true | false,
  "opponentHasConfirmedFirstPlayer": true | false,
  "turnNumber": 0,
  "phase": null,
  "playerState": { /* ... */ },
  "opponentState": { /* ... */ },
  "availableActions": ["CONFIRM_FIRST_PLAYER", "CONCEDE"] | ["CONCEDE"],
  "playerDeckId": "deck-id",
  "opponentDeckId": "opponent-deck-id",
  "coinTossResult": "PLAYER1" | "PLAYER2",
  "playerHasConfirmedFirstPlayer": true | false,
  "opponentHasConfirmedFirstPlayer": true | false,
  "lastAction": null,
  "canAttachEnergy": false,
  "coinFlipState": null,
  "winnerId": null,
  "result": null,
  "winCondition": null,
  "endedAt": null
}
```

**Response States:**

1. **After First Player Confirms:**
   - `state`: `"FIRST_PLAYER_SELECTION"` (still waiting for second player)
   - `coinTossResult`: `"PLAYER1"` or `"PLAYER2"` (coin toss has happened)
   - `currentPlayer`: Set to match `coinTossResult`
   - `firstPlayer`: Set to match `coinTossResult`
   - `playerHasConfirmedFirstPlayer`: `true` (for the player who confirmed)
   - `opponentHasConfirmedFirstPlayer`: `false` (waiting for opponent)
   - `availableActions`: `["CONCEDE"]` (player has already confirmed)

2. **After Second Player Confirms:**
   - `state`: `"PLAYER_TURN"` (match has started)
   - `coinTossResult`: `"PLAYER1"` or `"PLAYER2"`
   - `currentPlayer`: Set to match `coinTossResult`
   - `firstPlayer`: Set to match `coinTossResult`
   - `playerHasConfirmedFirstPlayer`: `true`
   - `opponentHasConfirmedFirstPlayer`: `true`
   - `availableActions`: Actions available for `PLAYER_TURN` state

**Error Responses:**

- **400 Bad Request**: Player has already confirmed
  ```json
  {
    "statusCode": 400,
    "message": "Player 1 has already confirmed first player"
  }
  ```

- **400 Bad Request**: Invalid state (not in FIRST_PLAYER_SELECTION)
  ```json
  {
    "statusCode": 400,
    "message": "Cannot confirm first player in state SELECT_BENCH_POKEMON. Must be FIRST_PLAYER_SELECTION"
  }
  ```

## Match State Response Changes

### New Fields in Match State Response

The match state response (`GET /api/v1/matches/:matchId/state`) now includes:

```typescript
{
  // ... existing fields ...
  
  // New fields for coin toss confirmation
  "playerHasConfirmedFirstPlayer": boolean,
  "opponentHasConfirmedFirstPlayer": boolean,
  
  // coinTossResult may be null initially, then set after first confirmation
  "coinTossResult": "PLAYER1" | "PLAYER2" | null,
  
  // currentPlayer may be null initially, then set after coin toss
  "currentPlayer": "PLAYER1" | "PLAYER2" | null,
  
  // firstPlayer may be null initially, then set after coin toss
  "firstPlayer": "PLAYER1" | "PLAYER2" | null
}
```

### Field Descriptions

- **`playerHasConfirmedFirstPlayer`** (boolean): Whether the requesting player has confirmed the coin toss result
- **`opponentHasConfirmedFirstPlayer`** (boolean): Whether the opponent has confirmed the coin toss result
- **`coinTossResult`** (`"PLAYER1" | "PLAYER2" | null`): 
  - `null` before first player confirms
  - `"PLAYER1"` or `"PLAYER2"` after first player confirms (coin toss happens automatically)
- **`currentPlayer`** (`"PLAYER1" | "PLAYER2" | null`):
  - `null` before coin toss
  - Set to match `coinTossResult` after coin toss
- **`firstPlayer`** (`"PLAYER1" | "PLAYER2" | null`):
  - `null` before coin toss
  - Set to match `coinTossResult` after coin toss

## Available Actions

### In FIRST_PLAYER_SELECTION State

**Before Player Confirms:**
- `CONFIRM_FIRST_PLAYER`: Confirm the coin toss result
- `CONCEDE`: Concede the match

**After Player Confirms (Waiting for Opponent):**
- `CONCEDE`: Concede the match

## Client Implementation Guide

### Step 1: Detect FIRST_PLAYER_SELECTION State

```typescript
const matchState = await getMatchState(matchId, playerId);

if (matchState.state === 'FIRST_PLAYER_SELECTION') {
  // Show coin toss UI
}
```

### Step 2: Check Coin Toss Status

```typescript
const hasCoinTossResult = matchState.coinTossResult !== null;
const playerHasConfirmed = matchState.playerHasConfirmedFirstPlayer;
const opponentHasConfirmed = matchState.opponentHasConfirmedFirstPlayer;

if (!hasCoinTossResult) {
  // Coin toss hasn't happened yet - show "Determining first player..." message
  // When first player confirms, coin toss will happen automatically
} else {
  // Coin toss result is available - show result
  const firstPlayer = matchState.coinTossResult; // "PLAYER1" or "PLAYER2"
  
  if (!playerHasConfirmed) {
    // Show coin toss animation modal with result
    // Show "Confirm" button
  } else if (!opponentHasConfirmed) {
    // Player has confirmed, waiting for opponent
    // Show "Waiting for opponent to confirm..." message
  } else {
    // Both confirmed - match should transition to PLAYER_TURN
    // This should happen automatically, but poll state to confirm
  }
}
```

### Step 3: Confirm Coin Toss

```typescript
async function confirmCoinToss(matchId: string, playerId: string) {
  const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId: playerId,
      actionType: 'CONFIRM_FIRST_PLAYER',
      actionData: {},
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to confirm coin toss');
  }

  return await response.json();
}
```

### Step 4: Handle State Transitions

```typescript
// Poll match state after confirming
async function waitForMatchStart(matchId: string, playerId: string) {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const state = await getMatchState(matchId, playerId);
    
    if (state.state === 'PLAYER_TURN') {
      // Match has started!
      return state;
    }
    
    if (state.state === 'FIRST_PLAYER_SELECTION') {
      // Still waiting for opponent to confirm
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      continue;
    }
    
    // Unexpected state
    throw new Error(`Unexpected state: ${state.state}`);
  }
  
  throw new Error('Timeout waiting for match to start');
}
```

## UI Flow Example

### Scenario: Player 1 Confirms First

1. **Both players complete initial setup**
   - State transitions to `FIRST_PLAYER_SELECTION`
   - `coinTossResult`: `null`
   - `currentPlayer`: `null`

2. **Player 1 confirms (first to confirm)**
   - Client calls `CONFIRM_FIRST_PLAYER` action
   - Server performs coin toss automatically
   - Response includes:
     - `coinTossResult`: `"PLAYER1"` or `"PLAYER2"`
     - `currentPlayer`: Set to match coin toss result
     - `playerHasConfirmedFirstPlayer`: `true`
     - `opponentHasConfirmedFirstPlayer`: `false`

3. **Player 1 UI:**
   - Show coin toss animation modal
   - Display result: "You go first!" or "Opponent goes first!"
   - Show "Confirmed" status (button disabled)

4. **Player 2 UI (after polling):**
   - Show coin toss animation modal
   - Display result: "You go first!" or "Opponent goes first!"
   - Show "Confirm" button

5. **Player 2 confirms**
   - Client calls `CONFIRM_FIRST_PLAYER` action
   - Response includes:
     - `state`: `"PLAYER_TURN"`
     - `coinTossResult`: Same as before
     - Both confirmation flags: `true`

6. **Both players:**
   - Match has started
   - First player (from coin toss) can take their turn

## Error Handling

### Player Already Confirmed

```typescript
try {
  await confirmCoinToss(matchId, playerId);
} catch (error) {
  if (error.message.includes('already confirmed')) {
    // Player already confirmed - this is OK, just refresh state
    const state = await getMatchState(matchId, playerId);
    // Update UI based on current state
  } else {
    // Handle other errors
    console.error('Failed to confirm coin toss:', error);
  }
}
```

### Invalid State

```typescript
try {
  await confirmCoinToss(matchId, playerId);
} catch (error) {
  if (error.message.includes('Must be FIRST_PLAYER_SELECTION')) {
    // Match is not in the correct state
    // Refresh state and update UI accordingly
    const state = await getMatchState(matchId, playerId);
    // Handle based on actual state
  }
}
```

## Complete Example Implementation

```typescript
class MatchCoinTossHandler {
  async handleCoinTossState(matchId: string, playerId: string) {
    const state = await this.getMatchState(matchId, playerId);
    
    if (state.state !== 'FIRST_PLAYER_SELECTION') {
      return; // Not in coin toss state
    }
    
    const hasResult = state.coinTossResult !== null;
    const playerConfirmed = state.playerHasConfirmedFirstPlayer;
    const opponentConfirmed = state.opponentHasConfirmedFirstPlayer;
    
    if (!hasResult) {
      // Coin toss hasn't happened yet
      // Show "Determining first player..." message
      this.showWaitingMessage();
      
      // If this player is ready, show "Confirm" button
      // Coin toss will happen when first player confirms
      if (!playerConfirmed) {
        this.showConfirmButton(() => this.confirmCoinToss(matchId, playerId));
      }
    } else {
      // Coin toss result is available
      const result = state.coinTossResult;
      const isFirstPlayer = this.isCurrentPlayer(result, playerId);
      
      // Show coin toss animation modal
      this.showCoinTossModal(result, isFirstPlayer);
      
      if (!playerConfirmed) {
        // Player hasn't confirmed yet
        this.showConfirmButton(() => this.confirmCoinToss(matchId, playerId));
      } else if (!opponentConfirmed) {
        // Player confirmed, waiting for opponent
        this.showWaitingForOpponentMessage();
        // Poll state to detect when opponent confirms
        this.pollForMatchStart(matchId, playerId);
      } else {
        // Both confirmed - match should start
        this.pollForMatchStart(matchId, playerId);
      }
    }
  }
  
  async confirmCoinToss(matchId: string, playerId: string) {
    try {
      const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          actionType: 'CONFIRM_FIRST_PLAYER',
          actionData: {},
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      const updatedState = await response.json();
      
      // Update UI based on response
      if (updatedState.state === 'PLAYER_TURN') {
        // Match has started!
        this.onMatchStart(updatedState);
      } else {
        // Still waiting for opponent
        this.handleCoinTossState(matchId, playerId);
      }
    } catch (error) {
      if (error.message.includes('already confirmed')) {
        // Already confirmed - refresh state
        this.handleCoinTossState(matchId, playerId);
      } else {
        console.error('Failed to confirm coin toss:', error);
        this.showError(error.message);
      }
    }
  }
  
  async pollForMatchStart(matchId: string, playerId: string) {
    const maxAttempts = 10;
    let attempts = 0;
    
    const poll = async () => {
      const state = await this.getMatchState(matchId, playerId);
      
      if (state.state === 'PLAYER_TURN') {
        this.onMatchStart(state);
        return;
      }
      
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(poll, 1000); // Poll every second
      } else {
        console.error('Timeout waiting for match to start');
      }
    };
    
    poll();
  }
  
  isCurrentPlayer(result: string, playerId: string): boolean {
    // Compare result ("PLAYER1" or "PLAYER2") with playerId
    // This depends on your player identification logic
    return result === 'PLAYER1' && playerId === 'player-1' ||
           result === 'PLAYER2' && playerId === 'player-2';
  }
}
```

## Summary

### Key Changes for Client

1. **New State**: `FIRST_PLAYER_SELECTION` - occurs after both players complete initial setup
2. **New Action**: `CONFIRM_FIRST_PLAYER` - confirms the coin toss result
3. **New Fields**: 
   - `playerHasConfirmedFirstPlayer`
   - `opponentHasConfirmedFirstPlayer`
   - `coinTossResult` (may be null initially)
   - `currentPlayer` (may be null initially)
   - `firstPlayer` (may be null initially)

### Implementation Checklist

- [ ] Detect `FIRST_PLAYER_SELECTION` state
- [ ] Show coin toss UI when state is detected
- [ ] Handle coin toss result display (when `coinTossResult` is set)
- [ ] Implement `CONFIRM_FIRST_PLAYER` action call
- [ ] Handle waiting state (when opponent hasn't confirmed)
- [ ] Poll for state transition to `PLAYER_TURN`
- [ ] Handle error cases (already confirmed, invalid state)
- [ ] Update UI to show confirmation status

### Important Notes

- Coin toss happens **automatically** when the **first player** confirms
- Both players must confirm before match transitions to `PLAYER_TURN`
- `coinTossResult`, `currentPlayer`, and `firstPlayer` are `null` until coin toss happens
- After coin toss, all three fields are set to the same value (`"PLAYER1"` or `"PLAYER2"`)
- The player who confirms first triggers the coin toss, but both players see the same result

