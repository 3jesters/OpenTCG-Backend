# Match Domain Model

## Overview

The Match module manages the complete lifecycle of a Pokemon TCG match between two players, including state machine management, game state tracking, and action processing.

## Core Entities

### Match

The main aggregate root representing a match between two players.

**Identity & Metadata:**
- `id`: Unique match identifier (UUID)
- `tournamentId`: Tournament reference
- `createdAt`: Timestamp when match was created
- `updatedAt`: Timestamp of last modification

**Players:**
- `player1Id`: Player 1 identifier (or null)
- `player2Id`: Player 2 identifier (or null)
- `player1DeckId`: Player 1's deck ID (or null)
- `player2DeckId`: Player 2's deck ID (or null)

**State Machine:**
- `state`: Current match state (MatchState enum)
- `currentPlayer`: Whose turn it is (PlayerIdentifier or null)
- `firstPlayer`: Who goes first (PlayerIdentifier or null)

**Match Result:**
- `startedAt`: When match started (or null)
- `endedAt`: When match ended (or null)
- `winnerId`: Winner identifier (or null)
- `result`: Match result (MatchResult or null)
- `winCondition`: How match was won (WinCondition or null)
- `cancellationReason`: Reason for cancellation (or null)

**Game State:**
- `gameState`: Complete game state (GameState value object or null)

## Value Objects

### GameState

Represents the complete game state of a match.

**Properties:**
- `player1State`: Player 1's game state
- `player2State`: Player 2's game state
- `turnNumber`: Current turn number (starts at 1)
- `phase`: Current phase of the turn (TurnPhase enum)
- `currentPlayer`: Whose turn it is (PlayerIdentifier enum)
- `lastAction`: Last action taken (ActionSummary or null)
- `actionHistory`: Complete history of actions

### PlayerGameState

Represents the game state for a single player.

**Properties:**
- `deck`: Array of card IDs remaining in deck
- `hand`: Array of card IDs in hand
- `activePokemon`: Active Pokemon (CardInstance or null)
- `bench`: Array of benched Pokemon (max 5, CardInstance[])
- `prizeCards`: Array of prize card IDs (6 initially)
- `discardPile`: Array of discarded card IDs

### CardInstance

Represents a card that is in play during a match.

**Properties:**
- `instanceId`: Unique instance ID (UUID)
- `cardId`: Card identifier
- `position`: Position on field (PokemonPosition enum)
- `currentHp`: Current HP (can be less than max)
- `maxHp`: Maximum HP from card
- `attachedEnergy`: Array of energy card IDs attached
- `statusEffect`: Current status condition (StatusEffect enum)
- `damageCounters`: Number of damage counters

### ActionSummary

Represents a summary of an action taken during a match.

**Properties:**
- `actionId`: Unique action ID (UUID)
- `playerId`: Who took the action (PlayerIdentifier enum)
- `actionType`: Type of action (PlayerActionType enum)
- `timestamp`: When the action occurred
- `actionData`: Action-specific data (Record<string, unknown>)

## Enums

### MatchState

Represents the current state of a match in the state machine:
- `CREATED`: Match created, no players assigned
- `WAITING_FOR_PLAYERS`: Waiting for players to join
- `DECK_VALIDATION`: Validating both player decks
- `PRE_GAME_SETUP`: Coin flip, determine first player
- `INITIAL_SETUP`: Initial game setup (shuffle, draw, set Pokemon)
- `PLAYER_TURN`: Active player's turn
- `BETWEEN_TURNS`: Processing between-turn effects
- `MATCH_ENDED`: Match completed
- `CANCELLED`: Match cancelled

### TurnPhase

Represents the current phase within a player's turn:
- `DRAW`: Draw phase
- `MAIN_PHASE`: Main phase (play cards, attach energy, evolve, retreat, attack)
- `ATTACK`: Attack phase
- `END`: End phase

### MatchResult

Represents the final result of a match:
- `PLAYER1_WIN`: Player 1 won
- `PLAYER2_WIN`: Player 2 won
- `DRAW`: Match ended in a draw
- `CANCELLED`: Match was cancelled

### PlayerIdentifier

Identifies which player in the match:
- `PLAYER1`: First player
- `PLAYER2`: Second player

### PlayerActionType

Represents all possible actions a player can take:
- `DRAW_CARD`: Draw a card
- `PLAY_POKEMON`: Play Pokemon to bench
- `SET_ACTIVE_POKEMON`: Set active Pokemon
- `ATTACH_ENERGY`: Attach energy to Pokemon
- `PLAY_TRAINER`: Play trainer card
- `EVOLVE_POKEMON`: Evolve Pokemon
- `RETREAT`: Retreat active Pokemon
- `ATTACK`: Declare and execute attack
- `USE_ABILITY`: Use Pokemon ability
- `END_TURN`: End current turn
- `CONCEDE`: Concede match

### PokemonPosition

Represents the position of a Pokemon on the field:
- `ACTIVE`: Active position
- `BENCH_0` through `BENCH_4`: Bench positions (0-4)

### WinCondition

Represents how a match was won:
- `PRIZE_CARDS`: Took all 6 prize cards
- `NO_POKEMON`: Opponent has no Pokemon
- `DECK_OUT`: Opponent cannot draw
- `CONCEDE`: Opponent conceded

### StatusEffect

Represents status conditions that can affect a Pokemon:
- `NONE`: No status effect
- `ASLEEP`: Asleep
- `PARALYZED`: Paralyzed
- `CONFUSED`: Confused
- `POISONED`: Poisoned
- `BURNED`: Burned

### ActionValidationError

Represents types of validation errors for player actions:
- `INVALID_STATE`: Match is in wrong state
- `INVALID_PHASE`: Action not valid for current phase
- `NOT_PLAYER_TURN`: Not the player's turn
- `INSUFFICIENT_RESOURCES`: Player lacks required resources
- `INVALID_TARGET`: Invalid target for action
- `RULE_VIOLATION`: Action violates game rules
- `INVALID_ACTION`: Action is invalid

## Domain Relationships

```
Match (Aggregate Root)
├── GameState (Value Object)
│   ├── PlayerGameState (Value Object) [Player 1]
│   │   ├── CardInstance[] (Value Objects) [Active + Bench]
│   │   └── string[] [Deck, Hand, Prize Cards, Discard]
│   ├── PlayerGameState (Value Object) [Player 2]
│   │   ├── CardInstance[] (Value Objects) [Active + Bench]
│   │   └── string[] [Deck, Hand, Prize Cards, Discard]
│   └── ActionSummary[] (Value Objects) [Action History]
├── MatchState (Enum)
├── TurnPhase (Enum)
├── PlayerIdentifier (Enum)
├── MatchResult (Enum)
└── WinCondition (Enum)
```

## Domain Services

### MatchStateMachineService

Handles state transitions and validation for the match state machine.

**Responsibilities:**
- Validate state transitions
- Validate player actions
- Determine next phase
- Check win conditions
- Get available actions

**Methods:**
- `canTransition(fromState, toState)`: Check if transition is valid
- `validateAction(state, phase, actionType, currentPlayer, playerId)`: Validate action
- `getNextPhase(currentPhase, actionType)`: Get next phase
- `checkWinConditions(player1State, player2State)`: Check win conditions
- `getAvailableActions(state, phase)`: Get available actions

## Business Rules

### State Machine Rules

1. **Terminal States**
   - `MATCH_ENDED` and `CANCELLED` cannot transition to other states
   - Once in terminal state, match is immutable

2. **State Transitions**
   - All transitions must be validated
   - Invalid transitions throw domain exceptions
   - State machine service enforces rules

3. **Player Assignment**
   - Players can only be assigned in `CREATED` or `WAITING_FOR_PLAYERS` states
   - Once assigned, players cannot be changed

### Game State Rules

1. **Immutable State**
   - Game state is immutable
   - New state created on each action
   - Action history is append-only

2. **Player State**
   - Bench maximum: 5 Pokemon
   - Prize cards: 6 initially
   - Hand: No maximum (but 7 at start of turn)

3. **Visibility**
   - Player sees own full state
   - Player sees opponent's limited state (no hand cards)

### Action Rules

1. **Action Validation**
   - Must be valid for current state
   - Must be valid for current phase
   - Must be player's turn
   - Must have required resources

2. **Action History**
   - All actions recorded
   - History is immutable
   - Enables replay capability

## Repository Interface

### IMatchRepository

Defines contract for match persistence.

**Methods:**
- `findById(id)`: Find match by ID
- `findAll(tournamentId?, playerId?)`: Find all matches (optional filters)
- `save(match)`: Save match (create or update)
- `delete(id)`: Delete match
- `exists(id)`: Check if match exists
- `findActiveMatchesByPlayer(playerId)`: Find active matches for player

## Dependencies

- **Deck Module**: For deck validation
- **Tournament Module**: For tournament rules
- **Card Module**: For card data and rules

