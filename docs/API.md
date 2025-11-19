# Card API Documentation

This document provides comprehensive documentation for the Card API endpoints.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Load Cards](#load-cards)
  - [List Available Sets](#list-available-sets)
  - [Get Cards from Set](#get-cards-from-set)
  - [Get Single Card](#get-single-card)
  - [Search Cards](#search-cards)
- [Data Structures](#data-structures)
- [Error Handling](#error-handling)

## Overview

The Card API allows clients to load, query, and search trading card data. Cards are organized into sets, and each card has a unique identifier. The API supports filtering, pagination, and detailed card information retrieval.

## Base URL

```
http://localhost:3000/api/v1/cards
```

## Authentication

Currently, no authentication is required for any endpoints.

## Endpoints

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

```json
{
  "success": false,
  "totalLoaded": 0,
  "results": [
    {
      "success": false,
      "author": "pokemon",
      "setName": "Base Set",
      "version": "1.0",
      "loaded": 0,
      "filename": "pokemon-Base Set-v1.0.json",
      "error": "Set already loaded: pokemon-Base Set-v1.0"
    }
  ]
}
```

---

### List Available Sets

Get a list of all loaded card sets.

**Endpoint:** `GET /api/v1/cards/sets`

**Query Parameters:**

| Parameter | Type    | Required | Description                                    |
| --------- | ------- | -------- | ---------------------------------------------- |
| author    | string  | No       | Filter by author (e.g., "pokemon")             |
| official  | boolean | No       | Filter by official status (true/false as string) |

**Example Requests:**

```bash
# Get all sets
GET /api/v1/cards/sets

# Get sets by author
GET /api/v1/cards/sets?author=pokemon

# Get official sets only
GET /api/v1/cards/sets?official=true

# Combine filters
GET /api/v1/cards/sets?author=pokemon&official=true
```

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

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| author    | string | Yes      | Author of the set (e.g., "pokemon")        |
| setName   | string | Yes      | Name of the set (e.g., "Base Set")         |
| version   | string | Yes      | Version number (e.g., "1.0")               |

**Example Request:**

```bash
# Note: URL encode spaces (%20)
GET /api/v1/cards/sets/pokemon/Base%20Set/v1.0
```

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
    // ... more cards
  ],
  "count": 102
}
```

**Error Response:** `404 Not Found` (if set doesn't exist)

```json
{
  "statusCode": 404,
  "message": "Set not found: pokemon-Base Set-v1.0",
  "error": "Not Found"
}
```

---

### Get Single Card

Get detailed information about a specific card.

**Endpoint:** `GET /api/v1/cards/:cardId`

**Path Parameters:**

| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| cardId    | string | Yes      | Unique card identifier (e.g., "pokemon-base-set-v1.0-alakazam-1") |

**Example Request:**

```bash
GET /api/v1/cards/pokemon-base-set-v1.0-alakazam-1
```

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

**Error Response:** `404 Not Found` (if card doesn't exist)

```json
{
  "statusCode": 404,
  "message": "Card not found: pokemon-base-set-v1.0-alakazam-1",
  "error": "Not Found"
}
```

---

### Search Cards

Search and filter cards with pagination.

**Endpoint:** `GET /api/v1/cards/search`

**Query Parameters:**

| Parameter    | Type         | Required | Description                                |
| ------------ | ------------ | -------- | ------------------------------------------ |
| query        | string       | No       | Search by card name (case insensitive)     |
| cardType     | CardType     | No       | Filter by card type                        |
| pokemonType  | PokemonType  | No       | Filter by Pokémon type                     |
| author       | string       | No       | Filter by author                           |
| rarity       | Rarity       | No       | Filter by rarity                           |
| limit        | number       | No       | Results per page (default: 50, max: 500)   |
| offset       | number       | No       | Number of results to skip (default: 0)     |

**Example Requests:**

```bash
# Search by name
GET /api/v1/cards/search?query=Pikachu

# Filter by type
GET /api/v1/cards/search?pokemonType=LIGHTNING

# Filter by rarity
GET /api/v1/cards/search?rarity=RARE_HOLO

# Combine filters
GET /api/v1/cards/search?pokemonType=PSYCHIC&rarity=RARE_HOLO

# With pagination
GET /api/v1/cards/search?limit=20&offset=0

# Complex query
GET /api/v1/cards/search?query=Char&pokemonType=FIRE&limit=10
```

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
    // ... more results
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

---

## Data Structures

### CardType Enum

```
POKEMON | TRAINER | ENERGY
```

### PokemonType Enum

```
GRASS | FIRE | WATER | LIGHTNING | PSYCHIC | FIGHTING | 
DARKNESS | METAL | FAIRY | DRAGON | COLORLESS
```

### Rarity Enum

```
COMMON | UNCOMMON | RARE | RARE_HOLO | RARE_ULTRA | 
RARE_SECRET | PROMO
```

### EvolutionStage Enum

```
BASIC | STAGE_1 | STAGE_2 | MEGA | VMAX | VSTAR
```

### AbilityActivationType Enum

```
PASSIVE | TRIGGERED | ACTIVATED
```

### UsageLimit Enum

```
ONCE_PER_TURN | ONCE_PER_GAME | UNLIMITED
```

### EnergyType Enum

```
GRASS | FIRE | WATER | LIGHTNING | PSYCHIC | FIGHTING | 
DARKNESS | METAL | FAIRY | DRAGON | COLORLESS
```

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

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists or conflict
- `500 Internal Server Error` - Server error

---

## Client Implementation Guide

### 1. Loading Card Sets

Before querying cards, you must load sets into memory:

```typescript
// Load Base Set
const response = await fetch('http://localhost:3000/api/v1/cards/load', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sets: [
      { author: 'pokemon', setName: 'Base Set', version: '1.0' }
    ]
  })
});

const result = await response.json();
console.log(`Loaded ${result.totalLoaded} cards`);
```

### 2. Listing Available Sets

Get all loaded sets to present in a UI:

```typescript
const response = await fetch('http://localhost:3000/api/v1/cards/sets');
const data = await response.json();

// Display sets in UI
data.sets.forEach(set => {
  console.log(`${set.setName} (${set.totalCards} cards)`);
});
```

### 3. Displaying Cards from a Set

```typescript
const response = await fetch(
  'http://localhost:3000/api/v1/cards/sets/pokemon/Base%20Set/v1.0'
);
const data = await response.json();

// Display cards in a grid
data.cards.forEach(card => {
  renderCard({
    name: card.name,
    image: card.imageUrl,
    hp: card.hp,
    type: card.pokemonType,
  });
});
```

### 4. Searching Cards

Implement a search interface:

```typescript
async function searchCards(query: string, filters: any) {
  const params = new URLSearchParams({
    query,
    ...filters,
    limit: '20',
    offset: '0'
  });

  const response = await fetch(
    `http://localhost:3000/api/v1/cards/search?${params}`
  );
  return await response.json();
}

// Usage
const results = await searchCards('Pikachu', { pokemonType: 'LIGHTNING' });
```

### 5. Displaying Card Details

Show full card information when a user clicks on a card:

```typescript
async function showCardDetails(cardId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/cards/${cardId}`
  );
  const card = await response.json();

  // Display full card details
  renderCardDetails({
    name: card.name,
    hp: card.hp,
    type: card.pokemonType,
    stage: card.stage,
    evolvesFrom: card.evolvesFrom,
    ability: card.ability,
    attacks: card.attacks,
    weakness: card.weakness,
    resistance: card.resistance,
    retreatCost: card.retreatCost,
    artist: card.artist,
    description: card.description,
  });
}
```

---

## Example Workflow

1. **Load Sets:** Use `POST /api/v1/cards/load` to load card data
2. **List Sets:** Use `GET /api/v1/cards/sets` to show available decks
3. **Browse Set:** Use `GET /api/v1/cards/sets/:author/:setName/v:version` to show cards in a set
4. **View Card:** Use `GET /api/v1/cards/:cardId` to show full card details
5. **Search:** Use `GET /api/v1/cards/search` for search functionality

---

## Notes

- Card data is stored in memory and will be cleared when the server restarts
- The `cardId` is a unique identifier for the card template (same across game instances)
- The `instanceId` is a UUID for the specific card instance (unique per load)
- All timestamps are in ISO 8601 format
- URL encode path parameters (spaces → `%20`)
- Boolean query parameters should be strings (`"true"` or `"false"`)

