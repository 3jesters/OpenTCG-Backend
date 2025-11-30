# Deck API Documentation

This document provides comprehensive documentation for the Deck API endpoints, data structures, and responses for frontend integration.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Create Deck](#create-deck)
  - [List Decks](#list-decks)
  - [Get Deck by ID](#get-deck-by-id)
  - [Update Deck](#update-deck)
  - [Delete Deck](#delete-deck)
  - [Validate Deck](#validate-deck)
- [Data Structures](#data-structures)
- [Error Handling](#error-handling)
- [Frontend Integration Examples](#frontend-integration-examples)

## Overview

The Deck API allows clients to create, manage, and validate player decks. A deck is a collection of cards with quantities that can be associated with tournaments and validated against tournament rules. The API supports full CRUD operations and comprehensive deck validation.

## Base URL

```
http://localhost:3000/api/v1/decks
```

## Authentication

Currently, no authentication is required for any endpoints.

## Endpoints

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
    },
    {
      "cardId": "pokemon-base-set-v1.0-raichu--14",
      "setName": "base-set",
      "quantity": 2
    }
  ]
}
```

**Request Fields:**
- `name` (string, required): Deck name
- `createdBy` (string, required): Creator identifier (player/user ID)
- `tournamentId` (string, optional): Associated tournament ID
- `cards` (array, optional): Array of deck cards

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
    },
    {
      "cardId": "pokemon-base-set-v1.0-raichu--14",
      "setName": "base-set",
      "quantity": 2
    }
  ],
  "totalCards": 6
}
```

**Error Response:** `400 Bad Request` (validation error)

```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "createdBy should not be empty"
  ],
  "error": "Bad Request"
}
```

---

### List Decks

Get all decks, optionally filtered by tournament.

**Endpoint:** `GET /api/v1/decks`

**Query Parameters:**
- `tournamentId` (string, optional): Filter decks by tournament ID

**Examples:**
- `GET /api/v1/decks` - Get all decks
- `GET /api/v1/decks?tournamentId=classic-tournament` - Get decks for specific tournament

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

Get just the list of cards (with quantities) for a specific deck. This is a lightweight endpoint that returns only the cards array, perfect for displaying a deck's card list where clicking a card redirects to full card details.

**Endpoint:** `GET /api/v1/decks/:id/cards`

**Path Parameters:**
- `id` (string, required): Deck ID (UUID)

**Response:** `200 OK`

```json
[
  {
    "cardId": "pokemon-base-set-v1.0-charmander--46",
    "setName": "base-set",
    "quantity": 4
  },
  {
    "cardId": "pokemon-base-set-v1.0-charmeleon--24",
    "setName": "base-set",
    "quantity": 2
  },
  {
    "cardId": "pokemon-base-set-v1.0-charizard--4",
    "setName": "base-set",
    "quantity": 1
  }
]
```

**Use Case:**
- Display deck card list in UI
- Each card can be clicked to navigate to `/api/v1/cards/{cardId}` for full details
- Lightweight response for better performance

**Error Response:** `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Deck with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

### Get Deck by ID

Retrieve a specific deck by its ID with full card details. This endpoint returns complete card information including images, attacks, abilities, and all other card properties, making it perfect for match gameplay where all card data is needed.

**Endpoint:** `GET /api/v1/decks/:id`

**Path Parameters:**
- `id` (string, required): Deck ID (UUID)

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
        "pokemonNumber": "025",
        "cardNumber": "60",
        "setName": "Base Set",
        "cardType": "POKEMON",
        "pokemonType": "ELECTRIC",
        "rarity": "COMMON",
        "hp": 60,
        "stage": "BASIC",
        "attacks": [
          {
            "name": "Thunder Shock",
            "energyCost": ["ELECTRIC"],
            "damage": 10,
            "text": "Flip a coin. If tails, this Pokémon does 10 damage to itself."
          }
        ],
        "weakness": {
          "type": "FIGHTING",
          "value": "×2"
        },
        "resistance": null,
        "retreatCost": 1,
        "artist": "Mitsuhiro Arita",
        "description": "When several of these Pokémon gather, their electricity could build and cause lightning storms.",
        "imageUrl": "https://example.com/cards/pikachu-60.png",
        "regulationMark": null
      }
    },
    {
      "cardId": "pokemon-base-set-v1.0-raichu--14",
      "setName": "base-set",
      "quantity": 2,
      "card": {
        "cardId": "pokemon-base-set-v1.0-raichu--14",
        "instanceId": "b2c3d4e5-f6g7-8901-bcde-f23456789012",
        "name": "Raichu",
        "pokemonNumber": "026",
        "cardNumber": "14",
        "setName": "Base Set",
        "cardType": "POKEMON",
        "pokemonType": "ELECTRIC",
        "rarity": "RARE_HOLO",
        "hp": 80,
        "stage": "STAGE_1",
        "evolvesFrom": "Pikachu",
        "attacks": [
          {
            "name": "Agility",
            "energyCost": ["COLORLESS", "COLORLESS"],
            "damage": 20,
            "text": "Flip a coin. If heads, during your opponent's next turn, prevent all effects of attacks, including damage, done to this Pokémon."
          },
          {
            "name": "Thunder",
            "energyCost": ["ELECTRIC", "ELECTRIC", "ELECTRIC"],
            "damage": 60,
            "text": "Flip a coin. If tails, this Pokémon does 30 damage to itself."
          }
        ],
        "weakness": {
          "type": "FIGHTING",
          "value": "×2"
        },
        "resistance": null,
        "retreatCost": 2,
        "artist": "Ken Sugimori",
        "description": "Its long tail serves as a ground to protect itself from its own high-voltage power.",
        "imageUrl": "https://example.com/cards/raichu-14.png",
        "regulationMark": null
      }
    }
  ],
  "totalCards": 60
}
```

**Note:** The `card` property in each deck card entry contains the full card details including:
- Image URL (`imageUrl`)
- Attacks with energy costs and damage
- Abilities (if any)
- Weakness and resistance
- HP, retreat cost, and all other card properties

This makes it easy for clients to display cards in match gameplay without needing additional API calls to fetch card details.

**Error Response:** `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Deck with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

### Update Deck

Update an existing deck's name, tournament association, or cards.

**Endpoint:** `PUT /api/v1/decks/:id`

**Path Parameters:**
- `id` (string, required): Deck ID (UUID)

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

**Request Fields:**
- `name` (string, optional): New deck name
- `tournamentId` (string, optional): New tournament ID (or null to remove)
- `cards` (array, optional): Complete card list (replaces all existing cards)

**Note:** All fields are optional. Only provided fields will be updated. If `cards` is provided, it completely replaces the existing card list.

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Deck Name",
  "createdBy": "player-1",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T13:00:00.000Z",
  "tournamentId": "classic-tournament",
  "isValid": false,
  "cards": [
    {
      "cardId": "pokemon-base-set-v1.0-pikachu--60",
      "setName": "base-set",
      "quantity": 3
    }
  ],
  "totalCards": 3
}
```

**Error Response:** `404 Not Found` (deck doesn't exist)

```json
{
  "statusCode": 404,
  "message": "Deck with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

### Delete Deck

Delete a deck by its ID.

**Endpoint:** `DELETE /api/v1/decks/:id`

**Path Parameters:**
- `id` (string, required): Deck ID (UUID)

**Response:** `204 No Content`

No response body.

**Error Response:** `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Deck with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

### Validate Deck

Validate a deck against tournament rules.

**Endpoint:** `POST /api/v1/decks/:id/validate`

**Path Parameters:**
- `id` (string, required): Deck ID (UUID)

**Request Body:**

```json
{
  "tournamentId": "classic-tournament"
}
```

**Request Fields:**
- `tournamentId` (string, required): Tournament ID to validate against

**Response:** `200 OK`

**Success Example:**

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
    "Card pokemon-base-set-v1.0-pikachu--60 has 5 copies but maximum allowed is 4",
    "Set \"jungle\" is banned in this tournament"
  ],
  "warnings": [
    "Card pokemon-base-set-v1.0-professor-oak--88 is restricted to 1 copies in this tournament"
  ]
}
```

**Error Response:** `404 Not Found` (deck or tournament doesn't exist)

```json
{
  "statusCode": 404,
  "message": "Deck with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

## Data Structures

### Deck Response Object

Complete deck information returned by the API.

```typescript
interface DeckResponse {
  id: string;                    // UUID
  name: string;                  // Deck name
  createdBy: string;             // Creator identifier
  createdAt: string;              // ISO 8601 date string
  updatedAt: string;              // ISO 8601 date string
  tournamentId?: string;          // Optional tournament ID
  isValid: boolean;               // Validation status
  cards: DeckCardResponse[];     // Array of cards in deck
  totalCards: number;             // Total card count (sum of quantities)
}
```

### Deck Card Response Object

Represents a card in a deck with its quantity.

```typescript
interface DeckCardResponse {
  cardId: string;                 // Card identifier (e.g., "pokemon-base-set-v1.0-pikachu--60")
  setName: string;                // Set name (e.g., "base-set")
  quantity: number;               // Number of copies (minimum 1)
}
```

### Deck List Response Object

Response for listing multiple decks.

```typescript
interface DeckListResponse {
  decks: DeckResponse[];          // Array of decks
  count: number;                   // Total number of decks
}
```

### Validation Response Object

Result of deck validation against tournament rules.

```typescript
interface ValidationResponse {
  isValid: boolean;                // Whether deck passes validation
  errors: string[];                // Array of error messages (prevent validity)
  warnings: string[];             // Array of warning messages (informational)
}
```

### Create Deck Request Object

Request body for creating a new deck.

```typescript
interface CreateDeckRequest {
  name: string;                   // Required: Deck name
  createdBy: string;              // Required: Creator identifier
  tournamentId?: string;          // Optional: Tournament ID
  cards?: DeckCardRequest[];      // Optional: Initial cards
}
```

### Update Deck Request Object

Request body for updating a deck.

```typescript
interface UpdateDeckRequest {
  name?: string;                  // Optional: New deck name
  tournamentId?: string;          // Optional: New tournament ID
  cards?: DeckCardRequest[];      // Optional: Complete card list (replaces existing)
}
```

### Deck Card Request Object

Card representation in request bodies.

```typescript
interface DeckCardRequest {
  cardId: string;                 // Required: Card identifier
  setName: string;                // Required: Set name
  quantity: number;               // Required: Number of copies (minimum 1)
}
```

### Validate Deck Request Object

Request body for deck validation.

```typescript
interface ValidateDeckRequest {
  tournamentId: string;           // Required: Tournament ID to validate against
}
```

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

- `200 OK`: Successful GET, PUT, or validation request
- `201 Created`: Successful POST (deck created)
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error (invalid request body)
- `404 Not Found`: Deck or tournament not found
- `500 Internal Server Error`: Server error

### Validation Errors

When creating or updating a deck, validation errors may include:

- `name should not be empty`
- `createdBy should not be empty`
- `cardId should not be empty`
- `setName should not be empty`
- `quantity must be a positive number`
- `quantity must be an integer`

---

## Frontend Integration Examples

### TypeScript/JavaScript Examples

#### Create a Deck

```typescript
async function createDeck(name: string, createdBy: string, cards: DeckCardRequest[]) {
  const response = await fetch('http://localhost:3000/api/v1/decks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      createdBy,
      cards,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
const deck = await createDeck(
  'My Pikachu Deck',
  'player-1',
  [
    { cardId: 'pokemon-base-set-v1.0-pikachu--60', setName: 'base-set', quantity: 4 },
    { cardId: 'pokemon-base-set-v1.0-raichu--14', setName: 'base-set', quantity: 2 },
  ]
);
```

#### List All Decks

```typescript
async function listDecks(tournamentId?: string): Promise<DeckListResponse> {
  const url = tournamentId
    ? `http://localhost:3000/api/v1/decks?tournamentId=${tournamentId}`
    : 'http://localhost:3000/api/v1/decks';

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch decks');
  }

  return await response.json();
}

// Usage
const allDecks = await listDecks();
const tournamentDecks = await listDecks('classic-tournament');
```

#### Get Deck Cards (Lightweight)

```typescript
async function getDeckCards(deckId: string): Promise<DeckCardResponse[]> {
  const response = await fetch(`http://localhost:3000/api/v1/decks/${deckId}/cards`);

  if (response.status === 404) {
    throw new Error('Deck not found');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch deck cards');
  }

  return await response.json();
}

// Usage - Get cards and navigate to card details on click
const cards = await getDeckCards('deck-id');
cards.forEach(card => {
  // card.cardId can be used to navigate to /api/v1/cards/{cardId}
  console.log(`${card.quantity}x ${card.cardId} from ${card.setName}`);
});
```

#### Get Deck by ID (with Full Card Details)

```typescript
async function getDeck(deckId: string): Promise<DeckResponse> {
  const response = await fetch(`http://localhost:3000/api/v1/decks/${deckId}`);

  if (response.status === 404) {
    throw new Error('Deck not found');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch deck');
  }

  return await response.json();
}

// Usage - Get deck with full card details for match gameplay
const deck = await getDeck('deck-id');
deck.cards.forEach(deckCard => {
  console.log(`${deckCard.quantity}x ${deckCard.card?.name || deckCard.cardId}`);
  
  // Full card details are available in deckCard.card
  if (deckCard.card) {
    console.log(`  Image: ${deckCard.card.imageUrl}`);
    console.log(`  HP: ${deckCard.card.hp}`);
    console.log(`  Attacks: ${deckCard.card.attacks?.length || 0}`);
    // All card properties are available: attacks, abilities, weakness, etc.
  }
});
```

**Note:** This endpoint returns full card details in the `card` property of each deck card entry. This is perfect for match gameplay where you need all card information (images, attacks, abilities) without making additional API calls.

#### Update Deck

```typescript
async function updateDeck(
  deckId: string,
  updates: UpdateDeckRequest
): Promise<DeckResponse> {
  const response = await fetch(`http://localhost:3000/api/v1/decks/${deckId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage - Update deck name only
await updateDeck('deck-id', { name: 'New Deck Name' });

// Usage - Replace all cards
await updateDeck('deck-id', {
  cards: [
    { cardId: 'card-1', setName: 'base-set', quantity: 4 },
  ],
});
```

#### Delete Deck

```typescript
async function deleteDeck(deckId: string): Promise<void> {
  const response = await fetch(`http://localhost:3000/api/v1/decks/${deckId}`, {
    method: 'DELETE',
  });

  if (response.status === 404) {
    throw new Error('Deck not found');
  }

  if (!response.ok) {
    throw new Error('Failed to delete deck');
  }
}
```

#### Validate Deck

```typescript
async function validateDeck(
  deckId: string,
  tournamentId: string
): Promise<ValidationResponse> {
  const response = await fetch(
    `http://localhost:3000/api/v1/decks/${deckId}/validate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tournamentId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
const validation = await validateDeck('deck-id', 'classic-tournament');

if (validation.isValid) {
  console.log('Deck is valid!');
  if (validation.warnings.length > 0) {
    console.warn('Warnings:', validation.warnings);
  }
} else {
  console.error('Deck is invalid:', validation.errors);
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface UseDeckReturn {
  deck: DeckResponse | null;
  loading: boolean;
  error: string | null;
  updateDeck: (updates: UpdateDeckRequest) => Promise<void>;
  validateDeck: (tournamentId: string) => Promise<ValidationResponse>;
}

function useDeck(deckId: string): UseDeckReturn {
  const [deck, setDeck] = useState<DeckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeck() {
      try {
        setLoading(true);
        const data = await getDeck(deckId);
        setDeck(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (deckId) {
      fetchDeck();
    }
  }, [deckId]);

  const updateDeck = async (updates: UpdateDeckRequest) => {
    try {
      const updated = await updateDeck(deckId, updates);
      setDeck(updated);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const validateDeck = async (tournamentId: string) => {
    return await validateDeck(deckId, tournamentId);
  };

  return { deck, loading, error, updateDeck, validateDeck };
}
```

### Vue.js Composition API Example

```typescript
import { ref, computed } from 'vue';

export function useDeck(deckId: string) {
  const deck = ref<DeckResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isValid = computed(() => deck.value?.isValid ?? false);
  const totalCards = computed(() => deck.value?.totalCards ?? 0);

  async function loadDeck() {
    try {
      loading.value = true;
      error.value = null;
      deck.value = await getDeck(deckId);
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function updateDeck(updates: UpdateDeckRequest) {
    try {
      deck.value = await updateDeck(deckId, updates);
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  async function validateDeck(tournamentId: string) {
    return await validateDeck(deckId, tournamentId);
  }

  return {
    deck,
    loading,
    error,
    isValid,
    totalCards,
    loadDeck,
    updateDeck,
    validateDeck,
  };
}
```

---

## UI/UX Recommendations

### Deck Builder Interface

1. **Deck List View**
   - Display deck name, creator, card count, and validation status
   - Show tournament association badge
   - Filter/search by name or tournament
   - Quick actions: Edit, Delete, Validate, Duplicate

2. **Deck Editor**
   - Card search/selector with filters
   - Drag-and-drop or click-to-add cards
   - Quantity controls (+/- buttons)
   - Real-time card count display
   - Save button with loading state

3. **Validation Display**
   - Success indicator (green checkmark) when valid
   - Error list (red) for validation failures
   - Warning list (yellow) for informational messages
   - Inline validation feedback while editing

4. **Card Display in Deck**
   - Show card image/thumbnail
   - Display quantity badge
   - Show card name and set
   - Quick remove button
   - Quantity adjustment controls

### Error Handling UI

- Display validation errors prominently
- Show field-level errors for form inputs
- Provide helpful error messages
- Allow users to fix errors and re-validate

### Loading States

- Show loading spinners during API calls
- Disable buttons during operations
- Display progress for long-running operations
- Provide feedback for successful operations

---

## Best Practices

1. **Caching**: Cache deck data to reduce API calls
2. **Optimistic Updates**: Update UI immediately, sync with server
3. **Error Recovery**: Retry failed requests with exponential backoff
4. **Validation**: Validate locally before sending to API
5. **Debouncing**: Debounce search/filter inputs
6. **Pagination**: Implement pagination for large deck lists
7. **Real-time Updates**: Consider WebSocket for collaborative deck building

---

## Additional Resources

- [Tournament API Documentation](./API.md#tournament-endpoints) - For tournament information
- [Card API Documentation](./API.md) - For card data retrieval
- [Deck Module Documentation](../src/modules/deck/README.md) - Backend module details

