# Client Guide: Setting Prize Cards Phase

Complete guide for implementing the SET_PRIZE_CARDS phase in the client application.

## Overview

The SET_PRIZE_CARDS phase occurs after both players have drawn their initial 7 cards and before selecting active Pokemon. During this phase, both players set their prize cards from their deck (face down). The prize card count comes from the tournament configuration (default: 6).

## Phase Flow

```
DRAWING_CARDS → SET_PRIZE_CARDS → SELECT_ACTIVE_POKEMON
```

1. **DRAWING_CARDS**: Both players draw 7 cards
2. **SET_PRIZE_CARDS**: Both players set prize cards (this phase)
3. **SELECT_ACTIVE_POKEMON**: Both players select active Pokemon

---

## State Detection

### Checking if Match is in SET_PRIZE_CARDS Phase

```typescript
// Poll for match state
const response = await fetch(`/api/v1/matches/${matchId}/state?playerId=${playerId}`);
const state = await response.json();

if (state.state === 'SET_PRIZE_CARDS') {
  // Handle SET_PRIZE_CARDS phase
}
```

### Expected State Response

```json
{
  "matchId": "match-123",
  "state": "SET_PRIZE_CARDS",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-charmander--4",
      "pokemon-base-set-v1.0-charmeleon--5",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99",
      "pokemon-base-set-v1.0-fire-energy--99"
    ],
    "handCount": 7,
    "deckCount": 53,
    "discardCount": 0,
    "discardPile": [],
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 0,
    "prizeCards": [],
    "attachedEnergy": []
  },
  "opponentState": {
    "handCount": 7,
    "deckCount": 53,
    "discardCount": 0,
    "discardPile": [],
    "activePokemon": null,
    "bench": [],
    "benchCount": 0,
    "prizeCardsRemaining": 0,
    "attachedEnergy": []
  },
  "availableActions": ["SET_PRIZE_CARDS", "CONCEDE"],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-water-starter-deck",
  "coinTossResult": "PLAYER1",
  "playerHasDrawnValidHand": true,
  "opponentHasDrawnValidHand": true
}
```

### Key Points

- **`state`**: Must be `"SET_PRIZE_CARDS"`
- **`prizeCards`**: Empty array `[]` - prize cards are hidden during this phase
- **`prizeCardsRemaining`**: `0` before setting, will be `6` (or tournament count) after
- **`availableActions`**: Contains `"SET_PRIZE_CARDS"` if player hasn't set yet, or only `"CONCEDE"` if already set
- **`deckCount`**: Shows remaining cards in deck (will decrease by prize card count after setting)

---

## Request: Setting Prize Cards

### Endpoint

```
POST /api/v1/matches/:matchId/actions
```

### Request Body

```json
{
  "playerId": "player-1",
  "actionType": "SET_PRIZE_CARDS"
}
```

**Note**: No `actionData` is required. The server automatically takes the top N cards from the deck based on the tournament's prize card count.

### TypeScript Interface

```typescript
interface SetPrizeCardsRequest {
  playerId: string;
  actionType: 'SET_PRIZE_CARDS';
  actionData?: never; // No action data needed
}
```

### Example Request

```typescript
async function setPrizeCards(matchId: string, playerId: string): Promise<Match> {
  const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
      actionType: 'SET_PRIZE_CARDS',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to set prize cards');
  }

  return await response.json();
}
```

---

## Response: After Setting Prize Cards

### Success Response

After successfully setting prize cards, the server returns the updated match state:

```json
{
  "id": "match-123",
  "tournamentId": "default-tournament",
  "player1Id": "player-1",
  "player2Id": "player-2",
  "player1DeckId": "classic-fire-starter-deck",
  "player2DeckId": "classic-water-starter-deck",
  "state": "SET_PRIZE_CARDS",
  "currentPlayer": null,
  "firstPlayer": "PLAYER1",
  "coinTossResult": "PLAYER1",
  "player1HasDrawnValidHand": true,
  "player2HasDrawnValidHand": true,
  "player1HasSetPrizeCards": true,
  "player2HasSetPrizeCards": false,
  "player1ReadyToStart": false,
  "player2ReadyToStart": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:01:00.000Z",
  "startedAt": null,
  "endedAt": null,
  "winnerId": null,
  "result": null,
  "winCondition": null,
  "cancellationReason": null
}
```

### State After Both Players Set Prize Cards

When both players have set their prize cards, the state automatically transitions to `SELECT_ACTIVE_POKEMON`. The next state poll will show:

```json
{
  "matchId": "match-123",
  "state": "SELECT_ACTIVE_POKEMON",
  "playerState": {
    "hand": [...],
    "handCount": 7,
    "deckCount": 47,  // Reduced by 6 (prize card count)
    "prizeCardsRemaining": 6,  // Now shows 6
    "prizeCards": []  // Still hidden (face down)
  },
  "opponentState": {
    "deckCount": 47,
    "prizeCardsRemaining": 6
  },
  "availableActions": ["SET_ACTIVE_POKEMON", "CONCEDE"]
}
```

---

## Error Handling

### Error Responses

#### 1. Match Not Found

```json
{
  "statusCode": 404,
  "message": "Match with ID match-123 not found",
  "error": "Not Found"
}
```

#### 2. Invalid State

```json
{
  "statusCode": 400,
  "message": "Cannot set prize cards in state SELECT_ACTIVE_POKEMON. Must be SET_PRIZE_CARDS",
  "error": "Bad Request"
}
```

#### 3. Player Not Part of Match

```json
{
  "statusCode": 400,
  "message": "Player is not part of this match",
  "error": "Bad Request"
}
```

#### 4. Already Set Prize Cards

```json
{
  "statusCode": 400,
  "message": "Player has already set prize cards. Cannot set again.",
  "error": "Bad Request"
}
```

#### 5. Not Enough Cards in Deck

```json
{
  "statusCode": 400,
  "message": "Not enough cards in deck. Need 6 prize cards, but only 3 cards remaining.",
  "error": "Bad Request"
}
```

### Error Handling Example

```typescript
async function setPrizeCards(matchId: string, playerId: string): Promise<void> {
  try {
    await fetch(`/api/v1/matches/${matchId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        actionType: 'SET_PRIZE_CARDS',
      }),
    });
  } catch (error) {
    if (error.statusCode === 400) {
      // Handle validation errors
      console.error('Cannot set prize cards:', error.message);
    } else if (error.statusCode === 404) {
      // Handle match not found
      console.error('Match not found');
    } else {
      // Handle other errors
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

---

## Client Implementation Guide

### Step 1: Detect SET_PRIZE_CARDS Phase

```typescript
function isSetPrizeCardsPhase(state: MatchStateResponse): boolean {
  return state.state === 'SET_PRIZE_CARDS';
}
```

### Step 2: Check if Player Has Set Prize Cards

```typescript
function hasPlayerSetPrizeCards(state: MatchStateResponse, playerId: string): boolean {
  // Check if SET_PRIZE_CARDS is NOT in available actions
  // If player has set prize cards, only CONCEDE will be available
  return !state.availableActions.includes('SET_PRIZE_CARDS');
}
```

### Step 3: Display UI

```typescript
function renderSetPrizeCardsPhase(state: MatchStateResponse) {
  const hasSet = !state.availableActions.includes('SET_PRIZE_CARDS');
  const prizeCardCount = 6; // Default, or get from tournament config
  
  if (hasSet) {
    return (
      <div>
        <h2>Waiting for Opponent</h2>
        <p>You have set your {prizeCardCount} prize cards.</p>
        <p>Waiting for opponent to set their prize cards...</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2>Set Prize Cards</h2>
      <p>Take the top {prizeCardCount} cards from your deck and set them as prize cards.</p>
      <p>Deck: {state.playerState.deckCount} cards remaining</p>
      <button onClick={() => handleSetPrizeCards()}>
        Set Prize Cards
      </button>
    </div>
  );
}
```

### Step 4: Handle Action

```typescript
async function handleSetPrizeCards() {
  try {
    setIsLoading(true);
    
    // Send SET_PRIZE_CARDS action
    await setPrizeCards(matchId, playerId);
    
    // Poll for updated state
    const updatedState = await pollMatchState(matchId, playerId);
    
    // Check if both players have set prize cards
    if (updatedState.state === 'SELECT_ACTIVE_POKEMON') {
      // Transition to next phase
      onPhaseChange('SELECT_ACTIVE_POKEMON');
    } else {
      // Still waiting for opponent
      setMatchState(updatedState);
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setIsLoading(false);
  }
}
```

### Step 5: Poll for State Changes

```typescript
async function pollUntilPhaseChange(
  matchId: string,
  playerId: string,
  currentPhase: string
): Promise<MatchStateResponse> {
  const pollInterval = 1000; // 1 second
  const maxPolls = 60; // 60 seconds timeout
  
  for (let i = 0; i < maxPolls; i++) {
    const state = await getMatchState(matchId, playerId);
    
    // Check if phase changed
    if (state.state !== currentPhase) {
      return state;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Timeout waiting for phase change');
}
```

---

## Complete Example Implementation

```typescript
import { useState, useEffect } from 'react';

interface MatchStateResponse {
  matchId: string;
  state: string;
  playerState: {
    hand: string[];
    handCount: number;
    deckCount: number;
    prizeCardsRemaining: number;
    prizeCards: string[];
  };
  opponentState: {
    deckCount: number;
    prizeCardsRemaining: number;
  };
  availableActions: string[];
}

function SetPrizeCardsPhase({ matchId, playerId }: { matchId: string; playerId: string }) {
  const [state, setState] = useState<MatchStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial state
  useEffect(() => {
    fetchMatchState();
  }, []);

  async function fetchMatchState() {
    try {
      const response = await fetch(`/api/v1/matches/${matchId}/state?playerId=${playerId}`);
      const data = await response.json();
      setState(data);
    } catch (err) {
      setError('Failed to fetch match state');
    }
  }

  async function handleSetPrizeCards() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/matches/${matchId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          actionType: 'SET_PRIZE_CARDS',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      // Refresh state
      await fetchMatchState();

      // Start polling if opponent hasn't set yet
      if (state?.state === 'SET_PRIZE_CARDS') {
        startPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set prize cards');
    } finally {
      setIsLoading(false);
    }
  }

  function startPolling() {
    const interval = setInterval(async () => {
      await fetchMatchState();
      
      // Stop polling if phase changed
      const currentState = await fetch(`/api/v1/matches/${matchId}/state?playerId=${playerId}`)
        .then(r => r.json());
      
      if (currentState.state !== 'SET_PRIZE_CARDS') {
        clearInterval(interval);
        setState(currentState);
      }
    }, 1000);

    // Stop polling after 60 seconds
    setTimeout(() => clearInterval(interval), 60000);
  }

  if (!state) {
    return <div>Loading...</div>;
  }

  if (state.state !== 'SET_PRIZE_CARDS') {
    return <div>Not in SET_PRIZE_CARDS phase</div>;
  }

  const hasSetPrizeCards = !state.availableActions.includes('SET_PRIZE_CARDS');
  const prizeCardCount = 6; // Default, or get from tournament

  return (
    <div className="set-prize-cards-phase">
      <h2>Set Prize Cards</h2>
      
      {error && <div className="error">{error}</div>}
      
      {hasSetPrizeCards ? (
        <div>
          <p>✓ You have set your {prizeCardCount} prize cards.</p>
          <p>Waiting for opponent to set their prize cards...</p>
          <p>Opponent deck: {state.opponentState.deckCount} cards remaining</p>
        </div>
      ) : (
        <div>
          <p>Take the top {prizeCardCount} cards from your deck and set them as prize cards.</p>
          <p>Your deck: {state.playerState.deckCount} cards remaining</p>
          <button 
            onClick={handleSetPrizeCards}
            disabled={isLoading}
          >
            {isLoading ? 'Setting...' : 'Set Prize Cards'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Visual Indicators

### UI Elements to Display

1. **Phase Title**: "Set Prize Cards"
2. **Instructions**: "Take the top N cards from your deck and set them as prize cards"
3. **Deck Count**: Show remaining cards in deck
4. **Prize Card Count**: Display the number of prize cards to set (from tournament config)
5. **Status**: 
   - If player hasn't set: Show "Set Prize Cards" button
   - If player has set: Show "Waiting for opponent..." message
6. **Opponent Status**: Show opponent's deck count (they're also setting prize cards)

### Example UI Mockup

```
┌─────────────────────────────────────┐
│      Set Prize Cards Phase          │
├─────────────────────────────────────┤
│                                     │
│  Take the top 6 cards from your    │
│  deck and set them as prize cards  │
│                                     │
│  Your Deck: 53 cards remaining     │
│                                     │
│  [ Set Prize Cards ]                │
│                                     │
│  Opponent Deck: 53 cards remaining │
│                                     │
└─────────────────────────────────────┘
```

After setting:

```
┌─────────────────────────────────────┐
│      Set Prize Cards Phase          │
├─────────────────────────────────────┤
│                                     │
│  ✓ You have set your 6 prize cards │
│                                     │
│  Waiting for opponent to set       │
│  their prize cards...               │
│                                     │
│  Your Deck: 47 cards remaining     │
│  Opponent Deck: 53 cards remaining │
│                                     │
└─────────────────────────────────────┘
```

---

## Summary

### Key Points

1. **Phase**: `SET_PRIZE_CARDS` occurs between `DRAWING_CARDS` and `SELECT_ACTIVE_POKEMON`
2. **Action**: `SET_PRIZE_CARDS` - no action data required
3. **Visibility**: Prize cards are hidden (face down) - only count is shown
4. **Automatic**: Server automatically takes top N cards from deck
5. **Transition**: Automatically moves to `SELECT_ACTIVE_POKEMON` when both players set
6. **Polling**: Poll for state changes to detect when opponent sets prize cards

### Request Flow

```
1. GET /api/v1/matches/:matchId/state?playerId=:playerId
   → Check if state === "SET_PRIZE_CARDS"
   → Check if "SET_PRIZE_CARDS" in availableActions

2. POST /api/v1/matches/:matchId/actions
   {
     "playerId": "...",
     "actionType": "SET_PRIZE_CARDS"
   }
   → Server takes top N cards from deck
   → Sets them as prize cards

3. GET /api/v1/matches/:matchId/state?playerId=:playerId
   → Poll until state changes to "SELECT_ACTIVE_POKEMON"
   → Or until opponent sets prize cards
```

### Response Changes

- **Before**: `prizeCardsRemaining: 0`, `prizeCards: []`, `deckCount: 53`
- **After**: `prizeCardsRemaining: 6`, `prizeCards: []` (still hidden), `deckCount: 47`
- **State**: Changes from `SET_PRIZE_CARDS` to `SELECT_ACTIVE_POKEMON` when both players set

