# Test Scripts

## test-match-flow.sh

Simulates a complete match flow from creation through card dealing.

### Usage

```bash
# Create a new match and run full flow
./scripts/test-match-flow.sh

# Use an existing match (by ID)
./scripts/test-match-flow.sh a7d7c7f8-fce1-4d53-bd01-4434c1a0e788
```

### What It Does

1. **Creates or uses existing match** - Creates a new match or uses provided match ID
2. **Joins players** - Ensures both players are assigned to the match
3. **Waits for deck validation** - Automatically validates decks and waits for PRE_GAME_SETUP
4. **Starts match** - Performs coin flip (Player 1 goes first) and deals cards
5. **Verifies card dealing** - Checks that:
   - Each player has 7 cards in hand
   - Each player has 6 prize cards
   - Decks are shuffled and remaining cards are in deck
6. **Shows game state** - Displays full match state including hands, decks, and prize cards

### Expected Output

The script will show:
- Match creation/retrieval
- Player joining
- Deck validation status
- Match start (coin flip)
- Game state with cards dealt
- Summary of cards in hand, deck, and prize cards

### Prerequisites

- Server running on `http://localhost:3000`
- `jq` installed (for JSON parsing)
- `curl` installed
- Decks exist: `classic-fire-starter-deck` and `classic-grass-starter-deck`
- Tournament exists: `classic-tournament`

### Example Output

```
==========================================
Match Flow Test Script
==========================================

[STEP] Step 1: Creating new match...
[SUCCESS] Match created: 550e8400-e29b-41d4-a716-446655440000
  State: WAITING_FOR_PLAYERS
  Player 1: player-1

[STEP] Step 2b: Player 2 joining match...
[SUCCESS] Player 2 joined
  State: DECK_VALIDATION
  Player 1: player-1
  Player 2: player-2

[STEP] Step 3: Waiting for deck validation...
[SUCCESS] Decks validated successfully
  State: PRE_GAME_SETUP

[STEP] Step 4: Starting match (coin flip - Player 1 goes first)...
[SUCCESS] Match started
  State: INITIAL_SETUP
  First Player: PLAYER1

[STEP] Step 5: Checking game state - cards should be dealt...

==========================================
Game State Summary
==========================================
Match State: INITIAL_SETUP
Turn Number: 1
Phase: DRAW

Player 1 (player-1):
  Hand: 7 cards
  Deck: 40 cards remaining
  Prize Cards: 6 remaining

Player 2 (player-2):
  Hand: 7 cards
  Deck: 40 cards remaining
  Prize Cards: 6 remaining

[SUCCESS] ✓ Both players have 7 cards in hand
[SUCCESS] ✓ Both players have 6 prize cards
```

