# Client Match Flow Guide

Complete guide for implementing match communication between client and server in the OpenTCG system.

## Table of Contents

- [Overview](#overview)
- [Requirements Summary](#requirements-summary)
- [API Endpoints](#api-endpoints)
- [Data Structures](#data-structures)
- [Communication Flow](#communication-flow)
- [State Machine](#state-machine)
- [Handling Your Turn](#handling-your-turn)
- [Handling Opponent's Turn](#handling-opponents-turn)
- [Detecting State Changes](#detecting-state-changes)
- [Polling Strategy](#polling-strategy)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

---

## Overview

The match API uses a **polling-based** architecture where:
- The server maintains the authoritative game state
- Clients poll for state updates
- Clients submit actions when it's their turn
- State changes are detected by comparing consecutive state responses

### Key Principles

1. **Server is Source of Truth**: Always use server state as the authoritative source
2. **State-Based Actions**: Actions are only available when the server indicates they are valid
3. **Polling for Updates**: Clients poll for state changes, especially during opponent's turn
4. **State Comparison**: Detect changes by comparing previous and current state snapshots

---

## Requirements Summary

The match API supports three core requirements:

### ✅ Requirement 1: State Visibility to Both Players

Both players receive the same state information:
- `state`: Current match state (e.g., `PLAYER_TURN`, `INITIAL_SETUP`)
- `currentPlayer`: Whose turn it is (`PLAYER1` or `PLAYER2`)
- `turnNumber`: Current turn number
- `phase`: Current phase of the turn (`DRAW`, `MAIN_PHASE`, `ATTACK`, `END`)

**Example:**
```json
{
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 3,
  "phase": "MAIN_PHASE"
}
```

### ✅ Requirement 2: Available Actions for Current Player

When it's your turn, the server provides `availableActions` - a list of valid actions you can take.

**Example:**
```json
{
  "currentPlayer": "PLAYER1",
  "availableActions": [
    "PLAY_POKEMON",
    "ATTACH_ENERGY",
    "PLAY_TRAINER",
    "EVOLVE_POKEMON",
    "RETREAT",
    "USE_ABILITY",
    "END_TURN",
    "CONCEDE"
  ]
}
```

**Filtering Rules:**
- If it's **your turn**: You see all valid actions for the current phase
- If it's **opponent's turn**: You only see `CONCEDE`
- During `INITIAL_SETUP`: You see `SET_ACTIVE_POKEMON` (if you haven't set it yet) or only `CONCEDE` (if you already set it)

### ⚠️ Requirement 3: State Changes During Opponent's Turn

When it's the opponent's turn, you receive:
- `lastAction`: The last action taken by any player (including opponent)
- Updated `opponentState`: Reflects changes from opponent's actions
- Updated `playerState`: Reflects any effects on your side

**Note**: The server does not provide explicit "effect descriptions" (e.g., "healed 20 HP"). You must detect changes by comparing state snapshots.

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1/matches
```

### 1. Get Match State

Get the current match state from your perspective.

**Endpoint:** `GET /api/v1/matches/:matchId/state?playerId=:playerId`

**Response:** `200 OK`

```json
{
  "matchId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 3,
  "phase": "MAIN_PHASE",
  "playerState": { /* Your full state */ },
  "opponentState": { /* Opponent's limited state */ },
  "availableActions": ["PLAY_POKEMON", "ATTACH_ENERGY", ...],
  "lastAction": {
    "actionId": "action-001",
    "playerId": "PLAYER1",
    "actionType": "DRAW_CARD",
    "timestamp": "2024-01-01T12:00:05.000Z",
    "actionData": {}
  },
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-grass-starter-deck"
}
```

**Use Cases:**
- Poll for state updates during opponent's turn
- Refresh state after executing an action
- Check current match status

### 2. Execute Player Action

Execute an action during your turn.

**Endpoint:** `POST /api/v1/matches/:matchId/actions`

**Request Body:**
```json
{
  "playerId": "player-1",
  "actionType": "ATTACH_ENERGY",
  "actionData": {
    "energyCardId": "pokemon-base-set-v1.0-fire-energy--99",
    "target": "ACTIVE"
  }
}
```

**Response:** `200 OK`

Returns updated match state (same format as Get Match State).

**Error Response:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Invalid action: INVALID_PHASE",
  "error": "Bad Request"
}
```

**Use Cases:**
- Submit actions during your turn
- Actions are validated server-side
- Response includes updated state with new `availableActions`

---

## Data Structures

### MatchStateResponse

Complete match state from a player's perspective.

```typescript
interface MatchStateResponse {
  matchId: string;
  state: MatchState;                    // Current match state
  currentPlayer: PlayerIdentifier | null; // Whose turn it is
  turnNumber: number;                   // Current turn number
  phase: TurnPhase | null;              // Current phase
  playerState: PlayerState;             // Your full state
  opponentState: OpponentState;        // Opponent's limited state
  availableActions: string[];           // Actions you can take
  lastAction?: ActionSummary;          // Last action taken
  playerDeckId: string | null;         // Your deck ID
  opponentDeckId: string | null;      // Opponent's deck ID
}
```

### PlayerState

Your complete game state (you see everything).

```typescript
interface PlayerState {
  hand: string[];                       // Card IDs in your hand
  handCount: number;                    // Number of cards
  deckCount: number;                    // Cards remaining in deck
  discardCount: number;                 // Cards in discard pile
  activePokemon: PokemonInPlay | null; // Your active Pokemon
  bench: PokemonInPlay[];               // Your bench (max 5)
  prizeCardsRemaining: number;          // Prize cards remaining (0-6)
  attachedEnergy: string[];            // Energy on active Pokemon
}
```

### OpponentState

Opponent's limited state (you don't see their hand cards).

```typescript
interface OpponentState {
  handCount: number;                    // Number of cards (not actual cards)
  deckCount: number;                    // Cards remaining
  discardCount: number;                 // Cards in discard
  activePokemon: PokemonInPlay | null; // Opponent's active Pokemon
  bench: PokemonInPlay[];               // Opponent's bench
  benchCount: number;                   // Number of bench Pokemon
  prizeCardsRemaining: number;          // Prize cards remaining
  attachedEnergy: string[];            // Energy on active Pokemon
  revealedHand?: string[];             // Hand revealed during INITIAL_SETUP
}
```

### ActionSummary

Information about the last action taken.

```typescript
interface ActionSummary {
  actionId: string;                     // Unique action ID
  playerId: PlayerIdentifier;           // Who took the action
  actionType: PlayerActionType;        // Type of action
  timestamp: string;                   // ISO 8601 timestamp
  actionData: Record<string, unknown>; // Action-specific data
}
```

### Enums

```typescript
enum MatchState {
  CREATED = 'CREATED',
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  DECK_VALIDATION = 'DECK_VALIDATION',
  PRE_GAME_SETUP = 'PRE_GAME_SETUP',
  INITIAL_SETUP = 'INITIAL_SETUP',
  PLAYER_TURN = 'PLAYER_TURN',
  BETWEEN_TURNS = 'BETWEEN_TURNS',
  MATCH_ENDED = 'MATCH_ENDED',
  CANCELLED = 'CANCELLED'
}

enum TurnPhase {
  DRAW = 'DRAW',
  MAIN_PHASE = 'MAIN_PHASE',
  ATTACK = 'ATTACK',
  END = 'END'
}

enum PlayerActionType {
  DRAW_CARD = 'DRAW_CARD',
  PLAY_POKEMON = 'PLAY_POKEMON',
  SET_ACTIVE_POKEMON = 'SET_ACTIVE_POKEMON',
  ATTACH_ENERGY = 'ATTACH_ENERGY',
  PLAY_TRAINER = 'PLAY_TRAINER',
  EVOLVE_POKEMON = 'EVOLVE_POKEMON',
  RETREAT = 'RETREAT',
  ATTACK = 'ATTACK',
  USE_ABILITY = 'USE_ABILITY',
  END_TURN = 'END_TURN',
  CONCEDE = 'CONCEDE'
}
```

---

## Communication Flow

### Complete Match Lifecycle

```
1. Create Match
   Client → POST /api/v1/matches
   Server → Returns match in CREATED/WAITING_FOR_PLAYERS state

2. Join Match
   Client → POST /api/v1/matches/:id/join
   Server → Returns match in DECK_VALIDATION state

3. Start Match (after coin flip)
   Client → POST /api/v1/matches/:id/start
   Server → Returns match in INITIAL_SETUP state

4. Initial Setup
   Client → GET /api/v1/matches/:id/state (poll)
   Server → Returns state with availableActions: ["SET_ACTIVE_POKEMON"]
   Client → POST /api/v1/matches/:id/actions (set active Pokemon)
   Server → Returns updated state

5. Gameplay Loop (repeat until match ends)
   a. Your Turn:
      - GET /api/v1/matches/:id/state
      - Check availableActions
      - POST /api/v1/matches/:id/actions (execute action)
      - Repeat until END_TURN

   b. Opponent's Turn:
      - GET /api/v1/matches/:id/state (poll every 1-2 seconds)
      - Detect state changes
      - Show opponent's actions
      - Wait for turn to switch
```

---

## State Machine

### State Flow Diagram

```
CREATED
  ↓ (assign player 1)
WAITING_FOR_PLAYERS
  ↓ (assign player 2)
DECK_VALIDATION
  ↓ (decks valid)
PRE_GAME_SETUP
  ↓ (coin flip, set first player)
INITIAL_SETUP
  ↓ (both players set active Pokemon)
PLAYER_TURN
  ↓ (turn ends)
BETWEEN_TURNS
  ↓ (process effects)
PLAYER_TURN (next player)
  ↓ (win condition met)
MATCH_ENDED
```

### State Descriptions

- **CREATED**: Match created, no players assigned
- **WAITING_FOR_PLAYERS**: Waiting for players to join
- **DECK_VALIDATION**: Validating both player decks
- **PRE_GAME_SETUP**: Coin flip, determine first player
- **INITIAL_SETUP**: Initial game setup (shuffle, draw, set Pokemon)
- **PLAYER_TURN**: Active player's turn
- **BETWEEN_TURNS**: Processing between-turn effects
- **MATCH_ENDED**: Match completed
- **CANCELLED**: Match cancelled

### Turn Phases

During `PLAYER_TURN`, the game progresses through phases:

1. **DRAW**: Draw 1 card (except first turn of first player)
2. **MAIN_PHASE**: Play cards, attach energy, evolve, retreat, attack
3. **ATTACK**: Declare and execute attack
4. **END**: End turn actions

---

## Handling Your Turn

When `currentPlayer` matches your player identifier:

### 1. Check Available Actions

The `availableActions` array tells you what you can do:

```typescript
if (matchState.currentPlayer === myPlayerId) {
  // It's my turn
  const actions = matchState.availableActions;

  if (actions.includes('ATTACH_ENERGY')) {
    // I can attach energy
  }

  if (actions.includes('PLAY_TRAINER')) {
    // I can play a trainer card
  }

  if (actions.includes('ATTACK')) {
    // I can attack
  }
}
```

### 2. Execute Actions

Submit actions using the Execute Action endpoint:

```typescript
async function executeAction(
  matchId: string,
  playerId: string,
  actionType: PlayerActionType,
  actionData: Record<string, unknown>
): Promise<MatchStateResponse> {
  const response = await fetch(
    `http://localhost:3000/api/v1/matches/${matchId}/actions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        actionType,
        actionData,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

### 3. Update UI Based on Response

After executing an action, the server returns updated state:

```typescript
const newState = await executeAction(
  matchId,
  playerId,
  'ATTACH_ENERGY',
  { energyCardId: '...', target: 'ACTIVE' }
);

// Update your UI with newState
// Check newState.availableActions for next actions
// newState.phase may have changed
```

### 4. Phase Progression

Actions can change the phase:

- `DRAW_CARD` in `DRAW` phase → moves to `MAIN_PHASE`
- Actions in `MAIN_PHASE` → stay in `MAIN_PHASE` (can do multiple, including ATTACK)
- `ATTACK` in `ATTACK` phase → moves to `END` phase
- `END_TURN` → ends turn, moves to `BETWEEN_TURNS` state

---

## Handling Opponent's Turn

When `currentPlayer` does NOT match your player identifier:

### 1. Poll for State Updates

Poll the Get Match State endpoint every 1-2 seconds:

```typescript
async function pollMatchState(
  matchId: string,
  playerId: string,
  onStateChange: (state: MatchStateResponse) => void
) {
  let previousState: MatchStateResponse | null = null;

  const poll = async () => {
    const currentState = await getMatchState(matchId, playerId);

    // Detect changes
    if (previousState) {
      const changes = detectStateChanges(previousState, currentState);
      if (changes.length > 0) {
        onStateChange(currentState);
        // Show changes to user
        showStateChanges(changes);
      }
    }

    previousState = currentState;

    // Continue polling if match is active
    if (
      currentState.state === 'PLAYER_TURN' ||
      currentState.state === 'BETWEEN_TURNS'
    ) {
      setTimeout(poll, 1500); // Poll every 1.5 seconds
    }
  };

  poll();
}
```

### 2. Detect State Changes

Compare previous and current state to detect what changed:

```typescript
interface StateChange {
  type: 'action' | 'hp_change' | 'card_movement' | 'status_change' | 'turn_change';
  description: string;
  details?: Record<string, unknown>;
}

function detectStateChanges(
  previous: MatchStateResponse,
  current: MatchStateResponse
): StateChange[] {
  const changes: StateChange[] = [];

  // Check if opponent took an action
  if (
    current.lastAction &&
    (!previous.lastAction ||
      current.lastAction.actionId !== previous.lastAction.actionId)
  ) {
    changes.push({
      type: 'action',
      description: `Opponent ${getActionDescription(current.lastAction)}`,
      details: {
        actionType: current.lastAction.actionType,
        actionData: current.lastAction.actionData,
      },
    });
  }

  // Check opponent's active Pokemon HP changes
  if (
    previous.opponentState.activePokemon &&
    current.opponentState.activePokemon
  ) {
    const prevHp = previous.opponentState.activePokemon.currentHp;
    const currHp = current.opponentState.activePokemon.currentHp;

    if (prevHp !== currHp) {
      const diff = currHp - prevHp;

      // Check if this HP change is from an attack (use attack damage from lastAction)
      let damageSource = 'unknown';
      if (current.lastAction?.actionType === 'ATTACK' && current.lastAction.actionData.damage) {
        // Attack damage is already calculated with all modifiers (weakness, resistance, etc.)
        damageSource = 'attack';
        // Use the attack damage amount from actionData instead of calculating from HP difference
        // This ensures we show the correct damage including all modifiers
        changes.push({
          type: 'hp_change',
          description: `Opponent's active Pokemon took ${current.lastAction.actionData.damage} damage from attack`,
          details: {
            instanceId: current.opponentState.activePokemon.instanceId,
            previousHp: prevHp,
            currentHp: currHp,
            difference: diff,
            attackDamage: current.lastAction.actionData.damage,
            source: 'attack',
          },
        });
      } else {
        // HP change from other sources (poison, burn, healing, etc.)
        damageSource = diff > 0 ? 'healing' : 'status_effect';
      changes.push({
        type: 'hp_change',
        description: `Opponent's active Pokemon ${diff > 0 ? 'healed' : 'took'} ${Math.abs(diff)} damage`,
        details: {
          instanceId: current.opponentState.activePokemon.instanceId,
          previousHp: prevHp,
          currentHp: currHp,
          difference: diff,
            source: damageSource,
        },
      });
      }
    }
  }

  // Check opponent's bench changes
  const prevBenchCount = previous.opponentState.benchCount;
  const currBenchCount = current.opponentState.benchCount;

  if (prevBenchCount !== currBenchCount) {
    changes.push({
      type: 'card_movement',
      description: `Opponent ${currBenchCount > prevBenchCount ? 'played' : 'removed'} a Pokemon from bench`,
      details: {
        previousCount: prevBenchCount,
        currentCount: currBenchCount,
      },
    });
  }

  // Check status effect changes
  if (
    previous.opponentState.activePokemon &&
    current.opponentState.activePokemon
  ) {
    const prevStatus = previous.opponentState.activePokemon.statusEffect;
    const currStatus = current.opponentState.activePokemon.statusEffect;

    if (prevStatus !== currStatus) {
      changes.push({
        type: 'status_change',
        description: `Opponent's active Pokemon status changed to ${currStatus}`,
        details: {
          previousStatus: prevStatus,
          currentStatus: currStatus,
        },
      });
    }
  }

  // Check turn changes
  if (previous.currentPlayer !== current.currentPlayer) {
    changes.push({
      type: 'turn_change',
      description: `Turn switched to ${current.currentPlayer}`,
      details: {
        previousPlayer: previous.currentPlayer,
        currentPlayer: current.currentPlayer,
        turnNumber: current.turnNumber,
      },
    });
  }

  return changes;
}

function getActionDescription(action: ActionSummary): string {
  switch (action.actionType) {
    case 'PLAY_TRAINER':
      return `played a trainer card`;
    case 'ATTACH_ENERGY':
      return `attached energy`;
    case 'PLAY_POKEMON':
      return `played a Pokemon`;
    case 'ATTACK':
      return `attacked`;
    case 'EVOLVE_POKEMON':
      return `evolved a Pokemon`;
    case 'RETREAT':
      return `retreated`;
    case 'END_TURN':
      return `ended their turn`;
    default:
      return `performed ${action.actionType}`;
  }
}
```

### 3. Display State Changes

Show detected changes to the user:

```typescript
function showStateChanges(changes: StateChange[]) {
  changes.forEach((change) => {
    switch (change.type) {
      case 'action':
        showNotification(`${change.description}`);
        break;
      case 'hp_change':
        showNotification(`${change.description}`);
        animateHpChange(change.details);
        break;
      case 'card_movement':
        showNotification(`${change.description}`);
        updateBenchDisplay();
        break;
      case 'status_change':
        showNotification(`${change.description}`);
        updateStatusEffectDisplay();
        break;
      case 'turn_change':
        showNotification(`${change.description}`);
        if (change.details.currentPlayer === myPlayerId) {
          // It's now my turn!
          enableActionButtons();
        }
        break;
    }
  });
}
```

### 4. Stop Polling When It's Your Turn

When `currentPlayer` changes to your player identifier, stop polling and enable action buttons:

```typescript
if (currentState.currentPlayer === myPlayerId) {
  // Stop polling
  clearInterval(pollInterval);

  // Enable action buttons
  enableActionButtons();

  // Show available actions
  displayAvailableActions(currentState.availableActions);
}
```

---

## Detecting State Changes

### Comparison Strategy

Since the server doesn't provide explicit "effect descriptions", you must compare state snapshots:

1. **Store Previous State**: Keep the last state you received
2. **Compare on Update**: When you receive a new state, compare it with the previous
3. **Detect Differences**: Identify what changed (HP, cards, status effects, etc.)
4. **Display Changes**: Show detected changes to the user

### What to Compare

#### Opponent's Active Pokemon
- `currentHp`: HP changes indicate damage/healing
- `statusEffect`: Status condition changes
- `attachedEnergy`: Energy attachment/removal
- `damageCounters`: Damage counter changes

#### Opponent's Bench
- `benchCount`: Number of Pokemon on bench
- `bench` array: Compare Pokemon instances (by `instanceId`)

#### Opponent's Resources
- `handCount`: Cards in hand (increases/decreases)
- `deckCount`: Cards in deck (decreases)
- `discardCount`: Cards in discard (increases)
- `prizeCardsRemaining`: Prize cards remaining

#### Match State
- `state`: Match state changes
- `currentPlayer`: Turn changes
- `phase`: Phase changes
- `turnNumber`: Turn number increments

#### Last Action
- `lastAction.actionId`: New action ID means a new action was taken
- `lastAction.actionType`: Type of action
- `lastAction.actionData`: Action-specific data
  - **For ATTACK actions**: `actionData.damage` contains the **total damage dealt** including all modifiers (weakness, resistance, trainer cards, etc.)
  - **Important**: Attack damage does NOT include poison/burn damage (those are applied between turns)

### Example: Detecting Trainer Card Effects

```typescript
// Previous state: opponent's active Pokemon has 30 HP
// Current state: opponent's active Pokemon has 50 HP
// lastAction: { actionType: 'PLAY_TRAINER', actionData: { cardId: 'potion' } }

// You can infer:
// - Opponent played a Potion trainer card
// - It healed their active Pokemon by 20 HP
// - Display: "Opponent played Potion, healing their active Pokemon by 20 HP"
```

### Poison Damage Between Turns

Poison damage is applied automatically between turns and detected via HP changes.

#### Detection

Compare HP values between state updates when no attack occurred:

```typescript
function detectPoisonDamage(
  previousState: MatchStateResponse,
  currentState: MatchStateResponse
): {
  type: 'poison_damage';
  damage: number;
  instanceId: string;
  statusEffect: 'POISONED';
} | null {
  // Check if it's not an attack action
  if (currentState.lastAction?.actionType === 'ATTACK') {
    return null; // Attack damage, not poison
  }

  // Check active Pokemon HP changes
  const prevHp = previousState.opponentState.activePokemon?.currentHp;
  const currHp = currentState.opponentState.activePokemon?.currentHp;

  if (prevHp !== undefined && currHp !== undefined && prevHp > currHp) {
    const damage = prevHp - currHp;

    // Check if Pokemon is poisoned
    if (currentState.opponentState.activePokemon?.statusEffect === 'POISONED') {
      return {
        type: 'poison_damage',
        damage: damage,
        instanceId: currentState.opponentState.activePokemon.instanceId,
        statusEffect: 'POISONED',
      };
    }
  }

  // Check bench Pokemon HP changes
  if (previousState.opponentState.bench && currentState.opponentState.bench) {
    for (let i = 0; i < currentState.opponentState.bench.length; i++) {
      const prevBench = previousState.opponentState.bench[i];
      const currBench = currentState.opponentState.bench[i];

      if (prevBench && currBench && prevBench.instanceId === currBench.instanceId) {
        const prevHp = prevBench.currentHp;
        const currHp = currBench.currentHp;

        if (prevHp > currHp && currBench.statusEffect === 'POISONED') {
          return {
            type: 'poison_damage',
            damage: prevHp - currHp,
            instanceId: currBench.instanceId,
            statusEffect: 'POISONED',
          };
        }
      }
    }
  }

  return null;
}
```

#### When Poison is Applied

- After each player's turn ends
- During `BETWEEN_TURNS` state processing
- Before next player's turn begins
- Applied to both active and bench Pokemon (if poisoned)

#### Display

```typescript
const poisonInfo = detectPoisonDamage(previousState, currentState);
if (poisonInfo) {
  showNotification(
    `Poison dealt ${poisonInfo.damage} damage to ${getPokemonName(poisonInfo.instanceId)}!`
  );
  animatePoisonDamage(poisonInfo.instanceId, poisonInfo.damage);
  updateHpDisplay(poisonInfo.instanceId);
}
```

#### Poison Amounts

- **Normal poison**: 10 damage per turn
- **Toxic (Nidoking)**: 20 damage per turn
- Check `pokemon.poisonDamageAmount` field for specific amount

#### Integration with State Change Detection

Update your `detectStateChanges` function to include poison detection:

```typescript
function detectStateChanges(
  previous: MatchStateResponse,
  current: MatchStateResponse
): StateChange[] {
  const changes: StateChange[] = [];

  // ... existing detection code ...

  // Check for poison damage (only if not an attack)
  if (current.lastAction?.actionType !== 'ATTACK') {
    const poisonInfo = detectPoisonDamage(previous, current);
    if (poisonInfo) {
      changes.push({
        type: 'hp_change',
        description: `Poison dealt ${poisonInfo.damage} damage to ${getPokemonName(poisonInfo.instanceId)}`,
        details: {
          instanceId: poisonInfo.instanceId,
          damage: poisonInfo.damage,
          source: 'poison',
          statusEffect: 'POISONED',
        },
      });
    }
  }

  return changes;
}
```

**Important Notes:**
- Poison damage is **NOT** included in attack `actionData.damage`
- Poison damage appears as HP changes between state updates
- Poison damage occurs during `BETWEEN_TURNS` state
- Both active and bench Pokemon can take poison damage
- Check `statusEffect === 'POISONED'` to confirm it's poison damage (not other HP changes)

---

## Polling Strategy

### When to Poll

- **Active Match** (`PLAYER_TURN`, `BETWEEN_TURNS`): Poll every 1-2 seconds
- **Waiting States** (`WAITING_FOR_PLAYERS`, `DECK_VALIDATION`): Poll every 5 seconds
- **Terminal States** (`MATCH_ENDED`, `CANCELLED`): Stop polling

### Polling Implementation

```typescript
class MatchStatePoller {
  private pollInterval: NodeJS.Timeout | null = null;
  private previousState: MatchStateResponse | null = null;

  constructor(
    private matchId: string,
    private playerId: string,
    private onStateChange: (state: MatchStateResponse, changes: StateChange[]) => void
  ) {}

  start() {
    this.poll();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async poll() {
    try {
      const currentState = await getMatchState(this.matchId, this.playerId);

      // Detect changes
      let changes: StateChange[] = [];
      if (this.previousState) {
        changes = detectStateChanges(this.previousState, currentState);
      }

      // Notify of state change
      if (changes.length > 0 || !this.previousState) {
        this.onStateChange(currentState, changes);
      }

      this.previousState = currentState;

      // Determine polling interval based on state
      const interval = this.getPollingInterval(currentState);

      // Continue polling if match is active
      if (this.shouldContinuePolling(currentState)) {
        this.pollInterval = setTimeout(() => this.poll(), interval);
      } else {
        this.stop();
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Retry after delay
      this.pollInterval = setTimeout(() => this.poll(), 5000);
    }
  }

  private getPollingInterval(state: MatchStateResponse): number {
    if (state.state === 'PLAYER_TURN' || state.state === 'BETWEEN_TURNS') {
      return 1500; // 1.5 seconds for active gameplay
    }
    if (
      state.state === 'WAITING_FOR_PLAYERS' ||
      state.state === 'DECK_VALIDATION' ||
      state.state === 'PRE_GAME_SETUP'
    ) {
      return 5000; // 5 seconds for waiting states
    }
    return 10000; // 10 seconds for other states
  }

  private shouldContinuePolling(state: MatchStateResponse): boolean {
    return state.state !== 'MATCH_ENDED' && state.state !== 'CANCELLED';
  }
}
```

### Exponential Backoff

Implement exponential backoff for error handling:

```typescript
let retryDelay = 1000; // Start with 1 second

async function pollWithBackoff() {
  try {
    const state = await getMatchState(matchId, playerId);
    retryDelay = 1000; // Reset on success
    // Process state...
  } catch (error) {
    console.error('Polling error:', error);
    setTimeout(() => {
      retryDelay = Math.min(retryDelay * 2, 10000); // Max 10 seconds
      pollWithBackoff();
    }, retryDelay);
  }
}
```

---

## Implementation Examples

### React Hook Example

```typescript
import { useState, useEffect, useRef } from 'react';

interface UseMatchStateReturn {
  matchState: MatchStateResponse | null;
  loading: boolean;
  error: string | null;
  isMyTurn: boolean;
  executeAction: (
    actionType: PlayerActionType,
    actionData: Record<string, unknown>
  ) => Promise<void>;
  stateChanges: StateChange[];
}

export function useMatchState(
  matchId: string,
  playerId: string
): UseMatchStateReturn {
  const [matchState, setMatchState] = useState<MatchStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateChanges, setStateChanges] = useState<StateChange[]>([]);
  const previousStateRef = useRef<MatchStateResponse | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for state updates
  useEffect(() => {
    const poll = async () => {
      try {
        const currentState = await getMatchState(matchId, playerId);

        // Detect changes
        if (previousStateRef.current) {
          const changes = detectStateChanges(
            previousStateRef.current,
            currentState
          );
          setStateChanges(changes);
        }

        setMatchState(currentState);
        previousStateRef.current = currentState;
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    const interval = setInterval(() => {
      if (
        matchState?.state === 'PLAYER_TURN' ||
        matchState?.state === 'BETWEEN_TURNS'
      ) {
        poll();
      }
    }, 1500);

    pollIntervalRef.current = interval;

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [matchId, playerId, matchState?.state]);

  const executeAction = async (
    actionType: PlayerActionType,
    actionData: Record<string, unknown>
  ) => {
    try {
      const newState = await executeAction(matchId, playerId, actionType, actionData);
      setMatchState(newState);
      previousStateRef.current = newState;
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const isMyTurn =
    matchState?.currentPlayer !== null &&
    matchState?.currentPlayer === getPlayerIdentifier(playerId);

  return {
    matchState,
    loading,
    error,
    isMyTurn,
    executeAction,
    stateChanges,
  };
}
```

### Vue Composable Example

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useMatchState(matchId: string, playerId: string) {
  const matchState = ref<MatchStateResponse | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const stateChanges = ref<StateChange[]>([]);
  const previousState = ref<MatchStateResponse | null>(null);
  let pollInterval: NodeJS.Timeout | null = null;

  const poll = async () => {
    try {
      const currentState = await getMatchState(matchId, playerId);

      if (previousState.value) {
        stateChanges.value = detectStateChanges(
          previousState.value,
          currentState
        );
      }

      matchState.value = currentState;
      previousState.value = currentState;
      error.value = null;
      loading.value = false;
    } catch (err: any) {
      error.value = err.message;
      loading.value = false;
    }
  };

  const executeAction = async (
    actionType: PlayerActionType,
    actionData: Record<string, unknown>
  ) => {
    try {
      const newState = await executeAction(matchId, playerId, actionType, actionData);
      matchState.value = newState;
      previousState.value = newState;
      error.value = null;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  };

  onMounted(() => {
    poll();
    pollInterval = setInterval(() => {
      if (
        matchState.value?.state === 'PLAYER_TURN' ||
        matchState.value?.state === 'BETWEEN_TURNS'
      ) {
        poll();
      }
    }, 1500);
  });

  onUnmounted(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  const isMyTurn = computed(() => {
    return (
      matchState.value?.currentPlayer !== null &&
      matchState.value?.currentPlayer === getPlayerIdentifier(playerId)
    );
  });

  return {
    matchState,
    loading,
    error,
    isMyTurn,
    executeAction,
    stateChanges,
  };
}
```

---

## Best Practices

### 1. State Management

- **Always use server state as source of truth**
- Store previous state for comparison
- Update UI immediately after receiving new state
- Handle loading and error states gracefully

### 2. Action Validation

- **Validate actions locally before sending** (check `availableActions`)
- Show user-friendly error messages
- Disable action buttons when it's not your turn
- Re-enable buttons when turn switches to you

### 3. Polling

- **Use appropriate polling intervals** (1-2s for active, 5s for waiting)
- Implement exponential backoff for errors
- Stop polling in terminal states
- Resume polling when match becomes active

### 4. State Change Detection

- **Compare state snapshots** to detect changes
- Store previous state for comparison
- Detect all relevant changes (HP, cards, status, etc.)
- Display changes clearly to the user

### 5. Error Handling

- Handle network errors gracefully
- Show user-friendly error messages
- Retry failed requests with backoff
- Handle invalid actions gracefully

### 6. Performance

- **Cache match state** to reduce API calls
- Debounce rapid state updates
- Only poll when necessary
- Clean up intervals on unmount

### 7. User Experience

- Show loading indicators during polling
- Display state changes clearly
- Highlight available actions
- Show turn indicators clearly
- Provide feedback for all actions

---

## Summary

The match API provides:

1. ✅ **State visibility** to both players (`state`, `currentPlayer`, `turnNumber`, `phase`)
2. ✅ **Available actions** when it's your turn (`availableActions` filtered by player context)
3. ⚠️ **State changes** during opponent's turn (detected by comparing state snapshots)

**Key Points:**
- Server is the source of truth
- Poll for state updates during opponent's turn
- Compare state snapshots to detect changes
- Use `availableActions` to know what you can do
- Use `lastAction` to see what the opponent did
- Display detected changes to the user

**Next Steps:**
- Implement polling mechanism
- Implement state change detection
- Display available actions to user
- Show opponent's actions and state changes

---

**Related Documentation:**
- [MATCH-API.md](./MATCH-API.md) - Complete API reference
- [CLIENT-DECK-CACHING.md](./CLIENT-DECK-CACHING.md) - Deck caching guide
- [FRONTEND-START-GAME-RULES.md](./FRONTEND-START-GAME-RULES.md) - Start game rules

