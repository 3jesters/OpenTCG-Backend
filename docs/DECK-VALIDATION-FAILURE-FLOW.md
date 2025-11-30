# Deck Validation Failure Flow

This document describes what happens when deck validation fails during match setup, and what players see.

## Overview

When a match enters the `DECK_VALIDATION` state (after both players join), the system validates both decks against tournament rules. If **either** deck fails validation, the match is **cancelled**.

## State Transition

```
WAITING_FOR_PLAYERS
  ↓ (Player 2 joins)
DECK_VALIDATION
  ↓ (Validation fails)
CANCELLED ❌
```

**Note:** If validation succeeds, the match transitions to `MATCH_APPROVAL` instead.

## What Players See

### When Checking Match State

**Endpoint:** `GET /api/v1/matches/:matchId/state?playerId=:playerId`

**Response:**
```json
{
  "matchId": "match-id",
  "state": "CANCELLED",
  "currentPlayer": null,
  "turnNumber": 0,
  "phase": null,
  "playerState": {
    "hand": [],
    "handCount": 0,
    "deckCount": 0,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 0
  },
  "opponentState": {
    "handCount": 0,
    "deckCount": 0,
    "discardCount": 0,
    "activePokemon": null,
    "bench": [],
    "prizeCardsRemaining": 0
  },
  "availableActions": [],
  "playerDeckId": "classic-fire-starter-deck",
  "opponentDeckId": null,
  "coinTossResult": null,
  "playerHasDrawnValidHand": false,
  "opponentHasDrawnValidHand": false
}
```

**Key Points:**
- ✅ `state` is `"CANCELLED"`
- ✅ `availableActions` is empty array `[]` (no actions possible)
- ✅ `playerHasDrawnValidHand` and `opponentHasDrawnValidHand` are `false`
- ⚠️ `cancellationReason` is **NOT** included in state response

### When Checking Match List

**Endpoint:** `GET /api/v1/matches?playerId=:playerId`

**Response:**
```json
{
  "matches": [
    {
      "id": "match-id",
      "tournamentId": "classic-tournament",
      "player1Id": "test-player-1",
      "player2Id": "test-player-2",
      "player1DeckId": "classic-fire-starter-deck",
      "player2DeckId": "invalid-deck-id",
      "state": "CANCELLED",
      "currentPlayer": null,
      "firstPlayer": null,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:01.000Z",
      "startedAt": null,
      "endedAt": "2024-01-01T12:00:01.000Z",
      "winnerId": null,
      "result": "CANCELLED",
      "winCondition": null,
      "cancellationReason": "Deck validation failed"
    }
  ],
  "count": 1
}
```

**Key Points:**
- ✅ `state` is `"CANCELLED"`
- ✅ `result` is `"CANCELLED"`
- ✅ `cancellationReason` is `"Deck validation failed"` ⭐ **This is where players see the reason**
- ✅ `endedAt` is set (match ended when cancelled)

## Failure Scenarios

### Scenario 1: Player 2's Deck Invalid

1. Player 1 creates match with valid deck
2. Player 2 joins with invalid deck (doesn't exist, wrong size, banned cards, etc.)
3. Validation fails → Match cancelled
4. Both players see `CANCELLED` state

### Scenario 2: Player 1's Deck Invalid

1. Player 1 creates match with invalid deck
2. Player 2 joins with valid deck
3. Validation fails → Match cancelled
4. Both players see `CANCELLED` state

### Scenario 3: Both Decks Invalid

1. Player 1 creates match with invalid deck
2. Player 2 joins with invalid deck
3. Validation fails → Match cancelled
4. Both players see `CANCELLED` state

## Common Validation Failures

Deck validation can fail for various reasons:

1. **Deck Not Found**
   - Deck ID doesn't exist
   - Error: Deck not found

2. **Wrong Deck Size**
   - Deck has too few cards (e.g., < 60)
   - Deck has too many cards (e.g., > 60)
   - Error: "Deck must have exactly 60 cards but has X"

3. **Banned Sets**
   - Deck contains cards from banned sets
   - Error: "Set 'X' is banned in this tournament"

4. **Banned Cards**
   - Deck contains banned cards
   - Error: "Card X is banned in this tournament"

5. **Too Many Copies**
   - Deck has more copies of a card than allowed
   - Error: "Card X has Y copies but maximum is Z"

6. **Tournament Not Found**
   - Tournament ID doesn't exist
   - Error: Tournament not found

## Client Implementation

### Detecting Cancellation

```typescript
const state = await getMatchState(matchId, playerId);

if (state.state === 'CANCELLED') {
  // Match was cancelled
  // Get cancellation reason from match list
  const matches = await getMatches({ playerId });
  const match = matches.matches.find(m => m.id === matchId);
  
  if (match?.cancellationReason) {
    showError(`Match cancelled: ${match.cancellationReason}`);
  } else {
    showError('Match was cancelled');
  }
  
  // Disable all action buttons
  // Show "Match Cancelled" message
  // Optionally allow creating a new match
}
```

### UI Recommendations

1. **Show Clear Error Message**
   - Display: "Match cancelled: Deck validation failed"
   - Explain that one or both decks failed validation
   - Suggest checking deck validity before joining

2. **Disable Actions**
   - Hide all action buttons
   - Show match as "Cancelled" or "Failed"
   - Optionally show a "Create New Match" button

3. **Show Match History**
   - In match list, show cancelled matches with reason
   - Filter out cancelled matches if desired
   - Allow viewing details of cancelled matches

## Testing

See `test/match-deck-validation-failure.e2e-spec.ts` for complete test scenarios.

### Test Cases

1. ✅ Player 2 has invalid deck → Match cancelled
2. ✅ Player 1 has invalid deck → Match cancelled
3. ✅ Both players have invalid decks → Match cancelled
4. ✅ Both players see `CANCELLED` state
5. ✅ Cancellation reason visible in match list
6. ✅ No actions available in cancelled state

## API Summary

| Endpoint | State Response | Match List Response |
|----------|---------------|---------------------|
| **State** | `state: "CANCELLED"`<br>`availableActions: []` | N/A |
| **Match List** | N/A | `state: "CANCELLED"`<br>`result: "CANCELLED"`<br>`cancellationReason: "Deck validation failed"` |

## Important Notes

1. **Terminal State**: `CANCELLED` is a terminal state - match cannot be resumed
2. **No Actions**: No actions are available in `CANCELLED` state
3. **Reason Location**: Cancellation reason is only in match list response, not state response
4. **Both Players**: Both players see the same cancelled state
5. **Automatic**: Cancellation happens automatically after validation fails

---

**Related Documentation:**
- [MATCH-API.md](./MATCH-API.md) - Complete API reference
- [CLIENT-MATCH-LIFECYCLE.md](./CLIENT-MATCH-LIFECYCLE.md) - Happy path flow
- [DECK-API.md](./DECK-API.md) - Deck validation details

