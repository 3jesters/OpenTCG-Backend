# Match Use Cases

This document describes the application use cases for the Match module.

## Use Case 1: Create Match

**Actor**: Tournament Organizer, System

**Preconditions**:
- Tournament exists
- Optional: Player 1 and deck ready

**Main Flow**:
1. User creates match with tournament ID
2. Optionally provides player 1 ID and deck ID
3. System creates match entity in `CREATED` state
4. If player 1 provided, assigns player 1 to match
5. System returns created match

**Postconditions**:
- Match exists in `CREATED` or `WAITING_FOR_PLAYERS` state
- Player 1 optionally assigned

**Error Cases**:
- Tournament not found → NotFoundException
- Invalid tournament ID → BadRequestException

## Use Case 2: Join Match

**Actor**: Player

**Preconditions**:
- Match exists
- Match is in `CREATED` or `WAITING_FOR_PLAYERS` state
- Player has a valid deck

**Main Flow**:
1. Player provides match ID, player ID, and deck ID
2. System finds match
3. System determines available player slot (PLAYER1 or PLAYER2)
4. System assigns player to match
5. If both players now assigned, transition to `DECK_VALIDATION`
6. System returns updated match

**Postconditions**:
- Player assigned to match
- Match in `WAITING_FOR_PLAYERS` or `DECK_VALIDATION` state

**Error Cases**:
- Match not found → NotFoundException
- Match already has both players → BadRequestException
- Match in invalid state → BadRequestException

## Use Case 2.5: Approve Match

**Actor**: Player

**Preconditions**:
- Match exists
- Match is in `MATCH_APPROVAL` state
- Both players assigned
- Decks validated

**Main Flow**:
1. Player submits `APPROVE_MATCH` action
2. System marks player as approved
3. If both players have approved:
   - System automatically performs coin toss
   - System transitions match to `DRAWING_CARDS` state
4. System returns updated match state

**Postconditions**:
- Player marked as approved
- If both approved: Match in `DRAWING_CARDS` state (after coin toss)
- Otherwise: Match remains in `MATCH_APPROVAL` state

**Error Cases**:
- Match not found → NotFoundException
- Match in invalid state → BadRequestException
- Player already approved → BadRequestException

**Privacy Rules**:
- During `MATCH_APPROVAL` state, `opponentDeckId` is hidden (returns `null`)
- Only after both players approve, `opponentDeckId` is revealed
- Players should cache opponent deck information after approval is complete

**Note**: This use case is automatically triggered after deck validation completes successfully. Both players must approve before the coin toss occurs.

## Use Case 3: Perform Coin Toss

**Actor**: System

**Preconditions**:
- Match exists
- Match is in `PRE_GAME_SETUP` state
- Both players assigned
- Decks validated

**Main Flow**:
1. System automatically performs coin toss (deterministic based on match ID)
2. System determines first player (PLAYER1 or PLAYER2)
3. System sets coin toss result and first player
4. System transitions match to `DRAWING_CARDS` state
5. System returns updated match

**Postconditions**:
- Match in `DRAWING_CARDS` state
- Coin toss result determined (same for both players)
- First player set

**Error Cases**:
- Match not found → NotFoundException
- Match in invalid state → BadRequestException

**Note**: This use case is automatically triggered after both players approve the match (in `MATCH_APPROVAL` state). The coin toss happens automatically when the second player approves.

## Use Case 4: Draw Initial Cards

**Actor**: Player

**Preconditions**:
- Match exists
- Match is in `DRAWING_CARDS` state
- Player is part of match
- Player has not yet drawn valid cards (or needs to redraw)

**Main Flow**:
1. Player clicks "Draw Cards" button
2. System loads player's deck
3. System shuffles deck (if first draw) or reshuffles (if redraw)
4. System draws 7 cards
5. System validates hand against start game rules
6. If invalid:
   - System returns drawn cards
   - Match stays in `DRAWING_CARDS` state
   - Opponent can see drawn cards (if they've already drawn)
7. If valid:
   - System marks player's deck as valid
   - System updates game state with drawn cards
   - If both players have valid decks, transition to `SELECT_ACTIVE_POKEMON`
   - Otherwise, match stays in `DRAWING_CARDS` state
8. System returns drawn cards, validity status, and next state

**Postconditions**:
- Player's hand updated with 7 cards
- Player's deck validity status updated
- Match may transition to `SELECT_ACTIVE_POKEMON` if both players ready

**Error Cases**:
- Match not found → NotFoundException
- Match in invalid state → BadRequestException
- Player not part of match → BadRequestException

## Use Case 5: Get Match State

**Actor**: Player

**Preconditions**:
- Match exists
- Player is part of match

**Main Flow**:
1. Player requests match state with match ID and player ID
2. System finds match
3. System verifies player is part of match
4. System returns match state from player's perspective

**Postconditions**:
- Player receives current match state
- State includes player's view and opponent's limited view

**Error Cases**:
- Match not found → NotFoundException
- Player not part of match → NotFoundException

## Use Case 6: Execute Turn Action

**Actor**: Player

**Preconditions**:
- Match exists
- Match is in playable state (`PLAYER_TURN`, `DRAWING_CARDS`, `SELECT_ACTIVE_POKEMON`, `SELECT_BENCH_POKEMON`, or `INITIAL_SETUP`)
- Action is valid for current state
- Player has required resources

**Main Flow**:
1. Player submits action (type + data)
2. System validates action:
   - State check
   - Phase check (if applicable)
   - Player turn check (if applicable)
   - Resource check
   - Rule check
3. System executes action:
   - `DRAW_INITIAL_CARDS`: Draws and validates initial 7 cards
   - `SET_ACTIVE_POKEMON`: Sets active Pokemon (in SELECT_ACTIVE_POKEMON state)
   - `PLAY_POKEMON`: Plays Pokemon to bench (in SELECT_BENCH_POKEMON state)
   - `COMPLETE_INITIAL_SETUP`: Marks player ready (in SELECT_BENCH_POKEMON state)
   - Other actions: Standard gameplay actions
4. System updates game state
5. System checks state transitions:
   - If both players have valid decks → transition to SELECT_ACTIVE_POKEMON
   - If both players selected active → transition to SELECT_BENCH_POKEMON
   - If both players ready → transition to PLAYER_TURN
6. System checks win conditions
7. If win condition met, end match
8. System returns updated match state

**Postconditions**:
- Game state updated
- Action recorded in history
- Match may transition to new state

**Error Cases**:
- Match not found → NotFoundException
- Invalid action → BadRequestException
- Not player's turn → BadRequestException
- Insufficient resources → BadRequestException
- Rule violation → BadRequestException

**Action Types**:
- `APPROVE_MATCH`: Approve match to proceed (MATCH_APPROVAL state)
- `DRAW_INITIAL_CARDS`: Draw initial 7 cards (DRAWING_CARDS state)
- `DRAW_CARD`: Draw 1 card from deck (PLAYER_TURN)
- `PLAY_POKEMON`: Play Pokemon from hand to bench
- `SET_ACTIVE_POKEMON`: Set active Pokemon (SELECT_ACTIVE_POKEMON or INITIAL_SETUP)
- `ATTACH_ENERGY`: Attach energy to Pokemon
- `PLAY_TRAINER`: Play trainer card
- `EVOLVE_POKEMON`: Evolve Pokemon
- `RETREAT`: Retreat active Pokemon
- `ATTACK`: Declare and execute attack
- `USE_ABILITY`: Use Pokemon ability
- `END_TURN`: End current turn
- `COMPLETE_INITIAL_SETUP`: Mark ready to start (SELECT_BENCH_POKEMON)
- `CONCEDE`: Concede match

## Use Case 7: End Match

**Actor**: System (typically called by game logic)

**Preconditions**:
- Match exists
- Win condition met

**Main Flow**:
1. System determines winner
2. System determines win condition
3. System ends match with result
4. System records match result
5. System returns ended match

**Postconditions**:
- Match in `MATCH_ENDED` state
- Winner determined
- Result recorded

**Error Cases**:
- Match not found → NotFoundException
- Match already ended → BadRequestException

## Use Case 8: Validate Decks

**Actor**: System

**Preconditions**:
- Match exists
- Match is in `DECK_VALIDATION` state
- Both players assigned with decks

**Main Flow**:
1. System retrieves tournament rules
2. System validates player 1's deck
3. System validates player 2's deck
4. If both valid, transition to `PRE_GAME_SETUP`
5. If invalid, cancel match
6. After successful validation, automatically trigger coin toss

**Postconditions**:
- Match in `DRAWING_CARDS` state (after coin toss) or `CANCELLED` state

**Note**: This use case automatically triggers coin toss after successful validation.

## Use Case 9: Process Between Turns (Future)

**Actor**: System

**Preconditions**:
- Match exists
- Match is in `BETWEEN_TURNS` state

**Main Flow**:
1. System processes status effects (poison, burn)
2. System triggers BETWEEN_TURNS abilities
3. System checks win conditions
4. If win condition met, end match
5. Otherwise, transition to next player's turn

**Postconditions**:
- Match in `PLAYER_TURN` or `MATCH_ENDED` state
- Status effects processed

## Communication Flow

### Client-Server Interaction

1. **Client Polls State**
   - Client: `GET /api/v1/matches/:matchId/state?playerId=xxx`
   - Server: Returns current match state

2. **Client Submits Action**
   - Client: `POST /api/v1/matches/:matchId/actions`
   - Server: Validates, executes, returns updated state

3. **Repeat Until Match Ends**

### State Synchronization

- Server is source of truth
- Client displays server state
- Optimistic updates possible, but server state wins
- Action validation prevents invalid states

