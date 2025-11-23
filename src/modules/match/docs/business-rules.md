# Match Business Rules

## Overview

This document describes the business rules and constraints that govern match lifecycle, state transitions, and gameplay in the OpenTCG system, following Pokemon TCG rules as a baseline.

## Match Lifecycle Rules

### Match Creation

1. **Match Identity**
   - Each match must have a unique ID (UUID)
   - Each match must be associated with a tournament
   - Match is created in `CREATED` state

2. **Player Assignment**
   - Match can have zero, one, or two players assigned
   - Player 1 and Player 2 are distinct slots
   - Each player must provide a deck ID when joining
   - Once assigned, players cannot be changed

### State Machine Rules

1. **Valid State Transitions**
   - `CREATED` → `WAITING_FOR_PLAYERS` (when first player assigned)
   - `WAITING_FOR_PLAYERS` → `DECK_VALIDATION` (when both players assigned)
   - `DECK_VALIDATION` → `PRE_GAME_SETUP` (decks valid) or `CANCELLED` (decks invalid)
   - `PRE_GAME_SETUP` → `INITIAL_SETUP` (coin flip done)
   - `INITIAL_SETUP` → `PLAYER_TURN` (setup complete)
   - `PLAYER_TURN` → `BETWEEN_TURNS` (turn ended) or `MATCH_ENDED` (win condition)
   - `BETWEEN_TURNS` → `PLAYER_TURN` (next turn) or `MATCH_ENDED` (win condition)
   - Any state → `CANCELLED` (error, player leaves)
   - Any state → `MATCH_ENDED` (win condition met)

2. **Terminal States**
   - `MATCH_ENDED`: Match completed with a winner
   - `CANCELLED`: Match cancelled (cannot resume)

3. **State Transition Validation**
   - All state transitions must be validated
   - Invalid transitions throw domain exceptions
   - State machine service enforces transition rules

## Gameplay Rules

### Turn Structure

1. **Turn Phases**
   - `DRAW`: Draw 1 card (except first turn of first player)
   - `SETUP`: Play cards, attach energy, evolve, retreat
   - `ATTACK`: Declare and execute attack
   - `END`: End turn actions

2. **Phase Progression**
   - Phases must be completed in order
   - Some phases can be skipped (e.g., no attack)
   - `END` phase always occurs before turn ends

### Player Actions

1. **Valid Actions by Phase**
   - `DRAW`: `DRAW_CARD`, `END_TURN`
   - `SETUP`: `PLAY_POKEMON`, `ATTACH_ENERGY`, `PLAY_TRAINER`, `EVOLVE_POKEMON`, `RETREAT`, `USE_ABILITY`, `END_TURN`
   - `ATTACK`: `ATTACK`, `END_TURN`
   - `END`: `END_TURN`

2. **Action Validation**
   - Action must be valid for current state
   - Action must be valid for current phase
   - Must be the correct player's turn
   - Player must have required resources
   - Action must comply with game rules

3. **Always Available Actions**
   - `CONCEDE`: Can be used at any time (except in terminal states)

### Win Conditions

1. **Prize Cards**
   - Player wins by taking all 6 prize cards
   - Prize cards are set during initial setup

2. **No Pokemon**
   - Player wins if opponent has no Pokemon in play (active + bench)

3. **Deck Out**
   - Player wins if opponent cannot draw a card (deck is empty)

4. **Concede**
   - Player wins if opponent concedes

### Initial Setup Rules

1. **Setup Sequence**
   - Both players shuffle decks
   - Both players draw 7 cards
   - Both players set up basic Pokemon (face down)
   - Both players reveal and set active Pokemon
   - Both players draw 6 prize cards
   - First player draws 1 card (if going first)

2. **First Player**
   - Determined by coin flip
   - First player cannot attack on first turn
   - First player draws 1 card after setup

## Game State Rules

### Player State

1. **Deck**
   - Starts with tournament-validated deck
   - Cards are drawn from deck
   - Deck cannot be viewed by opponent

2. **Hand**
   - Maximum 7 cards at start of turn
   - No maximum during turn
   - Hand is private (opponent only sees count)

3. **Active Pokemon**
   - Exactly one active Pokemon (or null if knocked out)
   - Can retreat (switch with bench Pokemon)
   - Can have energy attached
   - Can have status effects

4. **Bench**
   - Maximum 5 Pokemon on bench
   - Bench positions are 0-4
   - Bench Pokemon can evolve
   - Bench Pokemon can have energy attached

5. **Prize Cards**
   - Exactly 6 prize cards at start
   - Prize cards are face down
   - Taking a prize card reveals it
   - Opponent sees remaining count

6. **Discard Pile**
   - All discarded cards go here
   - Discard pile is public (both players can see)
   - Order matters for some card effects

### Visibility Rules

1. **Player Sees**
   - Own hand (all cards)
   - Own deck count
   - Own discard pile (all cards)
   - Own active Pokemon (full details)
   - Own bench (all Pokemon, full details)
   - Opponent's active Pokemon (full details)
   - Opponent's bench (all Pokemon, full details)
   - Opponent's hand count (not cards)
   - Opponent's deck count
   - Opponent's discard pile (all cards)
   - Opponent's prize cards remaining count

2. **Opponent Sees**
   - Same visibility rules (from their perspective)

## Action History

1. **Action Tracking**
   - All actions are recorded in action history
   - Each action has: ID, player, type, timestamp, data
   - Action history is immutable (append-only)

2. **Replay Capability**
   - Full action history enables match replay
   - Can reconstruct game state from history
   - Useful for debugging and analysis

## Error Handling

1. **Invalid Actions**
   - Return `400 Bad Request` with error details
   - Include available actions in response
   - Do not change game state

2. **State Violations**
   - Throw domain exceptions
   - Prevent invalid state transitions
   - Maintain state consistency

3. **Resource Violations**
   - Validate resources before action
   - Check energy requirements for attacks
   - Check card availability for plays

## Tournament Integration

1. **Deck Validation**
   - Both decks must be validated against tournament rules
   - Validation happens before match starts
   - Invalid decks cancel the match

2. **Tournament Rules**
   - Match follows tournament format rules
   - Card restrictions apply during gameplay
   - Set restrictions apply during gameplay

