# Match API Documentation

This document provides comprehensive documentation for the Match API endpoints, data structures, and responses for frontend integration.

> **📘 For a complete guide on implementing match communication flow, see [CLIENT-MATCH-FLOW.md](./CLIENT-MATCH-FLOW.md)**

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Create Match](#create-match)
  - [Join Match](#join-match)
  - [Start Match](#start-match)
  - [Get Match State](#get-match-state)
  - [Execute Player Action](#execute-player-action)
- [Data Structures](#data-structures)
- [State Machine](#state-machine)
- [Player Actions](#player-actions)
- [Error Handling](#error-handling)
- [Frontend Integration Examples](#frontend-integration-examples)

## Overview

The Match API allows clients to create, join, and manage Pokemon TCG matches between two players. The API implements a state machine that tracks match progression from creation through completion, following Pokemon TCG rules as a baseline.

## Base URL

```
http://localhost:3000/api/v1/matches
```

## Authentication

Currently, no authentication is required for any endpoints.

## Endpoints

### List Matches

Get all matches, optionally filtered by tournament, player, or state.

**Endpoint:** `GET /api/v1/matches`

**Query Parameters:**
- `tournamentId` (string, optional): Filter matches by tournament ID
- `playerId` (string, optional): Filter matches by player ID
- `state` (string, optional): Filter matches by state (e.g., `WAITING_FOR_PLAYERS`, `PLAYER_TURN`, `MATCH_ENDED`)

**Examples:**
- `GET /api/v1/matches` - Get all matches
- `GET /api/v1/matches?tournamentId=classic-tournament` - Get matches for specific tournament
- `GET /api/v1/matches?tournamentId=classic-tournament&state=WAITING_FOR_PLAYERS` - Get waiting matches for tournament
- `GET /api/v1/matches?playerId=player-1` - Get all matches for a player

**Response:** `200 OK`

```json
{
  "matches": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tournamentId": "classic-tournament",
      "player1Id": "player-1",
      "player2Id": null,
      "player1DeckId": "deck-123",
      "player2DeckId": null,
      "state": "WAITING_FOR_PLAYERS",
      "currentPlayer": null,
      "firstPlayer": null,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "startedAt": null,
      "endedAt": null,
      "winnerId": null,
      "result": null,
      "winCondition": null,
      "cancellationReason": null
    }
  ],
  "count": 1
}
```

---

### Create Match

Create a new match in a tournament.

**Endpoint:** `POST /api/v1/matches`

**Request Body:**

```json
{
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player1DeckId": "deck-123"
}
```

**Request Fields:**
- `tournamentId` (string, required): Tournament ID
- `player1Id` (string, optional): Player 1 identifier
- `player1DeckId` (string, optional): Player 1's deck ID

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player2Id": null,
  "player1DeckId": "deck-123",
  "player2DeckId": null,
  "state": "WAITING_FOR_PLAYERS",
  "currentPlayer": null,
  "firstPlayer": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "startedAt": null,
  "endedAt": null,
  "winnerId": null,
  "result": null,
  "winCondition": null,
  "cancellationReason": null
}
```

**Error Response:** `400 Bad Request` (validation error)

```json
{
  "statusCode": 400,
  "message": ["tournamentId should not be empty"],
  "error": "Bad Request"
}
```

---

### Join Match

Join an existing match as the second player.

**Endpoint:** `POST /api/v1/matches/:matchId/join`

**Path Parameters:**
- `matchId` (string, required): Match ID (UUID)

**Request Body:**

```json
{
  "playerId": "player-2",
  "deckId": "deck-456"
}
```

**Request Fields:**
- `playerId` (string, required): Player identifier
- `deckId` (string, required): Player's deck ID

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player2Id": "player-2",
  "player1DeckId": "deck-123",
  "player2DeckId": "deck-456",
  "state": "DECK_VALIDATION",
  "currentPlayer": null,
  "firstPlayer": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:01.000Z",
  "startedAt": null,
  "endedAt": null,
  "winnerId": null,
  "result": null,
  "winCondition": null,
  "cancellationReason": null
}
```

**Error Response:** `404 Not Found` (match doesn't exist)

```json
{
  "statusCode": 404,
  "message": "Match with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

**Error Response:** `400 Bad Request` (match already has both players)

```json
{
  "statusCode": 400,
  "message": "Match already has both players assigned",
  "error": "Bad Request"
}
```

---

### Start Match

Start a match after coin flip determines the first player.

**Endpoint:** `POST /api/v1/matches/:matchId/start`

**Path Parameters:**
- `matchId` (string, required): Match ID (UUID)

**Request Body:**

```json
{
  "firstPlayer": "PLAYER1"
}
```

**Request Fields:**
- `firstPlayer` (string, required): First player identifier (`PLAYER1` or `PLAYER2`)

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tournamentId": "classic-tournament",
  "player1Id": "player-1",
  "player2Id": "player-2",
  "player1DeckId": "deck-123",
  "player2DeckId": "deck-456",
  "state": "INITIAL_SETUP",
  "currentPlayer": "PLAYER1",
  "firstPlayer": "PLAYER1",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:02.000Z",
  "startedAt": "2024-01-01T12:00:02.000Z",
  "endedAt": null,
  "winnerId": null,
  "result": null,
  "winCondition": null,
  "cancellationReason": null
}
```

**Error Response:** `400 Bad Request` (invalid state)

```json
{
  "statusCode": 400,
  "message": "Cannot start match in state WAITING_FOR_PLAYERS. Must be PRE_GAME_SETUP",
  "error": "Bad Request"
}
```

---

### Get Match State

Get the current match state from a player's perspective.

**Endpoint:** `GET /api/v1/matches/:matchId/state`

**Path Parameters:**
- `matchId` (string, required): Match ID (UUID)

**Query Parameters:**
- `playerId` (string, required): Player identifier

**Example:**
```
GET /api/v1/matches/550e8400-e29b-41d4-a716-446655440000/state?playerId=player-1
```

**Response:** `200 OK`

```json
{
  "matchId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 3,
  "phase": "MAIN_PHASE",
  "playerState": {
    "hand": [
      "pokemon-base-set-v1.0-pikachu--60",
      "pokemon-base-set-v1.0-fire-energy--99"
    ],
    "handCount": 2,
    "deckCount": 45,
    "discardCount": 3,
    "activePokemon": {
      "instanceId": "instance-001",
      "cardId": "pokemon-base-set-v1.0-pikachu--60",
      "position": "ACTIVE",
      "currentHp": 50,
      "maxHp": 60,
      "attachedEnergy": ["pokemon-base-set-v1.0-fire-energy--99"],
      "statusEffect": "NONE",
      "damageCounters": 10
    },
    "bench": [
      {
        "instanceId": "instance-002",
        "cardId": "pokemon-base-set-v1.0-charmander--46",
        "position": "BENCH_0",
        "currentHp": 50,
        "maxHp": 50,
        "attachedEnergy": [],
        "statusEffect": "NONE",
        "damageCounters": 0
      }
    ],
    "prizeCardsRemaining": 5,
    "attachedEnergy": ["pokemon-base-set-v1.0-fire-energy--99"]
  },
  "opponentState": {
    "handCount": 5,
    "deckCount": 42,
    "discardCount": 1,
    "activePokemon": {
      "instanceId": "instance-003",
      "cardId": "pokemon-base-set-v1.0-squirtle--63",
      "position": "ACTIVE",
      "currentHp": 30,
      "maxHp": 40,
      "attachedEnergy": ["pokemon-base-set-v1.0-water-energy--100"],
      "statusEffect": "POISONED",
      "damageCounters": 10
    },
    "bench": [
      {
        "instanceId": "instance-004",
        "cardId": "pokemon-base-set-v1.0-wartortle--42",
        "position": "BENCH_0",
        "currentHp": 60,
        "maxHp": 80,
        "attachedEnergy": [],
        "statusEffect": "NONE",
        "damageCounters": 20
      }
    ],
    "benchCount": 1,
    "prizeCardsRemaining": 6,
    "attachedEnergy": ["pokemon-base-set-v1.0-water-energy--100"]
  },
  "availableActions": [
    "PLAY_POKEMON",
    "ATTACH_ENERGY",
    "PLAY_TRAINER",
    "EVOLVE_POKEMON",
    "RETREAT",
    "USE_ABILITY",
    "END_TURN",
    "CONCEDE"
  ],
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

**Error Response:** `404 Not Found` (match or player not found)

```json
{
  "statusCode": 404,
  "message": "Player is not part of this match",
  "error": "Not Found"
}
```

---

### Execute Player Action

Execute a player action during their turn.

**Endpoint:** `POST /api/v1/matches/:matchId/actions`

**Path Parameters:**
- `matchId` (string, required): Match ID (UUID)

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

**Request Fields:**
- `playerId` (string, required): Player identifier
- `actionType` (string, required): Action type (see [Player Actions](#player-actions))
- `actionData` (object, required): Action-specific data

**Response:** `200 OK`

Returns updated match state (same format as Get Match State).

**Error Response:** `400 Bad Request` (invalid action)

```json
{
  "statusCode": 400,
  "message": "Invalid action: INVALID_PHASE",
  "error": "Bad Request"
}
```

**Error Response:** `400 Bad Request` (not player's turn)

```json
{
  "statusCode": 400,
  "message": "Invalid action: NOT_PLAYER_TURN",
  "error": "Bad Request"
}
```

---

## Data Structures

### Match Response Object

Complete match information returned by the API.

```typescript
interface MatchResponse {
  id: string;                    // UUID
  tournamentId: string;          // Tournament ID
  player1Id: string | null;      // Player 1 identifier
  player2Id: string | null;      // Player 2 identifier
  player1DeckId: string | null; // Player 1's deck ID
  player2DeckId: string | null; // Player 2's deck ID
  state: MatchState;             // Current match state
  currentPlayer: PlayerIdentifier | null; // Whose turn it is
  firstPlayer: PlayerIdentifier | null;  // Who goes first
  createdAt: string;             // ISO 8601 date string
  updatedAt: string;             // ISO 8601 date string
  startedAt: string | null;      // When match started
  endedAt: string | null;        // When match ended
  winnerId: string | null;       // Winner identifier
  result: MatchResult | null;    // Match result
  winCondition: WinCondition | null; // How match was won
  cancellationReason: string | null;  // Cancellation reason
}
```

### Match State Response Object

Match state from a player's perspective.

```typescript
interface MatchStateResponse {
  matchId: string;
  state: MatchState;
  currentPlayer: PlayerIdentifier | null;
  turnNumber: number;
  phase: TurnPhase | null;
  playerState: PlayerState;
  opponentState: OpponentState;
  availableActions: string[];
  lastAction?: ActionSummary;
}
```

### Player State Object

Full state visible to the player.

```typescript
interface PlayerState {
  hand: string[];                // Card IDs in hand
  handCount: number;             // Number of cards in hand
  deckCount: number;             // Cards remaining in deck
  discardCount: number;          // Cards in discard pile
  activePokemon: PokemonInPlay | null;
  bench: PokemonInPlay[];        // Max 5
  prizeCardsRemaining: number;    // 0-6
  attachedEnergy: string[];      // Energy attached to active
}
```

### Opponent State Object

Limited state visible to opponent (no hand cards).

```typescript
interface OpponentState {
  handCount: number;             // Number of cards (not actual cards)
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlay | null;
  bench: PokemonInPlay[];        // Visible Pokemon
  benchCount: number;
  prizeCardsRemaining: number;
  attachedEnergy: string[];      // Visible energy
}
```

### Pokemon In Play Object

Represents a Pokemon on the field.

```typescript
interface PokemonInPlay {
  instanceId: string;            // Unique instance ID
  cardId: string;                // Card identifier
  position: PokemonPosition;     // ACTIVE, BENCH_0, etc.
  currentHp: number;             // Current HP
  maxHp: number;                 // Maximum HP
  attachedEnergy: string[];      // Energy card IDs
  statusEffect: StatusEffect;    // NONE, ASLEEP, etc.
  damageCounters: number;        // Damage counters
}
```

### Action Summary Object

Summary of an action taken.

```typescript
interface ActionSummary {
  actionId: string;              // Unique action ID
  playerId: PlayerIdentifier;    // Who took the action
  actionType: PlayerActionType;  // Type of action
  timestamp: string;             // ISO 8601 date string
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

enum PlayerIdentifier {
  PLAYER1 = 'PLAYER1',
  PLAYER2 = 'PLAYER2'
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
  COMPLETE_INITIAL_SETUP = 'COMPLETE_INITIAL_SETUP',
  CONCEDE = 'CONCEDE'
}

enum PokemonPosition {
  ACTIVE = 'ACTIVE',
  BENCH_0 = 'BENCH_0',
  BENCH_1 = 'BENCH_1',
  BENCH_2 = 'BENCH_2',
  BENCH_3 = 'BENCH_3',
  BENCH_4 = 'BENCH_4'
}

enum StatusEffect {
  NONE = 'NONE',
  ASLEEP = 'ASLEEP',
  PARALYZED = 'PARALYZED',
  CONFUSED = 'CONFUSED',
  POISONED = 'POISONED',
  BURNED = 'BURNED'
}

enum MatchResult {
  PLAYER1_WIN = 'PLAYER1_WIN',
  PLAYER2_WIN = 'PLAYER2_WIN',
  DRAW = 'DRAW',
  CANCELLED = 'CANCELLED'
}

enum WinCondition {
  PRIZE_CARDS = 'PRIZE_CARDS',
  NO_POKEMON = 'NO_POKEMON',
  DECK_OUT = 'DECK_OUT',
  CONCEDE = 'CONCEDE'
}
```

---

## State Machine

### State Flow

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
  ↓ (setup complete)
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

---

## Player Actions

### Action Types and Data

#### DRAW_CARD

Draw a card from deck (usually automatic).

```json
{
  "actionType": "DRAW_CARD",
  "actionData": {}
}
```

**Valid Phases:** DRAW

#### PLAY_POKEMON

Play a Pokemon from hand to bench.

```json
{
  "actionType": "PLAY_POKEMON",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-pikachu--60",
    "position": "BENCH_0"
  }
}
```

**Valid Phases:** MAIN_PHASE

**Valid States:** INITIAL_SETUP, PLAYER_TURN (MAIN_PHASE)

#### SET_ACTIVE_POKEMON

Set active Pokemon (initial setup only).

```json
{
  "actionType": "SET_ACTIVE_POKEMON",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-pikachu--60"
  }
}
```

**Valid Phases:** INITIAL_SETUP

#### ATTACH_ENERGY

Attach energy to a Pokemon.

```json
{
  "actionType": "ATTACH_ENERGY",
  "actionData": {
    "energyCardId": "pokemon-base-set-v1.0-fire-energy--99",
    "target": "ACTIVE"
  }
}
```

**Valid Phases:** MAIN_PHASE

**Target Values:** `ACTIVE`, `BENCH_0`, `BENCH_1`, `BENCH_2`, `BENCH_3`, `BENCH_4`

#### PLAY_TRAINER

Play a trainer card.

```json
{
  "actionType": "PLAY_TRAINER",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-potion--94",
    "target": "ACTIVE"
  }
}
```

**Valid Phases:** MAIN_PHASE

#### EVOLVE_POKEMON

Evolve a Pokemon.

```json
{
  "actionType": "EVOLVE_POKEMON",
  "actionData": {
    "evolutionCardId": "pokemon-base-set-v1.0-raichu--14",
    "target": "BENCH_0"
  }
}
```

**Valid Phases:** MAIN_PHASE

#### RETREAT

Retreat active Pokemon (switch with bench).

```json
{
  "actionType": "RETREAT",
  "actionData": {
    "benchPosition": "BENCH_0"
  }
}
```

**Valid Phases:** MAIN_PHASE

#### ATTACK

Declare and execute an attack.

```json
{
  "actionType": "ATTACK",
  "actionData": {
    "attackIndex": 0,
    "target": "ACTIVE"
  }
}
```

**Valid Phases:** ATTACK

#### USE_ABILITY

Use a Pokemon ability (ACTIVATED abilities only).

```json
{
  "actionType": "USE_ABILITY",
  "actionData": {
    "cardId": "pokemon-base-set-v1.0-blastoise--2",
    "target": "ACTIVE"
  }
}
```

**Valid Phases:** MAIN_PHASE

**Required Fields:**
- `cardId`: The Pokemon card template ID
- `target`: Position of the Pokemon using the ability (`ACTIVE`, `BENCH_0`, `BENCH_1`, etc.)

**Optional Fields:**
- `pokemonInstanceId`: For disambiguation if multiple instances of the same card exist

**Notes:**
- Only ACTIVATED abilities can be used via this action
- PASSIVE abilities are always active (no action needed)
- TRIGGERED abilities activate automatically on game events
- Abilities with `ONCE_PER_TURN` usage limit can only be used once per turn
- Some abilities cannot be used if the Pokemon is Asleep, Confused, or Paralyzed

#### END_TURN

End the current turn.

```json
{
  "actionType": "END_TURN",
  "actionData": {}
}
```

**Valid Phases:** DRAW, MAIN_PHASE, ATTACK, END

#### COMPLETE_INITIAL_SETUP

Complete initial setup and start the first turn. Can only be used after setting active Pokemon.

```json
{
  "actionType": "COMPLETE_INITIAL_SETUP",
  "actionData": {}
}
```

**Valid States:** INITIAL_SETUP (after setting active Pokemon)

**Requirements:**
- Player must have set their active Pokemon
- Both players must complete initial setup before match transitions to PLAYER_TURN
- After both players complete, match transitions to PLAYER_TURN with DRAW phase

#### CONCEDE

Concede the match.

```json
{
  "actionType": "CONCEDE",
  "actionData": {}
}
```

**Valid Phases:** Any (except terminal states)

---

## Error Handling

### Standard Error Response

All errors follow this structure:

```typescript
interface ErrorResponse {
  statusCode: number;            // HTTP status code
  message: string | string[];    // Error message(s)
  error: string;                 // Error type
}
```

### Common HTTP Status Codes

- `200 OK`: Successful GET, POST, PUT request
- `201 Created`: Successful POST (match created)
- `400 Bad Request`: Validation error or invalid action
- `404 Not Found`: Match or player not found
- `409 Conflict`: State conflict (e.g., match already has players)
- `500 Internal Server Error`: Server error

### Action Validation Errors

When executing an action, validation errors may include:

- `INVALID_STATE`: Match is in wrong state
- `INVALID_PHASE`: Action not valid for current phase
- `NOT_PLAYER_TURN`: Not the player's turn
- `INSUFFICIENT_RESOURCES`: Player lacks required resources
- `INVALID_TARGET`: Invalid target for action
- `RULE_VIOLATION`: Action violates game rules
- `INVALID_ACTION`: Action is invalid

---

## Frontend Integration Examples

### TypeScript/JavaScript Examples

#### Create a Match

```typescript
async function createMatch(tournamentId: string, player1Id?: string, player1DeckId?: string) {
  const response = await fetch('http://localhost:3000/api/v1/matches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tournamentId,
      player1Id,
      player1DeckId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
const match = await createMatch('classic-tournament', 'player-1', 'deck-123');
```

#### Join a Match

```typescript
async function joinMatch(matchId: string, playerId: string, deckId: string) {
  const response = await fetch(`http://localhost:3000/api/v1/matches/${matchId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
      deckId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
const match = await joinMatch('match-id', 'player-2', 'deck-456');
```

#### Get Match State

```typescript
async function getMatchState(matchId: string, playerId: string): Promise<MatchStateResponse> {
  const response = await fetch(
    `http://localhost:3000/api/v1/matches/${matchId}/state?playerId=${playerId}`,
    {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage - Poll for state updates
const pollMatchState = async (matchId: string, playerId: string) => {
  const state = await getMatchState(matchId, playerId);
  console.log('Current state:', state.state);
  console.log('Available actions:', state.availableActions);
  console.log('Player deck ID:', state.playerDeckId);
  console.log('Opponent deck ID:', state.opponentDeckId);
  return state;
};
```

**Note:** The match state response includes `playerDeckId` and `opponentDeckId`. Use these to fetch full deck information and card details. See [CLIENT-DECK-CACHING.md](./CLIENT-DECK-CACHING.md) for a complete guide on implementing deck caching on the client side.

#### Execute Action

```typescript
async function executeAction(
  matchId: string,
  playerId: string,
  actionType: PlayerActionType,
  actionData: Record<string, unknown>
): Promise<MatchStateResponse> {
  const response = await fetch(`http://localhost:3000/api/v1/matches/${matchId}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
      actionType,
      actionData,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage - Attach energy
const newState = await executeAction(
  'match-id',
  'player-1',
  'ATTACH_ENERGY',
  {
    energyCardId: 'pokemon-base-set-v1.0-fire-energy--99',
    target: 'ACTIVE',
  }
);

// Usage - Attack
const attackState = await executeAction(
  'match-id',
  'player-1',
  'ATTACK',
  {
    attackIndex: 0,
    target: 'ACTIVE',
  }
);
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface UseMatchReturn {
  matchState: MatchStateResponse | null;
  loading: boolean;
  error: string | null;
  executeAction: (actionType: PlayerActionType, actionData: Record<string, unknown>) => Promise<void>;
  refreshState: () => Promise<void>;
}

function useMatch(matchId: string, playerId: string): UseMatchReturn {
  const [matchState, setMatchState] = useState<MatchStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = async () => {
    try {
      setLoading(true);
      const state = await getMatchState(matchId, playerId);
      setMatchState(state);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    // Poll every 2 seconds if match is active
    const interval = setInterval(() => {
      if (matchState?.state === 'PLAYER_TURN' || matchState?.state === 'BETWEEN_TURNS') {
        refreshState();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [matchId, playerId]);

  const executeAction = async (
    actionType: PlayerActionType,
    actionData: Record<string, unknown>
  ) => {
    try {
      const newState = await executeAction(matchId, playerId, actionType, actionData);
      setMatchState(newState);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { matchState, loading, error, executeAction, refreshState };
}

// Usage in component
function MatchComponent({ matchId, playerId }: { matchId: string; playerId: string }) {
  const { matchState, loading, error, executeAction } = useMatch(matchId, playerId);

  if (loading) return <div>Loading match...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!matchState) return null;

  const handleAttack = async () => {
    await executeAction('ATTACK', { attackIndex: 0, target: 'ACTIVE' });
  };

  return (
    <div>
      <h2>Match State: {matchState.state}</h2>
      <p>Turn: {matchState.turnNumber}, Phase: {matchState.phase}</p>
      {matchState.availableActions.includes('ATTACK') && (
        <button onClick={handleAttack}>Attack</button>
      )}
    </div>
  );
}
```

---

## Communication Flow

### Typical Match Flow

1. **Create Match**
   ```
   Client → POST /api/v1/matches
   Server → Returns match in CREATED/WAITING_FOR_PLAYERS state
   ```

2. **Join Match**
   ```
   Client → POST /api/v1/matches/:id/join
   Server → Returns match in DECK_VALIDATION state
   ```

3. **Start Match** (after deck validation and coin flip)
   ```
   Client → POST /api/v1/matches/:id/start
   Server → Returns match in INITIAL_SETUP state
   ```

4. **Get State & Execute Actions** (repeat until match ends)
   ```
   Client → GET /api/v1/matches/:id/state (poll for updates)
   Client → POST /api/v1/matches/:id/actions (submit action)
   Server → Returns updated match state
   ```

### Polling Strategy

- **Active Match**: Poll every 1-2 seconds
- **Waiting States**: Poll every 5 seconds
- **Terminal States**: Stop polling

### Optimistic Updates

- Client can show pending actions immediately
- Server state is authoritative
- If action fails, revert to server state

---

## Best Practices

1. **State Management**: Always use server state as source of truth
2. **Polling**: Implement exponential backoff for polling
3. **Error Handling**: Show user-friendly error messages
4. **Action Validation**: Validate actions locally before sending
5. **Reconnection**: Handle network errors and reconnect gracefully
6. **Action Queue**: Consider queuing actions if network is slow
7. **State Caching**: Cache match state to reduce API calls

---

## Additional Resources

- [Tournament API Documentation](./API.md#tournament-endpoints) - For tournament information
- [Deck API Documentation](./DECK-API.md) - For deck management
- [Match Module Documentation](../src/modules/match/README.md) - Backend module details

