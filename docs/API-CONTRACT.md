# OpenTCG API Contract

Complete REST API reference for all OpenTCG backend endpoints.

## Table of Contents

- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Card API](#card-api)
- [Deck API](#deck-api)
- [Match API](#match-api)
- [Error Handling](#error-handling)

---

## Overview

The OpenTCG backend provides REST APIs for:
- **Card Management**: Loading, querying, and searching trading card data
- **Deck Management**: Creating, managing, and validating player decks
- **Match Management**: Creating, joining, and managing Pokemon TCG matches

---

## Base URLs

```
Card API:    http://localhost:3000/api/v1/cards
Deck API:    http://localhost:3000/api/v1/decks
Match API:   http://localhost:3000/api/v1/matches
```

## Authentication

Currently, no authentication is required for any endpoints.

---

## Card API

### Load Cards

Load card sets from JSON files into memory.

**Endpoint:** `POST /api/v1/cards/load`

**Request Body:**
```json
{
  "sets": [
    {
      "author": "pokemon",
      "setName": "Base Set",
      "version": "1.0"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "totalLoaded": 102,
  "results": [
    {
      "success": true,
      "author": "pokemon",
      "setName": "Base Set",
      "version": "1.0",
      "loaded": 102,
      "filename": "pokemon-Base Set-v1.0.json"
    }
  ]
}
```

**Error Response:** `409 Conflict` (if set is already loaded)

---

### List Available Sets

Get a list of all loaded card sets.

**Endpoint:** `GET /api/v1/cards/sets`

**Query Parameters:**
- `author` (string, optional): Filter by author (e.g., "pokemon")
- `official` (boolean, optional): Filter by official status

**Response:** `200 OK`
```json
{
  "sets": [
    {
      "author": "pokemon",
      "setName": "Base Set",
      "setIdentifier": "base-set",
      "version": "1.0",
      "totalCards": 102,
      "official": true,
      "dateReleased": "1999-01-09",
      "description": "The original Pokémon TCG set that started it all",
      "loadedAt": "2025-11-19T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Get Cards from Set

Get all cards from a specific set.

**Endpoint:** `GET /api/v1/cards/sets/:author/:setName/v:version`

**Path Parameters:**
- `author` (string, required): Author of the set (e.g., "pokemon")
- `setName` (string, required): Name of the set (e.g., "Base Set")
- `version` (string, required): Version number (e.g., "1.0")

**Response:** `200 OK`
```json
{
  "set": {
    "author": "pokemon",
    "setName": "Base Set",
    "setIdentifier": "base-set",
    "version": "1.0",
    "totalCards": 102,
    "official": true,
    "dateReleased": "1999-01-09",
    "description": "The original Pokémon TCG set",
    "loadedAt": "2025-11-19T10:30:00.000Z"
  },
  "cards": [
    {
      "cardId": "pokemon-base-set-v1.0-alakazam-1",
      "instanceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Alakazam",
      "cardNumber": "1",
      "setName": "Base Set",
      "cardType": "POKEMON",
      "pokemonType": "PSYCHIC",
      "rarity": "RARE_HOLO",
      "hp": 80,
      "imageUrl": ""
    }
  ],
  "count": 102
}
```

---

### Get Single Card

Get detailed information about a specific card.

**Endpoint:** `GET /api/v1/cards/:cardId`

**Response:** `200 OK`
```json
{
  "cardId": "pokemon-base-set-v1.0-alakazam-1",
  "instanceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Alakazam",
  "pokemonNumber": "065",
  "cardNumber": "1",
  "setName": "Base Set",
  "cardType": "POKEMON",
  "pokemonType": "PSYCHIC",
  "rarity": "RARE_HOLO",
  "hp": 80,
  "stage": "STAGE_2",
  "evolvesFrom": "Kadabra",
  "ability": {
    "name": "Damage Swap",
    "text": "As often as you like during your turn (before your attack)...",
    "activationType": "ACTIVATED",
    "usageLimit": "UNLIMITED"
  },
  "attacks": [
    {
      "name": "Confuse Ray",
      "energyCost": ["PSYCHIC", "PSYCHIC", "PSYCHIC"],
      "damage": "30",
      "text": "Flip a coin. If heads, the Defending Pokémon is now Confused."
    }
  ],
  "weakness": {
    "type": "PSYCHIC",
    "modifier": "×2"
  },
  "retreatCost": 3,
  "artist": "Ken Sugimori",
  "description": "Its brain can outperform a supercomputer.",
  "imageUrl": ""
}
```

---

### Search Cards

Search and filter cards with pagination.

**Endpoint:** `GET /api/v1/cards/search`

**Query Parameters:**
- `query` (string, optional): Search by card name (case insensitive)
- `cardType` (CardType, optional): Filter by card type
- `pokemonType` (PokemonType, optional): Filter by Pokémon type
- `author` (string, optional): Filter by author
- `rarity` (Rarity, optional): Filter by rarity
- `limit` (number, optional): Results per page (default: 50, max: 500)
- `offset` (number, optional): Number of results to skip (default: 0)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "cardId": "pokemon-base-set-v1.0-alakazam-1",
      "instanceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Alakazam",
      "cardNumber": "1",
      "setName": "Base Set",
      "cardType": "POKEMON",
      "pokemonType": "PSYCHIC",
      "rarity": "RARE_HOLO",
      "hp": 80,
      "imageUrl": ""
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

---

## Deck API

### Create Deck

Create a new deck with cards.

**Endpoint:** `POST /api/v1/decks`

**Request Body:**
```json
{
  "name": "My Pikachu Deck",
  "createdBy": "player-1",
  "tournamentId": "classic-tournament",
  "cards": [
    {
      "cardId": "pokemon-base-set-v1.0-pikachu--60",
      "setName": "base-set",
      "quantity": 4
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Pikachu Deck",
  "createdBy": "player-1",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "tournamentId": "classic-tournament",
  "isValid": false,
  "cards": [
    {
      "cardId": "pokemon-base-set-v1.0-pikachu--60",
      "setName": "base-set",
      "quantity": 4
    }
  ],
  "totalCards": 4
}
```

---

### List Decks

Get all decks, optionally filtered by tournament.

**Endpoint:** `GET /api/v1/decks`

**Query Parameters:**
- `tournamentId` (string, optional): Filter decks by tournament ID

**Response:** `200 OK`
```json
{
  "decks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Pikachu Deck",
      "createdBy": "player-1",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "tournamentId": "classic-tournament",
      "isValid": true,
      "cards": [
        {
          "cardId": "pokemon-base-set-v1.0-pikachu--60",
          "setName": "base-set",
          "quantity": 4
        }
      ],
      "totalCards": 60
    }
  ],
  "count": 1
}
```

---

### Get Deck Cards

Get just the list of cards (with quantities) for a specific deck.

**Endpoint:** `GET /api/v1/decks/:id/cards`

**Response:** `200 OK`
```json
[
  {
    "cardId": "pokemon-base-set-v1.0-charmander--46",
    "setName": "base-set",
    "quantity": 4
  }
]
```

---

### Get Deck by ID

Retrieve a specific deck by its ID with full card details.

**Endpoint:** `GET /api/v1/decks/:id`

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Pikachu Deck",
  "createdBy": "player-1",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "tournamentId": "classic-tournament",
  "isValid": true,
  "cards": [
    {
      "cardId": "pokemon-base-set-v1.0-pikachu--60",
      "setName": "base-set",
      "quantity": 4,
      "card": {
        "cardId": "pokemon-base-set-v1.0-pikachu--60",
        "instanceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Pikachu",
        "cardType": "POKEMON",
        "pokemonType": "ELECTRIC",
        "hp": 60,
        "attacks": [...],
        "ability": {...}
      }
    }
  ],
  "totalCards": 60
}
```

---

### Update Deck

Update an existing deck's name, tournament association, or cards.

**Endpoint:** `PUT /api/v1/decks/:id`

**Request Body:**
```json
{
  "name": "Updated Deck Name",
  "tournamentId": "classic-tournament",
  "cards": [
    {
      "cardId": "pokemon-base-set-v1.0-pikachu--60",
      "setName": "base-set",
      "quantity": 3
    }
  ]
}
```

**Response:** `200 OK` (same format as Get Deck by ID)

---

### Delete Deck

Delete a deck by its ID.

**Endpoint:** `DELETE /api/v1/decks/:id`

**Response:** `204 No Content`

---

### Validate Deck

Validate a deck against tournament rules.

**Endpoint:** `POST /api/v1/decks/:id/validate`

**Request Body:**
```json
{
  "tournamentId": "classic-tournament"
}
```

**Response:** `200 OK`
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    "Deck validation cannot verify minimum basic Pokemon requirement (1) without full card data. Please ensure your deck meets this requirement."
  ]
}
```

**Failure Example:**
```json
{
  "isValid": false,
  "errors": [
    "Deck must have exactly 60 cards but has 55",
    "Card pokemon-base-set-v1.0-pikachu--60 has 5 copies but maximum allowed is 4"
  ],
  "warnings": []
}
```

---

## Match API

### List Matches

Get all matches, optionally filtered by tournament, player, or state.

**Endpoint:** `GET /api/v1/matches`

**Query Parameters:**
- `tournamentId` (string, optional): Filter matches by tournament ID
- `playerId` (string, optional): Filter matches by player ID
- `state` (string, optional): Filter matches by state

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

**Response:** `201 Created` (same format as List Matches)

---

### Join Match

Join an existing match as the second player.

**Endpoint:** `POST /api/v1/matches/:matchId/join`

**Request Body:**
```json
{
  "playerId": "player-2",
  "deckId": "deck-456"
}
```

**Response:** `200 OK` (same format as List Matches)

---

### Start Match

Start a match after coin flip determines the first player.

**Endpoint:** `POST /api/v1/matches/:matchId/start`

**Request Body:**
```json
{
  "firstPlayer": "PLAYER1"
}
```

**Response:** `200 OK` (same format as List Matches)

---

### Get Match State

Get the current match state from a player's perspective.

**Endpoint:** `GET /api/v1/matches/:matchId/state?playerId=:playerId`

**Response:** `200 OK`
```json
{
  "matchId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "PLAYER_TURN",
  "currentPlayer": "PLAYER1",
  "turnNumber": 3,
  "phase": "MAIN_PHASE",
  "playerState": {
    "hand": ["pokemon-base-set-v1.0-pikachu--60"],
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
    "bench": [],
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
    "bench": [],
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

---

### Execute Player Action

Execute a player action during their turn.

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

**Response:** `200 OK` (returns updated match state, same format as Get Match State)

**Action Types:**
- `DRAW_CARD`: Draw a card from deck
- `PLAY_POKEMON`: Play a Pokemon from hand to bench
- `SET_ACTIVE_POKEMON`: Set active Pokemon (initial setup only)
- `ATTACH_ENERGY`: Attach energy to a Pokemon
- `PLAY_TRAINER`: Play a trainer card
- `EVOLVE_POKEMON`: Evolve a Pokemon
- `RETREAT`: Retreat active Pokemon
- `ATTACK`: Execute attack
- `USE_ABILITY`: Use Pokemon ability
- `END_TURN`: End current turn
- `COMPLETE_INITIAL_SETUP`: Complete initial setup
- `CONCEDE`: Concede the match

---

## Error Handling

All errors follow the standard NestJS exception format:

```json
{
  "statusCode": 404,
  "message": "Descriptive error message",
  "error": "Error Type"
}
```

### Common HTTP Status Codes

- `200 OK`: Successful GET, PUT request
- `201 Created`: Successful POST (resource created)
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error or invalid action
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists or conflict
- `500 Internal Server Error`: Server error

---

**Last Updated:** December 2024

