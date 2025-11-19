# OpenTCG Frontend - Quick Reference

Quick reference guide for frontend developers integrating with the OpenTCG Backend API.

---

## Base URL

```
http://localhost:3000/api/v1/cards
```

---

## Core Entities

### CardSummary (for lists/grids)
```typescript
{
  cardId: string;              // "pokemon-base-set-v1.0-alakazam-1"
  name: string;                // "Alakazam"
  cardNumber: string;          // "1"
  setName: string;             // "Base Set"
  cardType: CardType;          // POKEMON | TRAINER | ENERGY
  pokemonType?: PokemonType;   // FIRE | WATER | GRASS | etc.
  rarity: Rarity;              // COMMON | RARE_HOLO | etc.
  hp?: number;                 // 80
  imageUrl: string;
}
```

### CardDetail (for detail view)
```typescript
{
  ...CardSummary,
  stage?: EvolutionStage;      // BASIC | STAGE_1 | STAGE_2
  evolvesFrom?: string;        // "Kadabra"
  ability?: Ability;
  attacks?: Attack[];
  weakness?: Weakness;
  resistance?: Resistance;
  retreatCost?: number;
  artist: string;
  description: string;
}
```

### CardSet
```typescript
{
  author: string;              // "pokemon"
  setName: string;             // "Base Set"
  setIdentifier: string;       // "base-set"
  version: string;             // "1.0"
  totalCards: number;          // 102
  official: boolean;
  dateReleased: string;        // "1999-01-09"
  description: string;
}
```

---

## API Endpoints

### 1. Load Sets
```typescript
POST /api/v1/cards/load

// Request
{
  "sets": [
    { "author": "pokemon", "setName": "Base Set", "version": "1.0" }
  ]
}

// Response
{
  "success": true,
  "totalLoaded": 102,
  "results": [...]
}
```

### 2. List Sets
```typescript
GET /api/v1/cards/sets?author=pokemon&official=true

// Response
{
  "sets": [CardSet, ...],
  "total": 1
}
```

### 3. Get Set Cards
```typescript
GET /api/v1/cards/sets/{author}/{setName}/v{version}
// Example: /api/v1/cards/sets/pokemon/Base%20Set/v1.0

// Response
{
  "set": CardSet,
  "cards": [CardSummary, ...],
  "count": 102
}
```

### 4. Search Cards
```typescript
GET /api/v1/cards/search?query=pikachu&pokemonType=LIGHTNING&limit=20&offset=0

// Query params:
// - query: string (card name)
// - cardType: POKEMON | TRAINER | ENERGY
// - pokemonType: FIRE | WATER | GRASS | ...
// - author: string
// - rarity: COMMON | RARE_HOLO | ...
// - limit: number (default: 50, max: 500)
// - offset: number (default: 0)

// Response
{
  "results": [CardSummary, ...],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### 5. Get Card Details
```typescript
GET /api/v1/cards/{cardId}
// Example: /api/v1/cards/pokemon-base-set-v1.0-alakazam-1

// Response: CardDetail
```

---

## Common Enums

### CardType
```
POKEMON | TRAINER | ENERGY
```

### PokemonType
```
GRASS | FIRE | WATER | LIGHTNING | PSYCHIC | FIGHTING
DARKNESS | METAL | FAIRY | DRAGON | COLORLESS
```

### Rarity
```
COMMON | UNCOMMON | RARE | RARE_HOLO
RARE_ULTRA | RARE_SECRET | PROMO
```

### EvolutionStage
```
BASIC | STAGE_1 | STAGE_2 | MEGA | VMAX | VSTAR
```

---

## Color Schemes (Recommended)

### Pokemon Types
```typescript
const typeColors = {
  GRASS: '#78C850',
  FIRE: '#F08030',
  WATER: '#6890F0',
  LIGHTNING: '#F8D030',
  PSYCHIC: '#F85888',
  FIGHTING: '#C03028',
  DARKNESS: '#705848',
  METAL: '#B8B8D0',
  FAIRY: '#EE99AC',
  DRAGON: '#7038F8',
  COLORLESS: '#A8A878'
};
```

### Rarity
```typescript
const rarityColors = {
  COMMON: '#6B7280',        // Gray
  UNCOMMON: '#10B981',      // Green
  RARE: '#3B82F6',          // Blue
  RARE_HOLO: '#8B5CF6',     // Purple
  RARE_ULTRA: '#EC4899',    // Pink
  RARE_SECRET: '#F59E0B',   // Amber/Gold
  PROMO: '#EF4444'          // Red
};
```

---

## Example: Fetch and Display Cards

```typescript
// 1. Search for cards
const searchCards = async (query: string) => {
  const params = new URLSearchParams({ query, limit: '20' });
  const response = await fetch(`/api/v1/cards/search?${params}`);
  const data = await response.json();
  return data.results; // CardSummary[]
};

// 2. Get card details
const getCard = async (cardId: string) => {
  const response = await fetch(`/api/v1/cards/${cardId}`);
  return await response.json(); // CardDetail
};

// 3. Get set cards
const getSetCards = async (author: string, setName: string, version: string) => {
  const encoded = encodeURIComponent(setName);
  const response = await fetch(`/api/v1/cards/sets/${author}/${encoded}/v${version}`);
  const data = await response.json();
  return data.cards; // CardSummary[]
};
```

---

## Error Handling

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

// 404: Not Found
// 409: Conflict (set already loaded)
// 400: Bad Request (invalid params)
// 500: Internal Server Error
```

---

## React Query Example

```typescript
import { useQuery } from '@tanstack/react-query';

// Search cards hook
export const useSearchCards = (query: string) => {
  return useQuery({
    queryKey: ['cards', 'search', query],
    queryFn: async () => {
      const params = new URLSearchParams({ query });
      const res = await fetch(`/api/v1/cards/search?${params}`);
      return res.json();
    },
    enabled: query.length > 0
  });
};

// Card detail hook
export const useCardDetail = (cardId: string) => {
  return useQuery({
    queryKey: ['cards', cardId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cards/${cardId}`);
      return res.json();
    }
  });
};
```

---

## Responsive Grid (Tailwind)

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {cards.map(card => (
    <CardItem key={card.cardId} card={card} />
  ))}
</div>
```

---

## Key Features to Implement

- [ ] Search bar with debouncing (300ms)
- [ ] Filter sidebar (type, rarity, author)
- [ ] Card grid with lazy loading images
- [ ] Card detail modal/page
- [ ] Set browser with metadata
- [ ] Pagination or infinite scroll
- [ ] Type/rarity badges with colors
- [ ] Energy cost icons
- [ ] Attack/ability formatting
- [ ] Responsive design (mobile-first)
- [ ] Loading states & skeletons
- [ ] Error handling & toasts
- [ ] URL state for filters
- [ ] Accessibility (keyboard nav, ARIA)

---

## File Structure (Minimal)

```
src/
├── api/
│   ├── client.ts       # Fetch wrapper
│   └── cards.api.ts    # Card API functions
├── types/
│   ├── card.types.ts   # CardSummary, CardDetail
│   └── enums.ts        # All enums
├── components/
│   ├── CardGrid.tsx    # Grid layout
│   ├── CardItem.tsx    # Card in grid
│   ├── CardDetail.tsx  # Full card view
│   └── SearchBar.tsx   # Search input
├── hooks/
│   └── useCards.ts     # React Query hooks
└── pages/
    ├── HomePage.tsx
    ├── SearchPage.tsx
    └── CardDetailPage.tsx
```

---

## Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
# or for Next.js:
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

---

## Testing the API

```bash
# Load a set
curl -X POST http://localhost:3000/api/v1/cards/load \
  -H "Content-Type: application/json" \
  -d '{"sets":[{"author":"pokemon","setName":"Base Set","version":"1.0"}]}'

# List sets
curl http://localhost:3000/api/v1/cards/sets

# Search cards
curl "http://localhost:3000/api/v1/cards/search?query=pikachu"

# Get card
curl http://localhost:3000/api/v1/cards/pokemon-base-set-v1.0-alakazam-1
```

---

**For detailed documentation:** See [FRONTEND-APP.md](./FRONTEND-APP.md)

**For API details:** See [API.md](./API.md)

