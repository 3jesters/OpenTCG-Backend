# Complete Match Flow - cURL Testing Guide

Step-by-step cURL commands to test the complete match lifecycle for both players, following the match approval flow specification.

## Prerequisites

- Backend server running on `http://localhost:3000`
- Two terminal windows (one for Player 1, one for Player 2)
- Or use the same terminal and alternate between players

## Test Data

```bash
# Constants used throughout
TOURNAMENT_ID="classic-tournament"
PLAYER1_ID="test-player-1"
PLAYER2_ID="test-player-2"
FIRE_DECK="classic-fire-starter-deck"
WATER_DECK="classic-water-starter-deck"
MATCH_ID="test-match-curl-flow"
```

---

## Stage 1: Match Creation (Player 1)

### Step 1.1: Player 1 Creates Match

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-match-curl-flow",
    "tournamentId": "classic-tournament",
    "player1Id": "test-player-1",
    "player1DeckId": "classic-fire-starter-deck"
  }' | jq
```

**Expected Response:**
```json
{
  "id": "test-match-curl-flow",
  "tournamentId": "classic-tournament",
  "player1Id": "test-player-1",
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

**Verify:**
- `state` is `"WAITING_FOR_PLAYERS"`
- `player2Id` is `null`

### Step 1.2: Player 1 Checks State (WAITING_FOR_PLAYERS)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "WAITING_FOR_PLAYERS",
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
    "deckCount": 0,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 6
  },
  "availableActions": [],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": null
}
```

**Verify:**
- `state` is `"WAITING_FOR_PLAYERS"`
- `opponentDeckId` is `null` (no opponent yet)

---

## Stage 2: Player 2 Joins

### Step 2.1: Player 2 Joins Match

**Terminal:** Player 2

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/join \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-2",
    "deckId": "classic-water-starter-deck"
  }' | jq
```

**Expected Response:**
```json
{
  "id": "test-match-curl-flow",
  "tournamentId": "classic-tournament",
  "player1Id": "test-player-1",
  "player2Id": "test-player-2",
  "player1DeckId": "classic-fire-starter-deck",
  "player2DeckId": "classic-water-starter-deck",
  "state": "DECK_VALIDATION",
  "currentPlayer": null,
  "firstPlayer": null
}
```

**Verify:**
- `state` is `"DECK_VALIDATION"`
- Both `player1Id` and `player2Id` are set
- Both deck IDs are set

### Step 2.1b: Player 1 Checks State (DECK_VALIDATION)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state'
```

**Expected Response:**
- `state` is `"DECK_VALIDATION"`

**Verify:**
- `state` is `"DECK_VALIDATION"` (decks are being validated)

### Step 2.1c: Player 2 Checks State (DECK_VALIDATION)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state'
```

**Expected Response:**
- `state` is `"DECK_VALIDATION"`

**Verify:**
- `state` is `"DECK_VALIDATION"` (decks are being validated)

### Step 2.2: Wait for Deck Validation and Check State

**Wait ~500ms** for deck validation to complete, then check state.

**Terminal:** Player 1

```bash
sleep 0.5
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
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
  "opponentDeckId": null
}
```

**Verify:**
- `state` has transitioned from `"DECK_VALIDATION"` to `"MATCH_APPROVAL"`
- `opponentDeckId` is `null` (hidden during approval)
- `availableActions` contains `"APPROVE_MATCH"`

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq
```

**Expected Response:** Same structure as Player 1, but with:
- `playerDeckId` is `"classic-water-starter-deck"`
- `opponentDeckId` is `null`

**Verify:**
- `state` is `"MATCH_APPROVAL"`
- `opponentDeckId` is `null` (hidden during approval)

---

## Stage 3: Match Approval

### Step 3.1: Player 1 Checks State (MATCH_APPROVAL)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
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
  "opponentDeckId": null
}
```

**Verify:**
- `state` is `"MATCH_APPROVAL"`
- `opponentDeckId` is `null` (hidden during approval)
- `availableActions` contains `"APPROVE_MATCH"`

### Step 3.2: Player 1 Approves Match

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-1",
    "actionType": "APPROVE_MATCH",
    "actionData": {}
  }' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "MATCH_APPROVAL",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "availableActions": ["APPROVE_MATCH"],
  "opponentDeckId": null
}
```

**Verify:**
- `state` is still `"MATCH_APPROVAL"` (waiting for player 2)
- `opponentDeckId` is still `null`

### Step 3.2b: Player 1 Checks State After Approval (Still MATCH_APPROVAL)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .opponentDeckId, .availableActions'
```

**Expected Response:**
- `state` is `"MATCH_APPROVAL"`
- `opponentDeckId` is `null`
- `availableActions` contains `"APPROVE_MATCH"`

**Verify:**
- `state` is still `"MATCH_APPROVAL"` (waiting for player 2)
- `opponentDeckId` is still `null`

### Step 3.3: Player 1 Checks State Again (Still MATCH_APPROVAL)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq
```

**Expected Response:** Same as Step 3.1 (still `MATCH_APPROVAL`, `opponentDeckId` still `null`)

### Step 3.4: Player 2 Checks State (MATCH_APPROVAL)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "MATCH_APPROVAL",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "availableActions": ["APPROVE_MATCH"],
  "playerDeckId": "classic-water-starter-deck",
  "opponentDeckId": null
}
```

**Verify:**
- `state` is `"MATCH_APPROVAL"`
- `opponentDeckId` is `null` (hidden)
- `availableActions` contains `"APPROVE_MATCH"`

### Step 3.4b: Player 2 Checks State Before Approval (MATCH_APPROVAL)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .opponentDeckId, .availableActions'
```

**Expected Response:**
- `state` is `"MATCH_APPROVAL"`
- `opponentDeckId` is `null`
- `availableActions` contains `"APPROVE_MATCH"`

**Verify:**
- `state` is `"MATCH_APPROVAL"`
- `opponentDeckId` is `null` (hidden)

### Step 3.5: Player 2 Approves Match (Triggers Coin Toss)

**Terminal:** Player 2

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-2",
    "actionType": "APPROVE_MATCH",
    "actionData": {}
  }' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "DRAWING_CARDS",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "coinTossResult": {
    "firstPlayer": "PLAYER1",
    "result": "HEADS"
  },
  "availableActions": ["DRAW_INITIAL_CARDS"],
  "playerDeckId": "classic-water-starter-deck",
  "opponentDeckId": "classic-fire-starter-deck"
}
```

**Verify:**
- `state` is now `"DRAWING_CARDS"` (coin toss happened automatically)
- `coinTossResult` is present
- `opponentDeckId` is now visible (`"classic-fire-starter-deck"`)
- `availableActions` contains `"DRAW_INITIAL_CARDS"`

### Step 3.5b: Player 2 Checks State After Approval (DRAWING_CARDS)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .opponentDeckId, .coinTossResult, .availableActions'
```

**Expected Response:**
- `state` is `"DRAWING_CARDS"`
- `opponentDeckId` is `"classic-fire-starter-deck"` (now visible)
- `coinTossResult` is present
- `availableActions` contains `"DRAW_INITIAL_CARDS"`

**Verify:**
- `state` transitioned to `"DRAWING_CARDS"`
- `opponentDeckId` is now visible

---

## Stage 4: Drawing Initial Cards

### Step 4.1: Player 2 Checks State (DRAWING_CARDS)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq
```

**Expected Response:** Same as Step 3.5 (state is `DRAWING_CARDS`, opponent deck visible)

### Step 4.2: Player 1 Checks State (DRAWING_CARDS)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "DRAWING_CARDS",
  "coinTossResult": {
    "firstPlayer": "PLAYER1",
    "result": "HEADS"
  },
  "availableActions": ["DRAW_INITIAL_CARDS"],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": "classic-water-starter-deck"
}
```

**Verify:**
- `state` is `"DRAWING_CARDS"`
- `opponentDeckId` is visible (`"classic-water-starter-deck"`)
- `coinTossResult` shows first player

### Step 4.2b: Player 1 Checks State Before Drawing (DRAWING_CARDS)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .opponentDeckId, .coinTossResult, .availableActions'
```

**Expected Response:**
- `state` is `"DRAWING_CARDS"`
- `opponentDeckId` is `"classic-water-starter-deck"` (visible)
- `coinTossResult` is present
- `availableActions` contains `"DRAW_INITIAL_CARDS"`

**Verify:**
- `state` is `"DRAWING_CARDS"`
- `opponentDeckId` is visible

### Step 4.3: Player 1 Draws Initial Cards

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-1",
    "actionType": "DRAW_INITIAL_CARDS",
    "actionData": {}
  }' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "DRAWING_CARDS",
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-charmander--46",
      "pokemon-base-set-v1.0-fire-energy--99",
      ...
    ],
    "handCount": 7,
    "deckCount": 53,
    "prizeCardsRemaining": 6
  },
  "availableActions": ["DRAW_INITIAL_CARDS"]
}
```

**Verify:**
- `state` is still `"DRAWING_CARDS"` (waiting for player 2)
- `playerState.hand.length` is 7
- `playerState.deckCount` is 53 (60 - 7)

### Step 4.3b: Player 1 Checks State After Drawing (DRAWING_CARDS)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.handCount, .playerState.deckCount'
```

**Expected Response:**
- `state` is `"DRAWING_CARDS"`
- `playerState.handCount` is 7
- `playerState.deckCount` is 53

**Verify:**
- `state` is still `"DRAWING_CARDS"` (waiting for player 2)
- Hand count is 7

### Step 4.4: Player 1 Checks State (No Change Yet)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.handCount, .opponentState.drawnCards'
```

**Expected Response:**
- `state` is `"DRAWING_CARDS"`
- `playerState.handCount` is 7
- `opponentState.drawnCards` is `undefined` (opponent hasn't drawn yet, or has valid deck)

### Step 4.4b: Player 2 Checks State Before Drawing (DRAWING_CARDS)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .availableActions'
```

**Expected Response:**
- `state` is `"DRAWING_CARDS"`
- `availableActions` contains `"DRAW_INITIAL_CARDS"`

**Verify:**
- `state` is `"DRAWING_CARDS"`
- Can still draw cards

### Step 4.5: Player 2 Draws Initial Cards

**Terminal:** Player 2

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-2",
    "actionType": "DRAW_INITIAL_CARDS",
    "actionData": {}
  }' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "SELECT_ACTIVE_POKEMON",
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-squirtle--63",
      "pokemon-base-set-v1.0-water-energy--100",
      ...
    ],
    "handCount": 7,
    "deckCount": 53,
    "prizeCardsRemaining": 6
  },
  "availableActions": ["SET_ACTIVE_POKEMON"]
}
```

**Verify:**
- `state` is now `"SELECT_ACTIVE_POKEMON"` (both players have valid decks)
- `playerState.handCount` is 7

### Step 4.5b: Player 2 Checks State After Drawing (SELECT_ACTIVE_POKEMON)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .playerState.handCount, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_ACTIVE_POKEMON"`
- `playerState.handCount` is 7
- `availableActions` contains `"SET_ACTIVE_POKEMON"`

**Verify:**
- `state` transitioned to `"SELECT_ACTIVE_POKEMON"`
- Can now set active Pokemon

### Step 4.6: Player 1 Checks State (State Changed to SELECT_ACTIVE_POKEMON)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.handCount, .opponentState.handCount, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_ACTIVE_POKEMON"`
- `playerState.handCount` is 7
- `opponentState.handCount` is 7
- `availableActions` contains `"SET_ACTIVE_POKEMON"`

---

## Stage 5: Selecting Active Pokemon

### Step 5.1: Player 2 Gets First Card from Hand

**Terminal:** Player 2

```bash
# Get the first card ID from hand
PLAYER2_CARD=$(curl -s -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq -r '.playerState.hand[0]')
echo "Player 2 will use card: $PLAYER2_CARD"
```

### Step 5.2: Player 2 Sets Active Pokemon

**Terminal:** Player 2

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"test-player-2\",
    \"actionType\": \"SET_ACTIVE_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER2_CARD\"
    }
  }" | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "SELECT_ACTIVE_POKEMON",
  "playerState": {
    "handCount": 6,
    "activePokemon": {
      "instanceId": "instance-001",
      "cardId": "pokemon-base-set-v1.0-squirtle--63",
      "position": "ACTIVE",
      "currentHp": 40,
      "maxHp": 40
    }
  },
  "availableActions": ["SET_ACTIVE_POKEMON"]
}
```

**Verify:**
- `state` is still `"SELECT_ACTIVE_POKEMON"` (waiting for player 1)
- `playerState.activePokemon` is set
- `playerState.handCount` is 6 (7 - 1)

### Step 5.2b: Player 2 Checks State After Setting Active (SELECT_ACTIVE_POKEMON)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .playerState.activePokemon != null, .opponentState.activePokemon'
```

**Expected Response:**
- `state` is `"SELECT_ACTIVE_POKEMON"`
- `playerState.activePokemon` is set (not null)
- `opponentState.activePokemon` is `null` (hidden until opponent also selects)

**Verify:**
- `state` is still `"SELECT_ACTIVE_POKEMON"` (waiting for player 1)
- Your active Pokemon is set
- Opponent's active Pokemon is still hidden

### Step 5.3: Player 1 Checks State (Opponent Active Pokemon Still Hidden)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .opponentState.activePokemon'
```

**Expected Response:**
- `state` is `"SELECT_ACTIVE_POKEMON"`
- `opponentState.activePokemon` is `null` (hidden until player 1 also selects)

### Step 5.3b: Player 1 Checks State Before Setting Active (SELECT_ACTIVE_POKEMON)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.handCount, .opponentState.activePokemon, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_ACTIVE_POKEMON"`
- `playerState.handCount` is 7
- `opponentState.activePokemon` is `null` (hidden)
- `availableActions` contains `"SET_ACTIVE_POKEMON"`

**Verify:**
- `state` is `"SELECT_ACTIVE_POKEMON"`
- Opponent's active Pokemon is still hidden

### Step 5.4: Player 1 Gets First Card from Hand

**Terminal:** Player 1

```bash
# Get the first card ID from hand
PLAYER1_CARD=$(curl -s -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq -r '.playerState.hand[0]')
echo "Player 1 will use card: $PLAYER1_CARD"
```

### Step 5.5: Player 1 Sets Active Pokemon

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"test-player-1\",
    \"actionType\": \"SET_ACTIVE_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER1_CARD\"
    }
  }" | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "SELECT_BENCH_POKEMON",
  "playerState": {
    "handCount": 6,
    "activePokemon": {
      "instanceId": "instance-002",
      "cardId": "pokemon-base-set-v1.0-charmander--46",
      "position": "ACTIVE",
      "currentHp": 50,
      "maxHp": 50
    }
  },
  "opponentState": {
    "activePokemon": {
      "instanceId": "instance-001",
      "cardId": "pokemon-base-set-v1.0-squirtle--63",
      "position": "ACTIVE",
      "currentHp": 40,
      "maxHp": 40
    }
  },
  "availableActions": ["PLAY_POKEMON", "COMPLETE_INITIAL_SETUP"]
}
```

**Verify:**
- `state` is now `"SELECT_BENCH_POKEMON"` (both players selected)
- `playerState.activePokemon` is set
- `opponentState.activePokemon` is now visible

### Step 5.5b: Player 1 Checks State After Setting Active (SELECT_BENCH_POKEMON)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.activePokemon != null, .opponentState.activePokemon != null, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `playerState.activePokemon` is set (not null)
- `opponentState.activePokemon` is now visible (not null)
- `availableActions` contains `"PLAY_POKEMON"` and `"COMPLETE_INITIAL_SETUP"`

**Verify:**
- `state` transitioned to `"SELECT_BENCH_POKEMON"`
- Both active Pokemon are now visible

### Step 5.5c: Player 2 Checks State After Both Selected Active (SELECT_BENCH_POKEMON)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .opponentState.activePokemon != null, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `opponentState.activePokemon` is now visible (not null)
- `availableActions` contains `"PLAY_POKEMON"` and `"COMPLETE_INITIAL_SETUP"`

**Verify:**
- `state` is `"SELECT_BENCH_POKEMON"`
- Opponent's active Pokemon is now visible

---

## Stage 6: Setting Bench Pokemon

### Step 6.1: Player 2 Gets Second Card from Hand

**Terminal:** Player 2

```bash
# Get the second card ID from hand (first was used for active)
PLAYER2_BENCH_CARD=$(curl -s -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq -r '.playerState.hand[1]')
echo "Player 2 will use card for bench: $PLAYER2_BENCH_CARD"
```

### Step 6.2: Player 2 Plays Pokemon to Bench

**Terminal:** Player 2

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"test-player-2\",
    \"actionType\": \"PLAY_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER2_BENCH_CARD\"
    }
  }" | jq '.state, .playerState.bench | length'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `playerState.bench.length` is 1

### Step 6.2b: Player 2 Checks State After Playing Bench (SELECT_BENCH_POKEMON)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .playerState.bench | length, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `playerState.bench.length` is 1
- `availableActions` contains `"PLAY_POKEMON"` and `"COMPLETE_INITIAL_SETUP"`

**Verify:**
- `state` is `"SELECT_BENCH_POKEMON"`
- Bench Pokemon is set

### Step 6.3: Player 2 Marks as Ready

**Terminal:** Player 2

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-2",
    "actionType": "COMPLETE_INITIAL_SETUP",
    "actionData": {}
  }' | jq '.state'
```

**Expected Response:**
- `state` is still `"SELECT_BENCH_POKEMON"` (waiting for player 1)

### Step 6.3b: Player 2 Checks State After Marking Ready (SELECT_BENCH_POKEMON)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `availableActions` contains only `"CONCEDE"` (player is ready, waiting for opponent)

**Verify:**
- `state` is still `"SELECT_BENCH_POKEMON"` (waiting for player 1)
- Only `CONCEDE` action available (ready to start)

### Step 6.4: Player 2 Checks State (Still Waiting)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state'
```

**Expected Response:** `"SELECT_BENCH_POKEMON"`

### Step 6.4b: Player 1 Checks State Before Playing Bench (SELECT_BENCH_POKEMON)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.handCount, .opponentState.activePokemon != null, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `playerState.handCount` is 6
- `opponentState.activePokemon` is visible (not null)
- `availableActions` contains `"PLAY_POKEMON"` and `"COMPLETE_INITIAL_SETUP"`

**Verify:**
- `state` is `"SELECT_BENCH_POKEMON"`
- Can play bench Pokemon or complete setup

### Step 6.5: Player 1 Gets Second Card from Hand

**Terminal:** Player 1

```bash
# Get the second card ID from hand (first was used for active)
PLAYER1_BENCH_CARD=$(curl -s -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq -r '.playerState.hand[1]')
echo "Player 1 will use card for bench: $PLAYER1_BENCH_CARD"
```

### Step 6.6: Player 1 Plays Pokemon to Bench

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"test-player-1\",
    \"actionType\": \"PLAY_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER1_BENCH_CARD\"
    }
  }" | jq '.state, .playerState.bench | length'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `playerState.bench.length` is 1

### Step 6.6b: Player 1 Checks State After Playing Bench (SELECT_BENCH_POKEMON)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .playerState.bench | length, .availableActions'
```

**Expected Response:**
- `state` is `"SELECT_BENCH_POKEMON"`
- `playerState.bench.length` is 1
- `availableActions` contains `"PLAY_POKEMON"` and `"COMPLETE_INITIAL_SETUP"`

**Verify:**
- `state` is `"SELECT_BENCH_POKEMON"`
- Bench Pokemon is set
- Can complete setup

### Step 6.7: Player 1 Marks as Ready (Match Starts!)

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-1",
    "actionType": "COMPLETE_INITIAL_SETUP",
    "actionData": {}
  }' | jq
```

**Expected Response:**
```json
{
  "matchId": "test-match-curl-flow",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 1,
  "phase": "DRAW",
  "playerState": {
    "handCount": 5,
    "activePokemon": { /* ... */ },
    "bench": [{ /* ... */ }],
    "prizeCardsRemaining": 6
  },
  "opponentState": {
    "handCount": 5,
    "activePokemon": { /* ... */ },
    "bench": [{ /* ... */ }],
    "prizeCardsRemaining": 6
  },
  "availableActions": ["DRAW_CARD", "CONCEDE"]
}
```

**Verify:**
- `state` is `"PLAYER_TURN"` (gameplay has started!)
- `currentPlayer` is `"PLAYER1"` (from coin toss)
- `turnNumber` is 1
- `phase` is `"DRAW"`
- Both players can see each other's active Pokemon and bench

### Step 6.7b: Player 1 Checks State After Completing Setup (PLAYER_TURN)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .currentPlayer, .turnNumber, .phase, .availableActions'
```

**Expected Response:**
- `state` is `"PLAYER_TURN"`
- `currentPlayer` is `"PLAYER1"`
- `turnNumber` is 1
- `phase` is `"DRAW"`
- `availableActions` contains `"DRAW_CARD"` and other actions

**Verify:**
- `state` is `"PLAYER_TURN"` (gameplay started!)
- It's your turn

### Step 6.8: Player 1 Checks State (Full Game State)

**Terminal:** Player 1

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-1"}' | jq '.state, .currentPlayer, .turnNumber, .phase, .opponentState.activePokemon != null, .opponentState.bench | length'
```

**Expected Response:**
- `state` is `"PLAYER_TURN"`
- `currentPlayer` is `"PLAYER1"`
- `turnNumber` is 1
- `phase` is `"DRAW"`
- `opponentState.activePokemon` is visible (not null)
- `opponentState.bench.length` is 1

### Step 6.9: Player 2 Checks State (Also Sees Full Game State)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .currentPlayer, .turnNumber, .opponentState.activePokemon != null, .opponentState.bench | length'
```

**Expected Response:**
- `state` is `"PLAYER_TURN"` or `"BETWEEN_TURNS"`
- `currentPlayer` is `"PLAYER1"` (not player 2's turn yet)
- `opponentState.activePokemon` is visible
- `opponentState.bench.length` is 1

---

## Stage 7: Gameplay (Optional - First Turn)

### Step 7.1: Player 1 Draws Card (First Turn)

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-1",
    "actionType": "DRAW_CARD",
    "actionData": {}
  }' | jq '.state, .phase, .playerState.handCount'
```

**Expected Response:**
- `state` is `"PLAYER_TURN"`
- `phase` is `"SETUP"` (moved from DRAW to SETUP)
- `playerState.handCount` increased by 1

### Step 7.2: Player 1 Ends Turn

**Terminal:** Player 1

```bash
curl -X POST http://localhost:3000/api/v1/matches/test-match-curl-flow/actions \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player-1",
    "actionType": "END_TURN",
    "actionData": {}
  }' | jq '.state, .currentPlayer'
```

**Expected Response:**
- `state` is `"BETWEEN_TURNS"` or `"PLAYER_TURN"`
- `currentPlayer` is `"PLAYER2"` (turn switched)

### Step 7.3: Player 2 Checks State (Now Their Turn)

**Terminal:** Player 2

```bash
curl -X POST "http://localhost:3000/api/v1/matches/test-match-curl-flow/state" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "test-player-2"}' | jq '.state, .currentPlayer, .availableActions'
```

**Expected Response:**
- `state` is `"PLAYER_TURN"`
- `currentPlayer` is `"PLAYER2"`
- `availableActions` contains actions like `"DRAW_CARD"`, `"PLAY_POKEMON"`, etc.

---

## Complete Test Script

Here's a complete bash script that automates the entire flow:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
MATCH_ID="test-match-curl-flow"
TOURNAMENT_ID="classic-tournament"
PLAYER1_ID="test-player-1"
PLAYER2_ID="test-player-2"
FIRE_DECK="classic-fire-starter-deck"
WATER_DECK="classic-water-starter-deck"

echo "=== Stage 1: Match Creation ==="
curl -s -X POST "$BASE_URL/api/v1/matches" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$MATCH_ID\",
    \"tournamentId\": \"$TOURNAMENT_ID\",
    \"player1Id\": \"$PLAYER1_ID\",
    \"player1DeckId\": \"$FIRE_DECK\"
  }" | jq '.state, .id'

echo -e "\n=== Stage 2: Player 2 Joins ==="
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/join" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"deckId\": \"$WATER_DECK\"
  }" | jq '.state'

echo -e "\n=== Waiting for deck validation... ==="
sleep 0.5

echo -e "\n=== Stage 3: Match Approval ==="
echo "Player 1 checks state:"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER1_ID\"}" | jq '.state, .opponentDeckId'

echo -e "\nPlayer 1 approves:"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"actionType\": \"APPROVE_MATCH\",
    \"actionData\": {}
  }" | jq '.state, .opponentDeckId'

echo -e "\nPlayer 2 approves (triggers coin toss):"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"actionType\": \"APPROVE_MATCH\",
    \"actionData\": {}
  }" | jq '.state, .opponentDeckId, .coinTossResult'

echo -e "\n=== Stage 4: Drawing Initial Cards ==="
echo "Player 1 draws:"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"actionType\": \"DRAW_INITIAL_CARDS\",
    \"actionData\": {}
  }" | jq '.state, .playerState.handCount'

echo -e "\nPlayer 2 draws:"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"actionType\": \"DRAW_INITIAL_CARDS\",
    \"actionData\": {}
  }" | jq '.state, .playerState.handCount'

echo -e "\n=== Stage 5: Selecting Active Pokemon ==="
PLAYER2_CARD=$(curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER2_ID\"}" | jq -r '.playerState.hand[0]')
echo "Player 2 uses card: $PLAYER2_CARD"

curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"actionType\": \"SET_ACTIVE_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER2_CARD\"
    }
  }" | jq '.state, .playerState.activePokemon != null'

PLAYER1_CARD=$(curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER1_ID\"}" | jq -r '.playerState.hand[0]')
echo "Player 1 uses card: $PLAYER1_CARD"

curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"actionType\": \"SET_ACTIVE_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER1_CARD\"
    }
  }" | jq '.state, .opponentState.activePokemon != null'

echo -e "\n=== Stage 6: Setting Bench Pokemon ==="
PLAYER2_BENCH=$(curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER2_ID\"}" | jq -r '.playerState.hand[1]')
echo "Player 2 plays bench card: $PLAYER2_BENCH"

curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"actionType\": \"PLAY_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER2_BENCH\"
    }
  }" | jq '.state'

curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER2_ID\",
    \"actionType\": \"COMPLETE_INITIAL_SETUP\",
    \"actionData\": {}
  }" | jq '.state'

PLAYER1_BENCH=$(curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER1_ID\"}" | jq -r '.playerState.hand[1]')
echo "Player 1 plays bench card: $PLAYER1_BENCH"

curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"actionType\": \"PLAY_POKEMON\",
    \"actionData\": {
      \"cardId\": \"$PLAYER1_BENCH\"
    }
  }" | jq '.state'

echo -e "\n=== Player 1 completes setup (match starts!) ==="
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/actions" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER1_ID\",
    \"actionType\": \"COMPLETE_INITIAL_SETUP\",
    \"actionData\": {}
  }" | jq '.state, .currentPlayer, .turnNumber'

echo -e "\n=== Final State Check ==="
echo "Player 1 state:"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER1_ID\"}" | jq '.state, .currentPlayer, .opponentState.activePokemon != null, .opponentState.bench | length'

echo -e "\nPlayer 2 state:"
curl -s -X POST "$BASE_URL/api/v1/matches/$MATCH_ID/state" \
  -H "Content-Type: application/json" \
  -d "{\"playerId\": \"$PLAYER2_ID\"}" | jq '.state, .currentPlayer, .opponentState.activePokemon != null, .opponentState.bench | length'

echo -e "\n✅ Complete match flow test finished!"
```

---

## Quick Reference: Expected States

| Stage | Expected State | Key Checks |
|-------|---------------|------------|
| 1. Match Creation | `WAITING_FOR_PLAYERS` | `player2Id === null` |
| 2. Player 2 Joins | `DECK_VALIDATION` | Both players assigned |
| 3. Match Approval | `MATCH_APPROVAL` | `opponentDeckId === null` |
| 4. After Both Approve | `DRAWING_CARDS` | `opponentDeckId` visible, `coinTossResult` present |
| 5. After Both Draw | `SELECT_ACTIVE_POKEMON` | Both have 7 cards |
| 6. After Both Select Active | `SELECT_BENCH_POKEMON` | `opponentState.activePokemon` visible |
| 7. After Both Complete Setup | `PLAYER_TURN` | `currentPlayer` set, `turnNumber` is 1 |

---

## Troubleshooting

### Issue: State not transitioning

**Solution:** Wait a moment and check state again. Some transitions happen asynchronously (like deck validation).

### Issue: `opponentDeckId` is null when it shouldn't be

**Solution:** 
- During `MATCH_APPROVAL`: This is expected (hidden until both approve)
- After approval: Should be visible. Check that both players approved.

### Issue: `opponentState.activePokemon` is null

**Solution:**
- During `SELECT_ACTIVE_POKEMON`: This is expected (hidden until you also select)
- After both select: Should be visible. Check that both players selected active Pokemon.

### Issue: Action returns 400 Bad Request

**Solution:**
- Check `availableActions` in state response
- Verify you're using the correct `actionType`
- Ensure `actionData` matches the expected format
- Check that it's your turn (for gameplay actions)

---

## Tips

1. **Use `jq` for pretty output:** Pipe all responses through `| jq` for readable JSON
2. **Save card IDs:** Store card IDs in variables for reuse
3. **Check state frequently:** Poll state to see when transitions happen
4. **Two terminals:** Use separate terminals for Player 1 and Player 2
5. **Watch for visibility rules:** Opponent info is hidden at specific stages

---

**Related Documentation:**
- [CLIENT-MATCH-LIFECYCLE.md](./CLIENT-MATCH-LIFECYCLE.md) - Complete lifecycle guide
- [MATCH-API.md](./MATCH-API.md) - API reference
- [CLIENT-MATCH-FLOW.md](./CLIENT-MATCH-FLOW.md) - Communication patterns

