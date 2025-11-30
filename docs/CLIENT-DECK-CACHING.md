# Client-Side Deck Caching Guide

This document provides a comprehensive guide for implementing deck caching on the client side when playing matches. It explains how to use deck IDs from the match state response to fetch and cache full deck information and card details.

## Table of Contents

- [Overview](#overview)
- [Why Cache Decks?](#why-cache-decks)
- [API Flow](#api-flow)
- [Implementation Guide](#implementation-guide)
  - [Step 1: Get Match State](#step-1-get-match-state)
  - [Step 2: Fetch Deck Information](#step-2-fetch-deck-information)
  - [Step 3: Fetch Card Details](#step-3-fetch-card-details)
  - [Step 4: Cache Management](#step-4-cache-management)
- [TypeScript Examples](#typescript-examples)
- [React Hook Example](#react-hook-example)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

## Overview

When a player requests match state, the response includes only card IDs (not full card information). To display cards properly in the UI, the client needs to:

1. Extract deck IDs from the match state response
2. Fetch full deck information for both player and opponent decks
3. Fetch detailed card information for each card in the decks
4. Cache this information to avoid repeated API calls

## Why Cache Decks?

- **Performance**: Avoid fetching the same deck/card data multiple times
- **User Experience**: Display cards immediately without loading delays
- **Network Efficiency**: Reduce API calls during gameplay
- **Offline Support**: Cache allows basic functionality even with intermittent connectivity

## API Flow

```
┌─────────────────┐
│  Get Match      │
│  State          │
└────────┬────────┘
         │
         │ Returns: playerDeckId, opponentDeckId
         │
         ▼
┌─────────────────┐
│  Fetch Player   │
│  Deck           │
└────────┬────────┘
         │
         │ Returns: cards[] with FULL card details
         │ (image, attacks, abilities, etc.)
         │
         ▼
┌─────────────────┐
│  Fetch          │
│  Opponent Deck  │
└────────┬────────┘
         │
         │ Returns: cards[] with FULL card details
         │ (image, attacks, abilities, etc.)
         │
         ▼
┌─────────────────┐
│  Cache & Use    │
│  All Card Data  │
└─────────────────┘
```

## Implementation Guide

### Step 1: Get Match State

First, fetch the current match state which includes deck IDs:

**Endpoint:** `GET /api/v1/matches/:matchId/state?playerId=:playerId`

**Response includes:**
```typescript
{
  matchId: string;
  state: MatchState;
  playerDeckId: string | null;      // ← Your deck ID
  opponentDeckId: string | null;      // ← Opponent's deck ID
  playerState: {
    hand: string[];                  // Card IDs only
    // ... other state
  },
  opponentState: {
    handCount: number;               // Count only, no card IDs
    // ... other state
  }
}
```

### Step 2: Fetch Deck Information (with Full Card Details)

Use the deck IDs to fetch full deck information. **The deck endpoint now returns full card details**, so you don't need to make separate API calls for each card!

**Endpoint:** `GET /api/v1/decks/:deckId`

**Response:**
```typescript
{
  id: string;
  name: string;
  cards: [
    {
      cardId: string;                // e.g., "pokemon-base-set-v1.0-pikachu--60"
      setName: string;                // e.g., "base-set"
      quantity: number;               // e.g., 4
      card?: {                        // Full card details (includes image, attacks, etc.)
        cardId: string;
        name: string;
        imageUrl: string;
        hp?: number;
        attacks?: AttackDto[];
        ability?: AbilityDto;
        weakness?: WeaknessDto;
        resistance?: ResistanceDto;
        // ... all card properties
      }
    }
  ],
  totalCards: number;
}
```

**Note:** The `card` property contains complete card information including:
- Image URL (`imageUrl`)
- Attacks with energy costs and damage
- Abilities (if any)
- Weakness and resistance
- HP, retreat cost, and all other card properties

This eliminates the need for Step 3 (fetching individual card details) when using the deck endpoint!

### Step 3: Fetch Card Details (Optional)

**You can skip this step** if you're using `GET /api/v1/decks/:deckId` which now includes full card details.

If you need to fetch individual card details separately (e.g., for card search or detail views), you can use:

**Endpoint:** `GET /api/v1/cards/:cardId` (if implemented)

Or fetch by set and card number:
- `GET /api/v1/cards/sets/preview/:author/:setName/v:version/card/:cardNumber`

### Step 4: Cache Management

Implement a caching strategy:

1. **Cache Key Structure:**
   - Deck cache: `deck:${deckId}`
   - Card cache: `card:${cardId}`

2. **Cache Invalidation:**
   - Decks rarely change during a match
   - Cards never change
   - Cache can persist for the entire match session

3. **Cache Storage:**
   - Use React Query / TanStack Query for automatic caching
   - Or use a simple Map/object for in-memory cache
   - Or use localStorage for persistence across sessions

## TypeScript Examples

### Basic Implementation

```typescript
interface DeckCache {
  [deckId: string]: {
    deck: Deck;
    cards: Map<string, CardDetail>;
    fetchedAt: Date;
  };
}

class DeckCacheManager {
  private cache: DeckCache = {};

  async getDeckWithCards(deckId: string): Promise<{
    deck: Deck;
    cards: Map<string, CardDetail>;
  }> {
    // Check cache first
    if (this.cache[deckId]) {
      return {
        deck: this.cache[deckId].deck,
        cards: this.cache[deckId].cards,
      };
    }

    // Fetch deck
    const deckResponse = await fetch(`/api/v1/decks/${deckId}`);
    const deck: Deck = await deckResponse.json();

    // Fetch all unique card details
    const uniqueCardIds = [...new Set(deck.cards.map(c => c.cardId))];
    const cardDetails = new Map<string, CardDetail>();

    await Promise.all(
      uniqueCardIds.map(async (cardId) => {
        const cardResponse = await fetch(`/api/v1/cards/${cardId}`);
        const card: CardDetail = await cardResponse.json();
        cardDetails.set(cardId, card);
      })
    );

    // Cache the result
    this.cache[deckId] = {
      deck,
      cards: cardDetails,
      fetchedAt: new Date(),
    };

    return { deck, cards: cardDetails };
  }

  async getCardDetail(cardId: string): Promise<CardDetail | null> {
    // Search through all cached decks for this card
    for (const cached of Object.values(this.cache)) {
      if (cached.cards.has(cardId)) {
        return cached.cards.get(cardId)!;
      }
    }
    return null;
  }

  clearCache(): void {
    this.cache = {};
  }
}
```

### Using Match State

```typescript
async function loadMatchDecks(
  matchId: string,
  playerId: string,
  cacheManager: DeckCacheManager
): Promise<{
  playerDeck: Deck;
  playerCards: Map<string, CardDetail>;
  opponentDeck: Deck;
  opponentCards: Map<string, CardDetail>;
}> {
  // Step 1: Get match state
  const stateResponse = await fetch(
    `/api/v1/matches/${matchId}/state?playerId=${playerId}`
  );
  const matchState = await stateResponse.json();

  if (!matchState.playerDeckId || !matchState.opponentDeckId) {
    throw new Error('Deck IDs not available in match state');
  }

  // Step 2: Fetch both decks with cards
  const [playerData, opponentData] = await Promise.all([
    cacheManager.getDeckWithCards(matchState.playerDeckId),
    cacheManager.getDeckWithCards(matchState.opponentDeckId),
  ]);

  return {
    playerDeck: playerData.deck,
    playerCards: playerData.cards,
    opponentDeck: opponentData.deck,
    opponentCards: opponentData.cards,
  };
}
```

## React Hook Example

Using React Query (TanStack Query) for automatic caching:

```typescript
import { useQuery, useQueries } from '@tanstack/react-query';

// Hook to fetch deck with cards
function useDeckWithCards(deckId: string | null) {
  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: async () => {
      if (!deckId) return null;
      const response = await fetch(`/api/v1/decks/${deckId}`);
      return response.json();
    },
    enabled: !!deckId,
  });

  const cardIds = deckQuery.data?.cards
    ? [...new Set(deckQuery.data.cards.map((c: DeckCard) => c.cardId))]
    : [];

  const cardQueries = useQueries({
    queries: cardIds.map((cardId: string) => ({
      queryKey: ['card', cardId],
      queryFn: async () => {
        const response = await fetch(`/api/v1/cards/${cardId}`);
        return response.json();
      },
      enabled: !!cardId,
    })),
  });

  const cards = new Map(
    cardQueries
      .filter((q) => q.data)
      .map((q) => [q.data.cardId, q.data])
  );

  return {
    deck: deckQuery.data,
    cards,
    isLoading: deckQuery.isLoading || cardQueries.some((q) => q.isLoading),
    isError: deckQuery.isError || cardQueries.some((q) => q.isError),
  };
}

// Hook to get match decks
function useMatchDecks(matchId: string, playerId: string) {
  // Fetch match state
  const matchStateQuery = useQuery({
    queryKey: ['matchState', matchId, playerId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/matches/${matchId}/state?playerId=${playerId}`
      );
      return response.json();
    },
  });

  const playerDeckId = matchStateQuery.data?.playerDeckId;
  const opponentDeckId = matchStateQuery.data?.opponentDeckId;

  // Fetch both decks
  const playerDeck = useDeckWithCards(playerDeckId);
  const opponentDeck = useDeckWithCards(opponentDeckId);

  return {
    matchState: matchStateQuery.data,
    playerDeck: playerDeck.deck,
    playerCards: playerDeck.cards,
    opponentDeck: opponentDeck.deck,
    opponentCards: opponentDeck.cards,
    isLoading:
      matchStateQuery.isLoading ||
      playerDeck.isLoading ||
      opponentDeck.isLoading,
    isError:
      matchStateQuery.isError || playerDeck.isError || opponentDeck.isError,
  };
}

// Usage in component
function MatchView({ matchId, playerId }: { matchId: string; playerId: string }) {
  const {
    matchState,
    playerDeck,
    playerCards,
    opponentDeck,
    opponentCards,
    isLoading,
  } = useMatchDecks(matchId, playerId);

  if (isLoading) return <div>Loading decks...</div>;

  // Now you can display cards with full details
  const playerHand = matchState?.playerState?.hand || [];
  const handCards = playerHand.map((cardId) => playerCards.get(cardId));

  return (
    <div>
      <h2>Your Hand</h2>
      {handCards.map((card) => (
        <CardDisplay key={card.cardId} card={card} />
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Fetch Decks Early

Fetch deck information as soon as the match state includes deck IDs (typically after both players join):

```typescript
// When match state shows both players have joined
if (matchState.playerDeckId && matchState.opponentDeckId) {
  // Pre-fetch decks
  await loadMatchDecks(matchId, playerId, cacheManager);
}
```

### 2. Batch Card Requests

Fetch all unique cards in parallel:

```typescript
// Good: Parallel requests
const cards = await Promise.all(
  uniqueCardIds.map(id => fetchCard(id))
);

// Bad: Sequential requests
for (const id of uniqueCardIds) {
  await fetchCard(id);
}
```

### 3. Cache Strategy

- **Match Duration**: Cache decks for the entire match
- **Session Duration**: Keep cache for the browser session
- **Persistence**: Optionally use localStorage for offline support

### 4. Error Handling

Handle cases where:
- Deck IDs are null (match not fully set up)
- Deck fetch fails (network error)
- Card fetch fails (card not found)

### 5. Loading States

Show loading indicators while fetching:
- Initial deck load
- Card detail loading
- Match state polling

## Error Handling

```typescript
async function safeLoadMatchDecks(
  matchId: string,
  playerId: string,
  cacheManager: DeckCacheManager
): Promise<{
  playerDeck: Deck | null;
  playerCards: Map<string, CardDetail>;
  opponentDeck: Deck | null;
  opponentCards: Map<string, CardDetail>;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const stateResponse = await fetch(
      `/api/v1/matches/${matchId}/state?playerId=${playerId}`
    );
    if (!stateResponse.ok) {
      throw new Error(`Failed to fetch match state: ${stateResponse.statusText}`);
    }
    const matchState = await stateResponse.json();

    if (!matchState.playerDeckId || !matchState.opponentDeckId) {
      return {
        playerDeck: null,
        playerCards: new Map(),
        opponentDeck: null,
        opponentCards: new Map(),
        errors: ['Deck IDs not available in match state'],
      };
    }

    const [playerData, opponentData] = await Promise.allSettled([
      cacheManager.getDeckWithCards(matchState.playerDeckId),
      cacheManager.getDeckWithCards(matchState.opponentDeckId),
    ]);

    if (playerData.status === 'rejected') {
      errors.push(`Failed to load player deck: ${playerData.reason}`);
    }
    if (opponentData.status === 'rejected') {
      errors.push(`Failed to load opponent deck: ${opponentData.reason}`);
    }

    return {
      playerDeck: playerData.status === 'fulfilled' ? playerData.value.deck : null,
      playerCards: playerData.status === 'fulfilled' ? playerData.value.cards : new Map(),
      opponentDeck: opponentData.status === 'fulfilled' ? opponentData.value.deck : null,
      opponentCards: opponentData.status === 'fulfilled' ? opponentData.value.cards : new Map(),
      errors,
    };
  } catch (error) {
    return {
      playerDeck: null,
      playerCards: new Map(),
      opponentDeck: null,
      opponentCards: new Map(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
```

## Performance Considerations

### 1. Minimize API Calls

- Cache decks immediately when match starts
- Fetch all unique cards at once
- Reuse cached data throughout the match

### 2. Lazy Loading

For large decks, consider lazy loading:
- Load deck structure first
- Load card details on-demand (when card is viewed)
- Pre-load cards in hand/active Pokemon

### 3. Debounce Match State Polling

When polling for match state updates:
```typescript
// Poll every 2 seconds, but only fetch decks once
const [decksLoaded, setDecksLoaded] = useState(false);

useEffect(() => {
  if (matchState.playerDeckId && !decksLoaded) {
    loadMatchDecks(matchId, playerId, cacheManager);
    setDecksLoaded(true);
  }
}, [matchState.playerDeckId]);
```

### 4. Memory Management

- Clear cache when match ends
- Limit cache size (e.g., last 10 matches)
- Use WeakMap for automatic garbage collection if appropriate

## Summary

1. **Get match state** → Extract `playerDeckId` and `opponentDeckId`
2. **Fetch deck information** → Get deck structure with **full card details included** (no additional API calls needed!)
3. **Cache everything** → Store in memory/cache for fast access
4. **Use cached data** → Display cards with full details in UI

**Important:** The `GET /api/v1/decks/:deckId` endpoint now returns full card details in the `card` property of each deck card entry. This means you only need **one API call per deck** to get all the information you need for match gameplay, including images, attacks, abilities, and all other card properties.

This approach ensures your client has all the card information needed to display the game state properly, while minimizing API calls and improving performance.

---

**Last Updated:** 2025-01-XX

**Related Documentation:**
- [MATCH-API.md](./MATCH-API.md) - Match API endpoints
- [DECK-API.md](./DECK-API.md) - Deck API endpoints
- [API.md](./API.md) - Card API endpoints

