# Complete Match Lifecycle - Client Guide

Complete step-by-step guide for implementing the match lifecycle on the client side, from match creation through gameplay.

## Table of Contents

- [Overview](#overview)
- [Match Lifecycle Stages](#match-lifecycle-stages)
  - [Stage 1: Match Creation](#stage-1-match-creation)
  - [Stage 2: Player 2 Joins](#stage-2-player-2-joins)
  - [Stage 3: Match Approval](#stage-3-match-approval)
  - [Stage 4: Drawing Initial Cards](#stage-4-drawing-initial-cards)
  - [Stage 5: Selecting Active Pokemon](#stage-5-selecting-active-pokemon)
  - [Stage 6: Setting Bench Pokemon](#stage-6-setting-bench-pokemon)
  - [Stage 7: Gameplay Loop](#stage-7-gameplay-loop)
- [State Visibility Rules](#state-visibility-rules)
- [Client Implementation Checklist](#client-implementation-checklist)
- [Code Examples](#code-examples)

---

## Overview

The match lifecycle consists of **7 main stages** that progress from match creation to active gameplay. Each stage has specific:

- **API calls** to make
- **States** to expect
- **Actions** available to players
- **UI** to display
- **Visibility rules** for opponent information

### Quick Reference Flow

```
1. CREATE MATCH → WAITING_FOR_PLAYERS
2. PLAYER 2 JOINS → DECK_VALIDATION → MATCH_APPROVAL
3. BOTH PLAYERS APPROVE → DRAWING_CARDS (coin toss automatic)
4. BOTH PLAYERS DRAW → SELECT_ACTIVE_POKEMON
5. BOTH PLAYERS SELECT ACTIVE → SELECT_BENCH_POKEMON
6. BOTH PLAYERS COMPLETE SETUP → PLAYER_TURN
7. GAMEPLAY LOOP → PLAYER_TURN ↔ BETWEEN_TURNS → MATCH_ENDED
```

---

## Match Lifecycle Stages

### Stage 1: Match Creation

**Purpose:** Player 1 creates a match and waits for an opponent.

#### API Call

```typescript
POST /api/v1/matches
Content-Type: application/json

{
  "id": "optional-match-id",  // Optional: server generates if omitted
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player1DeckId": "classic-fire-starter-deck"
}
```

#### Expected Response

```json
{
  "id": "match-id",
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player2Id": null,
  "player1DeckId": "classic-fire-starter-deck",
  "player2DeckId": null,
  "state": "WAITING_FOR_PLAYERS",
  "currentPlayer": null,
  "firstPlayer": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### Client Actions

1. **Display:** Show "Waiting for opponent..." message
2. **Poll:** Poll match state every 5 seconds to detect when player 2 joins
3. **UI State:** 
   - Show match ID (for player 2 to join)
   - Show "Waiting" indicator
   - Disable action buttons

#### What to Check

- `state === "WAITING_FOR_PLAYERS"`
- `player2Id === null` (waiting for opponent)

---

### Stage 2: Player 2 Joins

**Purpose:** Player 2 joins the match with their deck.

#### API Call (Player 2)

```typescript
POST /api/v1/matches/:matchId/join
Content-Type: application/json

{
  "playerId": "player-2",
  "deckId": "classic-water-starter-deck"
}
```

#### Expected Response

```json
{
  "id": "match-id",
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player2Id": "player-2",
  "player1DeckId": "classic-fire-starter-deck",
  "player2DeckId": "classic-water-starter-deck",
  "state": "DECK_VALIDATION",
  "currentPlayer": null,
  "firstPlayer": null
}
```

#### Client Actions (Both Players)

1. **Player 1:** 
   - Detect state change from `WAITING_FOR_PLAYERS` to `DECK_VALIDATION`
   - Show "Validating decks..." message
   - Poll state every 2-3 seconds

2. **Player 2:**
   - Show "Validating decks..." message
   - Poll state every 2-3 seconds

#### What to Check

- `state === "DECK_VALIDATION"` (both players see this)
- Wait ~500ms for deck validation to complete
- Then check for `state === "MATCH_APPROVAL"`

---

### Stage 3: Match Approval

**Purpose:** Both players approve the match before starting. Opponent deck IDs are **hidden** during this stage.

#### State Check (Both Players)

```typescript
GET /api/v1/matches/:matchId/state?playerId=:playerId
```

#### Expected Response

```json
{
  "matchId": "match-id",
  "state": "MATCH_APPROVAL",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "playerState": {
    "hand": [],
    "handCount": 0,
    "deckCount": 60,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 0,
    "deckCount": 60,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "availableActions": ["APPROVE_MATCH"],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": null  // ⚠️ HIDDEN during approval
}
```

#### Important Visibility Rules

- **`opponentDeckId` is `null`** during `MATCH_APPROVAL` state
- Both players see the same state (opponent deck hidden)
- After both approve, `opponentDeckId` becomes visible

#### Client Actions (Both Players)

1. **Display:**
   - Show "Approve Match" button
   - Show your own deck ID
   - Show "Opponent deck: Hidden" or similar message
   - Do NOT show opponent's deck information

2. **Player 1 Approves:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-1",
     "actionType": "APPROVE_MATCH",
     "actionData": {}
   }
   ```
   - State remains `MATCH_APPROVAL` (waiting for player 2)
   - `opponentDeckId` still `null`

3. **Player 2 Approves:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-2",
     "actionType": "APPROVE_MATCH",
     "actionData": {}
   }
   ```
   - **Coin toss happens automatically** (no API call needed)
   - State transitions to `DRAWING_CARDS`
   - `opponentDeckId` becomes visible

#### What to Check

- `state === "MATCH_APPROVAL"`
- `availableActions.includes("APPROVE_MATCH")`
- `opponentDeckId === null` (hidden)
- After both approve: `state === "DRAWING_CARDS"` and `opponentDeckId !== null`

---

### Stage 4: Drawing Initial Cards

**Purpose:** Both players draw their initial 7 cards. Hands are validated against start game rules.

#### State Check (After Approval)

```typescript
GET /api/v1/matches/:matchId/state?playerId=:playerId
```

#### Expected Response

```json
{
  "matchId": "match-id",
  "state": "DRAWING_CARDS",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "coinTossResult": {
    "firstPlayer": "PLAYER1",
    "result": "HEADS"  // or "TAILS"
  },
  "playerState": {
    "hand": [],
    "handCount": 0,
    "deckCount": 60,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 0,
    "deckCount": 60,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "availableActions": ["DRAW_INITIAL_CARDS"],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-water-starter-deck"  // ✅ Now visible
}
```

#### Client Actions (Both Players)

1. **Display:**
   - Show coin toss result (`coinTossResult.firstPlayer`)
   - Show "Draw Initial Cards" button
   - Show opponent's deck ID (now visible)
   - Show your deck ID

2. **Player 1 Draws:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-1",
     "actionType": "DRAW_INITIAL_CARDS",
     "actionData": {}
   }
   ```
   - Response shows 7 cards in `playerState.hand`
   - State remains `DRAWING_CARDS` (waiting for player 2)
   - If hand is invalid (no Basic Pokemon), player must redraw

3. **Player 2 Draws:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-2",
     "actionType": "DRAW_INITIAL_CARDS",
     "actionData": {}
   }
   ```
   - When **both players** have valid hands, state transitions to `SELECT_ACTIVE_POKEMON`

#### Hand Validation Rules

- Hand must contain at least **1 Basic Pokemon**
- If invalid, player must redraw (opponent can see drawn cards via `opponentState.drawnCards`)
- If valid, player's deck is marked as valid and hand is hidden from opponent

#### What to Check

- `state === "DRAWING_CARDS"`
- `availableActions.includes("DRAW_INITIAL_CARDS")`
- `coinTossResult` is present
- `opponentDeckId` is visible
- After both draw: `state === "SELECT_ACTIVE_POKEMON"`

---

### Stage 5: Selecting Active Pokemon

**Purpose:** Both players select their active Pokemon from their hand.

#### State Check

```typescript
GET /api/v1/matches/:matchId/state?playerId=:playerId
```

#### Expected Response

```json
{
  "matchId": "match-id",
  "state": "SELECT_ACTIVE_POKEMON",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "playerState": {
    "hand": ["card-id-1", "card-id-2", ...],  // 7 cards
    "handCount": 7,
    "deckCount": 53,
    "discardCount": 0,
    "activePokemon": null,  // Not set yet
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 7,
    "deckCount": 53,
    "discardCount": 0,
    "activePokemon": null,  // Hidden until you also select
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "availableActions": ["SET_ACTIVE_POKEMON"],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-water-starter-deck"
}
```

#### Important Visibility Rules

- **Opponent's active Pokemon is `null`** until you also select yours
- After both select, both players can see each other's active Pokemon

#### Client Actions (Both Players)

1. **Display:**
   - Show your hand (7 cards)
   - Show "Select Active Pokemon" prompt
   - Show opponent's active Pokemon as "Not selected" or hidden

2. **Player 2 Selects First:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-2",
     "actionType": "SET_ACTIVE_POKEMON",
     "actionData": {
       "cardId": "pokemon-base-set-v1.0-squirtle--63"
     }
   }
   ```
   - Player 1 still sees `opponentState.activePokemon === null`
   - State remains `SELECT_ACTIVE_POKEMON` (waiting for player 1)

3. **Player 1 Selects:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-1",
     "actionType": "SET_ACTIVE_POKEMON",
     "actionData": {
       "cardId": "pokemon-base-set-v1.0-charmander--46"
     }
   }
   ```
   - When **both players** select, state transitions to `SELECT_BENCH_POKEMON`
   - Both players can now see each other's active Pokemon

#### What to Check

- `state === "SELECT_ACTIVE_POKEMON"`
- `availableActions.includes("SET_ACTIVE_POKEMON")`
- `playerState.hand.length === 7`
- `opponentState.activePokemon === null` (until you also select)
- After both select: `state === "SELECT_BENCH_POKEMON"` and `opponentState.activePokemon !== null`

---

### Stage 6: Setting Bench Pokemon

**Purpose:** Both players optionally play Pokemon to their bench and mark themselves as ready.

#### State Check

```typescript
GET /api/v1/matches/:matchId/state?playerId=:playerId
```

#### Expected Response

```json
{
  "matchId": "match-id",
  "state": "SELECT_BENCH_POKEMON",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "playerState": {
    "hand": ["card-id-1", "card-id-2", ...],  // 6 cards (1 used for active)
    "handCount": 6,
    "deckCount": 53,
    "discardCount": 0,
    "activePokemon": {
      "instanceId": "instance-001",
      "cardId": "pokemon-base-set-v1.0-charmander--46",
      "position": "ACTIVE",
      "currentHp": 50,
      "maxHp": 50,
      "attachedEnergy": [],
      "statusEffect": "NONE",
      "damageCounters": 0
    },
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 6,
    "deckCount": 53,
    "discardCount": 0,
    "activePokemon": {
      "instanceId": "instance-002",
      "cardId": "pokemon-base-set-v1.0-squirtle--63",
      "position": "ACTIVE",
      "currentHp": 40,
      "maxHp": 40,
      "attachedEnergy": [],
      "statusEffect": "NONE",
      "damageCounters": 0
    },
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "availableActions": ["PLAY_POKEMON", "COMPLETE_INITIAL_SETUP"],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-water-starter-deck"
}
```

#### Client Actions (Both Players)

1. **Display:**
   - Show your hand (6 cards)
   - Show your active Pokemon
   - Show opponent's active Pokemon (now visible)
   - Show "Play Pokemon to Bench" button (optional)
   - Show "Ready to Start" or "Complete Setup" button

2. **Player 2 Plays Bench Pokemon (Optional):**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-2",
     "actionType": "PLAY_POKEMON",
     "actionData": {
       "cardId": "pokemon-base-set-v1.0-wartortle--42"
     }
   }
   ```
   - Pokemon is added to `playerState.bench`
   - Can play multiple Pokemon (max 5 on bench)

3. **Player 2 Marks Ready:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-2",
     "actionType": "COMPLETE_INITIAL_SETUP",
     "actionData": {}
   }
   ```
   - State remains `SELECT_BENCH_POKEMON` (waiting for player 1)
   - Player 2 is marked as ready

4. **Player 1 Plays Bench Pokemon (Optional):**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-1",
     "actionType": "PLAY_POKEMON",
     "actionData": {
       "cardId": "pokemon-base-set-v1.0-charmeleon--32"
     }
   }
   ```

5. **Player 1 Marks Ready:**
   ```typescript
   POST /api/v1/matches/:matchId/actions
   {
     "playerId": "player-1",
     "actionType": "COMPLETE_INITIAL_SETUP",
     "actionData": {}
   }
   ```
   - When **both players** complete setup, state transitions to `PLAYER_TURN`
   - First player (from coin toss) starts their turn

#### What to Check

- `state === "SELECT_BENCH_POKEMON"`
- `availableActions.includes("PLAY_POKEMON")` and `availableActions.includes("COMPLETE_INITIAL_SETUP")`
- `opponentState.activePokemon` is visible
- After both complete: `state === "PLAYER_TURN"` and `currentPlayer` is set

---

### Stage 7: Gameplay Loop

**Purpose:** Active gameplay with turns, actions, and win conditions.

#### State Check

```typescript
GET /api/v1/matches/:matchId/state?playerId=:playerId
```

#### Expected Response

```json
{
  "matchId": "match-id",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 1,
  "phase": "DRAW",
  "playerState": {
    "hand": ["card-id-1", "card-id-2", ...],
    "handCount": 6,
    "deckCount": 47,
    "discardCount": 0,
    "activePokemon": { /* ... */ },
    "bench": [{ /* ... */ }],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 6,
    "deckCount": 47,
    "discardCount": 0,
    "activePokemon": { /* ... */ },
    "bench": [{ /* ... */ }],
    "prizeCardsRemaining": 6
  },
  "availableActions": ["DRAW_CARD", "CONCEDE"],  // Filtered by player
  "lastAction": {
    "actionId": "action-001",
    "playerId": "PLAYER1",
    "actionType": "DRAW_CARD",
    "timestamp": "2024-01-01T12:00:05.000Z",
    "actionData": {}
  },
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-water-starter-deck"
}
```

#### Turn Phases

During `PLAYER_TURN`, the game progresses through phases:

1. **DRAW**: Draw 1 card (except first turn of first player)
2. **SETUP**: Play cards, attach energy, evolve, retreat
3. **ATTACK**: Declare and execute attack
4. **END**: End turn actions

#### Client Actions

1. **Your Turn:**
   - Check `currentPlayer === yourPlayerIdentifier`
   - Check `availableActions` for valid actions
   - Execute actions via `POST /api/v1/matches/:matchId/actions`
   - Update UI based on response

2. **Opponent's Turn:**
   - Poll state every 1-2 seconds
   - Detect changes by comparing state snapshots
   - Show opponent's actions via `lastAction`
   - Update opponent's state display

3. **State Transitions:**
   - `PLAYER_TURN` → `BETWEEN_TURNS` (when turn ends)
   - `BETWEEN_TURNS` → `PLAYER_TURN` (next player's turn)
   - `PLAYER_TURN` → `MATCH_ENDED` (win condition met)

#### What to Check

- `state === "PLAYER_TURN"` or `state === "BETWEEN_TURNS"`
- `currentPlayer` to know whose turn it is
- `availableActions` to know what you can do
- `lastAction` to see what opponent did
- `phase` to know current turn phase

---

## State Visibility Rules

### Opponent Deck ID Visibility

| State | `opponentDeckId` | Notes |
|-------|------------------|-------|
| `WAITING_FOR_PLAYERS` | `null` | No opponent yet |
| `DECK_VALIDATION` | `null` | Decks being validated |
| `MATCH_APPROVAL` | `null` | **Hidden until both approve** |
| `DRAWING_CARDS` | `string` | **Visible after approval** |
| `SELECT_ACTIVE_POKEMON` | `string` | Visible |
| `SELECT_BENCH_POKEMON` | `string` | Visible |
| `PLAYER_TURN` | `string` | Visible |
| `BETWEEN_TURNS` | `string` | Visible |

### Opponent Active Pokemon Visibility

| State | `opponentState.activePokemon` | Notes |
|-------|-------------------------------|-------|
| `SELECT_ACTIVE_POKEMON` | `null` | Hidden until you also select |
| `SELECT_BENCH_POKEMON` | `PokemonInPlay` | Visible after both select |
| `PLAYER_TURN` | `PokemonInPlay` | Visible |
| `BETWEEN_TURNS` | `PokemonInPlay` | Visible |

### Opponent Hand Visibility

| State | `opponentState.hand` | Notes |
|-------|----------------------|-------|
| All states | `undefined` | Never visible |
| `opponentState.handCount` | `number` | Always visible (count only) |
| `opponentState.drawnCards` | `string[]` | Only during `DRAWING_CARDS` if opponent has invalid hand |

---

## Client Implementation Checklist

### Stage 1: Match Creation
- [ ] Implement `POST /api/v1/matches` call
- [ ] Display match ID for sharing
- [ ] Show "Waiting for opponent" message
- [ ] Poll state every 5 seconds

### Stage 2: Player 2 Joins
- [ ] Implement `POST /api/v1/matches/:id/join` call
- [ ] Detect state change to `DECK_VALIDATION`
- [ ] Show "Validating decks" message
- [ ] Wait for validation (~500ms)

### Stage 3: Match Approval
- [ ] Show "Approve Match" button
- [ ] Implement `APPROVE_MATCH` action
- [ ] **Hide opponent deck ID** during approval
- [ ] Poll state to detect when opponent approves
- [ ] Show coin toss result when both approve

### Stage 4: Drawing Initial Cards
- [ ] Show "Draw Initial Cards" button
- [ ] Implement `DRAW_INITIAL_CARDS` action
- [ ] Display drawn cards (7 cards)
- [ ] Handle invalid hand (redraw required)
- [ ] Show opponent's drawn cards if invalid
- [ ] Poll state to detect when opponent draws

### Stage 5: Selecting Active Pokemon
- [ ] Display hand (7 cards)
- [ ] Show "Select Active Pokemon" prompt
- [ ] Implement `SET_ACTIVE_POKEMON` action
- [ ] **Hide opponent's active Pokemon** until you select
- [ ] Show opponent's active Pokemon after both select

### Stage 6: Setting Bench Pokemon
- [ ] Display hand (6 cards)
- [ ] Show active Pokemon (yours and opponent's)
- [ ] Implement `PLAY_POKEMON` action (optional)
- [ ] Implement `COMPLETE_INITIAL_SETUP` action
- [ ] Show "Ready" indicator when you're ready
- [ ] Poll state to detect when opponent is ready

### Stage 7: Gameplay Loop
- [ ] Check `currentPlayer` to know whose turn
- [ ] Filter `availableActions` based on player context
- [ ] Implement action execution for your turn
- [ ] Implement polling for opponent's turn (1-2s interval)
- [ ] Detect state changes by comparing snapshots
- [ ] Display `lastAction` to show opponent's actions
- [ ] Handle turn phases (DRAW, SETUP, ATTACK, END)
- [ ] Handle state transitions (PLAYER_TURN ↔ BETWEEN_TURNS)

---

## Code Examples

### Complete Match Flow Implementation

```typescript
class MatchFlowManager {
  private matchId: string;
  private playerId: string;
  private pollInterval: NodeJS.Timeout | null = null;
  private previousState: MatchStateResponse | null = null;

  // Stage 1: Create Match
  async createMatch(tournamentId: string, player1Id: string, deckId: string) {
    const response = await fetch('http://localhost:3000/api/v1/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId,
        player1Id,
        player1DeckId: deckId,
      }),
    });
    const match = await response.json();
    this.matchId = match.id;
    return match;
  }

  // Stage 2: Join Match
  async joinMatch(matchId: string, playerId: string, deckId: string) {
    const response = await fetch(
      `http://localhost:3000/api/v1/matches/${matchId}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, deckId }),
      }
    );
    return await response.json();
  }

  // Stage 3: Approve Match
  async approveMatch() {
    const response = await fetch(
      `http://localhost:3000/api/v1/matches/${this.matchId}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'APPROVE_MATCH',
          actionData: {},
        }),
      }
    );
    return await response.json();
  }

  // Stage 4: Draw Initial Cards
  async drawInitialCards() {
    const response = await fetch(
      `http://localhost:3000/api/v1/matches/${this.matchId}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        }),
      }
    );
    return await response.json();
  }

  // Stage 5: Set Active Pokemon
  async setActivePokemon(cardId: string) {
    const response = await fetch(
      `http://localhost:3000/api/v1/matches/${this.matchId}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'SET_ACTIVE_POKEMON',
          actionData: { cardId },
        }),
      }
    );
    return await response.json();
  }

  // Stage 6: Complete Initial Setup
  async completeInitialSetup() {
    const response = await fetch(
      `http://localhost:3000/api/v1/matches/${this.matchId}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        }),
      }
    );
    return await response.json();
  }

  // Get Match State
  async getMatchState(): Promise<MatchStateResponse> {
    const response = await fetch(
      `http://localhost:3000/api/v1/matches/${this.matchId}/state?playerId=${this.playerId}`
    );
    return await response.json();
  }

  // Start Polling
  startPolling(onStateChange: (state: MatchStateResponse) => void) {
    const poll = async () => {
      const currentState = await this.getMatchState();
      
      // Detect changes
      if (this.previousState) {
        const hasChanged = this.detectStateChanges(
          this.previousState,
          currentState
        );
        if (hasChanged) {
          onStateChange(currentState);
        }
      } else {
        onStateChange(currentState);
      }
      
      this.previousState = currentState;
      
      // Continue polling if match is active
      if (
        currentState.state === 'PLAYER_TURN' ||
        currentState.state === 'BETWEEN_TURNS' ||
        currentState.state === 'MATCH_APPROVAL' ||
        currentState.state === 'DRAWING_CARDS' ||
        currentState.state === 'SELECT_ACTIVE_POKEMON' ||
        currentState.state === 'SELECT_BENCH_POKEMON'
      ) {
        const interval = this.getPollingInterval(currentState);
        this.pollInterval = setTimeout(poll, interval);
      }
    };
    
    poll();
  }

  private getPollingInterval(state: MatchStateResponse): number {
    if (state.state === 'PLAYER_TURN' || state.state === 'BETWEEN_TURNS') {
      return 1500; // 1.5 seconds for active gameplay
    }
    if (
      state.state === 'MATCH_APPROVAL' ||
      state.state === 'DRAWING_CARDS' ||
      state.state === 'SELECT_ACTIVE_POKEMON' ||
      state.state === 'SELECT_BENCH_POKEMON'
    ) {
      return 2000; // 2 seconds for setup phases
    }
    return 5000; // 5 seconds for waiting states
  }

  private detectStateChanges(
    previous: MatchStateResponse,
    current: MatchStateResponse
  ): boolean {
    // Check state change
    if (previous.state !== current.state) return true;
    
    // Check turn change
    if (previous.currentPlayer !== current.currentPlayer) return true;
    
    // Check phase change
    if (previous.phase !== current.phase) return true;
    
    // Check last action change
    if (
      current.lastAction &&
      (!previous.lastAction ||
        current.lastAction.actionId !== previous.lastAction.actionId)
    ) {
      return true;
    }
    
    // Check opponent state changes
    if (
      previous.opponentState.handCount !== current.opponentState.handCount
    ) {
      return true;
    }
    
    if (
      previous.opponentState.activePokemon?.instanceId !==
      current.opponentState.activePokemon?.instanceId
    ) {
      return true;
    }
    
    return false;
  }

  stopPolling() {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
```

### React Hook Example

```typescript
function useMatchLifecycle(matchId: string, playerId: string) {
  const [matchState, setMatchState] = useState<MatchStateResponse | null>(null);
  const [stage, setStage] = useState<string>('WAITING');
  const manager = useRef(new MatchFlowManager());

  useEffect(() => {
    manager.current.matchId = matchId;
    manager.current.playerId = playerId;

    manager.current.startPolling((state) => {
      setMatchState(state);
      
      // Update stage based on state
      switch (state.state) {
        case 'WAITING_FOR_PLAYERS':
          setStage('WAITING_FOR_OPPONENT');
          break;
        case 'DECK_VALIDATION':
          setStage('VALIDATING_DECKS');
          break;
        case 'MATCH_APPROVAL':
          setStage('APPROVAL');
          break;
        case 'DRAWING_CARDS':
          setStage('DRAWING');
          break;
        case 'SELECT_ACTIVE_POKEMON':
          setStage('SELECT_ACTIVE');
          break;
        case 'SELECT_BENCH_POKEMON':
          setStage('SELECT_BENCH');
          break;
        case 'PLAYER_TURN':
        case 'BETWEEN_TURNS':
          setStage('GAMEPLAY');
          break;
        case 'MATCH_ENDED':
          setStage('ENDED');
          break;
      }
    });

    return () => {
      manager.current.stopPolling();
    };
  }, [matchId, playerId]);

  return {
    matchState,
    stage,
    approveMatch: () => manager.current.approveMatch(),
    drawInitialCards: () => manager.current.drawInitialCards(),
    setActivePokemon: (cardId: string) =>
      manager.current.setActivePokemon(cardId),
    completeInitialSetup: () => manager.current.completeInitialSetup(),
  };
}
```

---

## Summary

The complete match lifecycle consists of **7 stages**:

1. **Match Creation** → `WAITING_FOR_PLAYERS`
2. **Player 2 Joins** → `DECK_VALIDATION` → `MATCH_APPROVAL`
3. **Match Approval** → Both players approve (opponent deck hidden)
4. **Drawing Cards** → Both players draw 7 cards
5. **Select Active** → Both players select active Pokemon
6. **Set Bench** → Both players optionally set bench and mark ready
7. **Gameplay** → `PLAYER_TURN` ↔ `BETWEEN_TURNS` loop

### Key Visibility Rules

- **Opponent deck ID**: Hidden during `MATCH_APPROVAL`, visible after
- **Opponent active Pokemon**: Hidden until you also select yours
- **Opponent hand**: Never visible (only count)

### Polling Strategy

- **Active gameplay**: Poll every 1-2 seconds
- **Setup phases**: Poll every 2 seconds
- **Waiting states**: Poll every 5 seconds
- **Terminal states**: Stop polling

---

**Related Documentation:**
- [MATCH-API.md](./MATCH-API.md) - Complete API reference
- [CLIENT-MATCH-FLOW.md](./CLIENT-MATCH-FLOW.md) - Communication flow patterns
- [MATCH-STATE-MACHINE-DIAGRAM.md](./MATCH-STATE-MACHINE-DIAGRAM.md) - State machine visualization


