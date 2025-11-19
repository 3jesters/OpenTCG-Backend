# OpenTCG Frontend Application Documentation

## Table of Contents

- [Purpose](#purpose)
- [Application Overview](#application-overview)
- [Entities & Data Models](#entities--data-models)
- [Backend API Integration](#backend-api-integration)
- [Frontend Architecture](#frontend-architecture)
- [User Interface Components](#user-interface-components)
- [User Flows](#user-flows)
- [Technical Recommendations](#technical-recommendations)

---

## Purpose

### What is OpenTCG Frontend?

The **OpenTCG Frontend** is a web application that provides an interactive user interface for browsing, searching, and viewing trading card game (TCG) cards. It connects to the OpenTCG Backend API to provide users with:

1. **Card Set Management**: Load and browse different TCG card sets (e.g., Pokemon Base Set, custom sets)
2. **Card Discovery**: Search and filter cards by various attributes (type, rarity, name, etc.)
3. **Card Details**: View comprehensive card information including abilities, attacks, stats, and artwork
4. **Collection Browsing**: Navigate through entire card sets with intuitive UI
5. **Visual Presentation**: Display cards in a visually appealing, card-like format

### Target Users

- **TCG Players**: Want to browse and learn about cards
- **Collectors**: Want to explore different sets and rarities
- **Game Developers**: Want to integrate TCG card data into their applications
- **Content Creators**: Want to showcase and discuss cards

---

## Application Overview

### Core Features

#### 1. Set Management
- Load card sets from the backend
- View available/loaded sets
- Filter sets by author and official status
- Display set metadata (release date, card count, description)

#### 2. Card Browsing
- Display all cards from a selected set
- Grid view with card images and basic info
- Pagination or infinite scroll for large sets
- Responsive card grid (mobile to desktop)

#### 3. Card Search & Filtering
- Search cards by name
- Filter by:
  - Card type (Pokemon, Trainer, Energy)
  - Pokemon type (Fire, Water, Grass, etc.)
  - Rarity (Common, Rare, Holo, etc.)
  - Author/Set
- Real-time search results
- Pagination support

#### 4. Card Detail View
- Full card information display
- High-quality card artwork
- Detailed stats (HP, attacks, abilities, weakness, resistance)
- Evolution information
- Artist and description
- Navigation to related cards (evolutions)

#### 5. Visual Card Representation
- Card-like UI mimicking real TCG cards
- Type-specific color schemes
- Rarity indicators (holo effects, icons)
- Energy cost visualization
- Attack/ability formatting

---

## Entities & Data Models

### 1. Card Set

Represents a collection of cards (e.g., "Base Set", "Jungle").

```typescript
interface CardSet {
  author: string;              // e.g., "pokemon"
  setName: string;             // e.g., "Base Set"
  setIdentifier: string;       // e.g., "base-set" (URL-friendly)
  version: string;             // e.g., "1.0"
  totalCards: number;          // Total cards in set
  official: boolean;           // Official vs custom set
  dateReleased: string;        // ISO date string
  description: string;         // Set description
  loadedAt: string;            // When loaded into backend (ISO date)
}
```

**UI Usage:**
- Set selector dropdown
- Set browser page
- Set metadata display
- Filter option in search

---

### 2. Card (Summary)

Lightweight card representation for lists and grids.

```typescript
interface CardSummary {
  cardId: string;              // Unique identifier: "pokemon-base-set-v1.0-alakazam-1"
  instanceId: string;          // UUID for this instance
  name: string;                // Card name: "Alakazam"
  cardNumber: string;          // Card number in set: "1"
  setName: string;             // Set name: "Base Set"
  cardType: CardType;          // POKEMON | TRAINER | ENERGY
  pokemonType?: PokemonType;   // Type (for Pokemon cards)
  rarity: Rarity;              // Card rarity
  hp?: number;                 // HP (for Pokemon cards)
  imageUrl: string;            // Card image URL
}
```

**UI Usage:**
- Card grid items
- Search results
- Quick preview cards
- Collection browser

---

### 3. Card (Detail)

Complete card information for detail view.

```typescript
interface CardDetail {
  // Basic Info (from CardSummary)
  cardId: string;
  instanceId: string;
  name: string;
  pokemonNumber?: string;      // e.g., "065" (Pokedex number)
  cardNumber: string;
  setName: string;
  cardType: CardType;
  
  // Pokemon-specific
  pokemonType?: PokemonType;
  rarity: Rarity;
  hp?: number;
  stage?: EvolutionStage;      // BASIC | STAGE_1 | STAGE_2 | MEGA | VMAX
  evolvesFrom?: string;        // Previous evolution name
  
  // Abilities & Attacks
  ability?: Ability;
  attacks?: Attack[];
  
  // Weaknesses & Resistances
  weakness?: Weakness;
  resistance?: Resistance;
  retreatCost?: number;
  
  // Metadata
  artist: string;
  description: string;
  imageUrl: string;
  
  // Trainer-specific
  trainerType?: TrainerType;   // ITEM | SUPPORTER | STADIUM | TOOL
  
  // Energy-specific
  energyType?: EnergyType;
  providesEnergy?: EnergyType[];
  special?: boolean;
}
```

**UI Usage:**
- Card detail modal/page
- Full card display
- Print view

---

### 4. Ability

Pokemon ability or power.

```typescript
interface Ability {
  name: string;                // e.g., "Damage Swap"
  text: string;                // Full ability text
  activationType: AbilityActivationType;  // PASSIVE | TRIGGERED | ACTIVATED
  usageLimit: UsageLimit;      // ONCE_PER_TURN | ONCE_PER_GAME | UNLIMITED
  effects?: AbilityEffect[];   // Structured effects (for advanced features)
}
```

**UI Usage:**
- Ability section in card detail
- Ability icon/badge
- Ability description formatting

---

### 5. Attack

Pokemon attack.

```typescript
interface Attack {
  name: string;                // e.g., "Confuse Ray"
  energyCost: EnergyType[];    // Array of energy types needed
  damage: string;              // e.g., "30", "20+", "30×"
  text?: string;               // Attack effect description
  preconditions?: AttackPrecondition[];  // Conditions to use attack
  effects?: AttackEffect[];    // Structured effects
}
```

**UI Usage:**
- Attack section in card detail
- Energy cost icons
- Damage display
- Effect text formatting

---

### 6. Weakness

Card weakness.

```typescript
interface Weakness {
  type: PokemonType;           // e.g., PSYCHIC
  modifier: string;            // e.g., "×2", "+20"
}
```

**UI Usage:**
- Weakness icon with modifier
- Type-specific coloring

---

### 7. Resistance

Card resistance.

```typescript
interface Resistance {
  type: PokemonType;           // e.g., FIGHTING
  modifier: string;            // e.g., "-30"
}
```

**UI Usage:**
- Resistance icon with modifier
- Type-specific coloring

---

### 8. Search Filters

Search and filter parameters.

```typescript
interface SearchFilters {
  query?: string;              // Text search
  cardType?: CardType;
  pokemonType?: PokemonType;
  author?: string;
  rarity?: Rarity;
  limit?: number;              // Results per page (default: 50, max: 500)
  offset?: number;             // Pagination offset (default: 0)
}
```

**UI Usage:**
- Search form
- Filter sidebar
- URL query parameters

---

### 9. Enums

#### CardType
```typescript
enum CardType {
  POKEMON = 'POKEMON',
  TRAINER = 'TRAINER',
  ENERGY = 'ENERGY'
}
```

#### PokemonType
```typescript
enum PokemonType {
  GRASS = 'GRASS',
  FIRE = 'FIRE',
  WATER = 'WATER',
  LIGHTNING = 'LIGHTNING',
  PSYCHIC = 'PSYCHIC',
  FIGHTING = 'FIGHTING',
  DARKNESS = 'DARKNESS',
  METAL = 'METAL',
  FAIRY = 'FAIRY',
  DRAGON = 'DRAGON',
  COLORLESS = 'COLORLESS'
}
```

**UI Usage:** Type icons, color schemes, filter options

#### Rarity
```typescript
enum Rarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  RARE_HOLO = 'RARE_HOLO',
  RARE_ULTRA = 'RARE_ULTRA',
  RARE_SECRET = 'RARE_SECRET',
  PROMO = 'PROMO'
}
```

**UI Usage:** Rarity badges, card borders, holo effects

#### EvolutionStage
```typescript
enum EvolutionStage {
  BASIC = 'BASIC',
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  MEGA = 'MEGA',
  VMAX = 'VMAX',
  VSTAR = 'VSTAR'
}
```

**UI Usage:** Stage indicator, evolution chain display

#### AbilityActivationType
```typescript
enum AbilityActivationType {
  PASSIVE = 'PASSIVE',
  TRIGGERED = 'TRIGGERED',
  ACTIVATED = 'ACTIVATED'
}
```

#### UsageLimit
```typescript
enum UsageLimit {
  ONCE_PER_TURN = 'ONCE_PER_TURN',
  ONCE_PER_GAME = 'ONCE_PER_GAME',
  UNLIMITED = 'UNLIMITED'
}
```

---

## Backend API Integration

### Base URL

```
http://localhost:3000/api/v1/cards
```

For production, use environment variable: `VITE_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`

---

### API Endpoints

#### 1. Load Card Sets

**Purpose:** Load card sets from JSON files into backend memory.

```typescript
POST /api/v1/cards/load

// Request
interface LoadCardsRequest {
  sets: Array<{
    author: string;
    setName: string;
    version: string;
  }>;
}

// Response
interface LoadCardsResponse {
  success: boolean;
  totalLoaded: number;
  results: Array<{
    success: boolean;
    author: string;
    setName: string;
    version: string;
    loaded: number;
    filename: string;
    error?: string;
  }>;
}
```

**Frontend Usage:**
- Admin panel or initial app setup
- "Load Set" button
- Show loading progress and results
- Display success/error messages per set

**Example:**
```typescript
const loadSets = async () => {
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
  
  if (result.success) {
    console.log(`Successfully loaded ${result.totalLoaded} cards`);
  } else {
    console.error('Some sets failed to load:', result.results);
  }
};
```

---

#### 2. List Available Sets

**Purpose:** Get all loaded card sets (with optional filters).

```typescript
GET /api/v1/cards/sets?author={author}&official={true|false}

// Response
interface GetSetsResponse {
  sets: CardSet[];
  total: number;
}
```

**Frontend Usage:**
- Set selector dropdown
- "Browse Sets" page
- Filter by author or official status
- Display set cards with metadata

**Example:**
```typescript
const fetchSets = async (filters?: { author?: string; official?: boolean }) => {
  const params = new URLSearchParams();
  if (filters?.author) params.append('author', filters.author);
  if (filters?.official !== undefined) params.append('official', String(filters.official));
  
  const response = await fetch(`http://localhost:3000/api/v1/cards/sets?${params}`);
  const data = await response.json();
  
  return data.sets;
};
```

---

#### 3. Get Cards from Set

**Purpose:** Get all cards from a specific set.

```typescript
GET /api/v1/cards/sets/{author}/{setName}/v{version}

// Response
interface GetCardsResponse {
  set: CardSet;
  cards: CardSummary[];
  count: number;
}
```

**Frontend Usage:**
- "View Set" page
- Display cards in grid
- Show set metadata in header
- Navigate to individual cards

**Example:**
```typescript
const fetchSetCards = async (author: string, setName: string, version: string) => {
  // URL encode the setName (spaces → %20)
  const encodedSetName = encodeURIComponent(setName);
  
  const response = await fetch(
    `http://localhost:3000/api/v1/cards/sets/${author}/${encodedSetName}/v${version}`
  );
  
  if (!response.ok) {
    throw new Error(`Set not found: ${author}-${setName}-v${version}`);
  }
  
  return await response.json();
};
```

---

#### 4. Get Single Card

**Purpose:** Get detailed information about a specific card.

```typescript
GET /api/v1/cards/{cardId}

// Response: CardDetail
```

**Frontend Usage:**
- Card detail modal/page
- "View Card" functionality
- Deep linking to specific cards
- Card preview popups

**Example:**
```typescript
const fetchCardDetails = async (cardId: string) => {
  const response = await fetch(`http://localhost:3000/api/v1/cards/${cardId}`);
  
  if (!response.ok) {
    throw new Error(`Card not found: ${cardId}`);
  }
  
  return await response.json();
};
```

---

#### 5. Search Cards

**Purpose:** Search and filter cards with pagination.

```typescript
GET /api/v1/cards/search?query={text}&cardType={type}&pokemonType={type}&author={author}&rarity={rarity}&limit={50}&offset={0}

// Response
interface SearchCardsResponse {
  results: CardSummary[];
  total: number;
  limit: number;
  offset: number;
}
```

**Frontend Usage:**
- Global search bar
- Advanced search page
- Filter sidebar
- Paginated results
- "Load more" or pagination controls

**Example:**
```typescript
const searchCards = async (filters: SearchFilters) => {
  const params = new URLSearchParams();
  
  if (filters.query) params.append('query', filters.query);
  if (filters.cardType) params.append('cardType', filters.cardType);
  if (filters.pokemonType) params.append('pokemonType', filters.pokemonType);
  if (filters.author) params.append('author', filters.author);
  if (filters.rarity) params.append('rarity', filters.rarity);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));
  
  const response = await fetch(`http://localhost:3000/api/v1/cards/search?${params}`);
  return await response.json();
};
```

---

### Error Handling

All API errors follow NestJS format:

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
```

**Frontend Error Handling:**
```typescript
const handleApiError = (error: ApiError) => {
  switch (error.statusCode) {
    case 404:
      showNotification('Resource not found', 'error');
      break;
    case 409:
      showNotification('Resource already exists', 'warning');
      break;
    case 400:
      showNotification('Invalid request', 'error');
      break;
    case 500:
      showNotification('Server error, please try again', 'error');
      break;
    default:
      showNotification(error.message, 'error');
  }
};
```

---

## Frontend Architecture

### Recommended Tech Stack

#### Option 1: React + TypeScript + Vite
- **React 18+**: Component-based UI
- **TypeScript**: Type safety matching backend
- **Vite**: Fast development and builds
- **React Router**: Client-side routing
- **TanStack Query (React Query)**: API data fetching and caching
- **Zustand or Redux**: Global state management
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animations (card flips, transitions)

#### Option 2: Next.js + TypeScript
- **Next.js 14+**: React framework with SSR/SSG
- **TypeScript**: Type safety
- **App Router**: Modern routing with server components
- **SWR or TanStack Query**: Data fetching
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations

### Project Structure

```
frontend/
├── src/
│   ├── api/                    # API client and service layer
│   │   ├── cards.api.ts        # Card API functions
│   │   ├── sets.api.ts         # Set API functions
│   │   └── client.ts           # Base HTTP client (axios/fetch)
│   │
│   ├── types/                  # TypeScript types/interfaces
│   │   ├── card.types.ts       # Card entities
│   │   ├── set.types.ts        # Set entities
│   │   └── enums.ts            # All enums
│   │
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Generic components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── Pagination.tsx
│   │   │
│   │   ├── card/               # Card-specific components
│   │   │   ├── CardGrid.tsx
│   │   │   ├── CardItem.tsx
│   │   │   ├── CardDetail.tsx
│   │   │   ├── CardImage.tsx
│   │   │   ├── EnergyIcon.tsx
│   │   │   ├── TypeIcon.tsx
│   │   │   ├── RarityBadge.tsx
│   │   │   └── AttackDisplay.tsx
│   │   │
│   │   ├── set/                # Set-specific components
│   │   │   ├── SetSelector.tsx
│   │   │   ├── SetCard.tsx
│   │   │   └── SetMetadata.tsx
│   │   │
│   │   └── filters/            # Filter components
│   │       ├── FilterSidebar.tsx
│   │       ├── TypeFilter.tsx
│   │       └── RarityFilter.tsx
│   │
│   ├── pages/                  # Page components (or routes/)
│   │   ├── HomePage.tsx        # Landing page
│   │   ├── SetBrowserPage.tsx  # Browse all sets
│   │   ├── SetDetailPage.tsx   # View specific set
│   │   ├── CardDetailPage.tsx  # View specific card
│   │   ├── SearchPage.tsx      # Search/filter cards
│   │   └── LoadSetPage.tsx     # Admin: load sets
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useCards.ts         # Card data fetching
│   │   ├── useSets.ts          # Set data fetching
│   │   ├── useSearch.ts        # Search logic
│   │   └── useCardDetail.ts    # Card detail logic
│   │
│   ├── store/                  # Global state (if using Zustand/Redux)
│   │   ├── searchStore.ts      # Search filters state
│   │   └── uiStore.ts          # UI state (modals, etc.)
│   │
│   ├── utils/                  # Utility functions
│   │   ├── formatters.ts       # Data formatting
│   │   ├── colors.ts           # Type/rarity colors
│   │   └── validators.ts       # Input validation
│   │
│   ├── assets/                 # Static assets
│   │   ├── icons/              # Energy/type icons
│   │   └── images/             # Placeholder images
│   │
│   ├── styles/                 # Global styles
│   │   ├── globals.css
│   │   └── card-styles.css     # Card-specific styling
│   │
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
│
├── public/                     # Public assets
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts              # or next.config.js
└── README.md
```

---

## User Interface Components

### 1. Navigation

**AppHeader**
- Logo and app name
- Global search bar
- Navigation links (Home, Browse Sets, Search)
- Theme toggle (optional)

```typescript
<AppHeader>
  <Logo />
  <GlobalSearchBar onSearch={handleSearch} />
  <Nav>
    <NavLink to="/">Home</NavLink>
    <NavLink to="/sets">Browse Sets</NavLink>
    <NavLink to="/search">Search</NavLink>
  </Nav>
</AppHeader>
```

---

### 2. Card Components

**CardItem** (Grid/List Item)
- Card image
- Card name
- HP (if Pokemon)
- Type icon
- Rarity indicator
- Card number
- Hover effect (lift, glow)
- Click to view details

```typescript
<CardItem 
  card={card} 
  onClick={() => navigateToDetail(card.cardId)}
/>
```

**CardDetail** (Full View)
- Large card image
- Complete stats
- Ability section
- Attacks section
- Weakness/resistance icons
- Retreat cost
- Artist credit
- Description/Pokedex entry
- Evolution info (with links)
- Set info
- Print/share buttons

```typescript
<CardDetail cardId={cardId}>
  <CardImage src={card.imageUrl} alt={card.name} />
  <CardStats hp={card.hp} type={card.pokemonType} />
  {card.ability && <AbilitySection ability={card.ability} />}
  <AttacksSection attacks={card.attacks} />
  <WeaknessResistance 
    weakness={card.weakness} 
    resistance={card.resistance} 
  />
  <CardMetadata 
    artist={card.artist} 
    setName={card.setName} 
    cardNumber={card.cardNumber} 
  />
</CardDetail>
```

**TypeIcon**
- Icon for Pokemon/Energy types
- Color-coded
- Tooltip with type name

**EnergyIcon**
- Energy symbol icons
- Used in attack costs
- Stack multiple icons

**RarityBadge**
- Rarity indicator
- Color-coded border/background
- Icon or text

---

### 3. Set Components

**SetCard**
- Set image/icon
- Set name
- Total cards count
- Release date
- Official badge
- Author
- Click to browse set

```typescript
<SetCard 
  set={set} 
  onClick={() => navigateToSet(set.author, set.setName, set.version)}
/>
```

**SetSelector** (Dropdown)
- List of available sets
- Filter by author/official
- Search sets by name
- Select to view

---

### 4. Search & Filter Components

**SearchBar**
- Text input for card name search
- Real-time/debounced search
- Clear button
- Search icon

**FilterSidebar**
- Card type filter (checkboxes)
- Pokemon type filter (checkboxes with icons)
- Rarity filter (checkboxes)
- Author filter (dropdown/checkboxes)
- Clear all filters button
- Apply button (mobile)

**SearchResults**
- Grid of card items
- Result count
- Sorting options (name, card number, type, rarity)
- Pagination or infinite scroll
- "No results" state

---

### 5. Layout Components

**CardGrid**
- Responsive grid layout
- Adjusts columns based on screen size
- Gap between cards
- Loading skeleton states

```typescript
<CardGrid>
  {cards.map(card => (
    <CardItem key={card.cardId} card={card} />
  ))}
</CardGrid>
```

**Modal**
- Card detail modal overlay
- Close button
- Backdrop click to close
- Smooth animations

---

### 6. Utility Components

**Pagination**
- Previous/Next buttons
- Page numbers
- Jump to page
- Results per page selector

**Loading**
- Loading spinner
- Skeleton cards
- Progress bar (for loading sets)

**ErrorBoundary**
- Catch component errors
- Display friendly error message
- Retry button

**EmptyState**
- "No cards found" message
- Suggestions (clear filters, try different search)
- Illustration

---

## User Flows

### Flow 1: Browse a Card Set

1. User lands on homepage
2. Clicks "Browse Sets" in navigation
3. Views list of available sets (with metadata)
4. Clicks on "Pokemon Base Set"
5. Views grid of all 102 cards from the set
6. Clicks on "Alakazam" card
7. Views full card details (HP, attacks, ability, etc.)
8. Clicks on "Kadabra" (evolves from)
9. Views Kadabra's card details

**Components:**
- HomePage
- SetBrowserPage
- SetCard
- SetDetailPage
- CardGrid
- CardItem
- CardDetailPage
- CardDetail

---

### Flow 2: Search for Cards

1. User types "Pikachu" in global search bar
2. Redirected to SearchPage with results
3. Sees 4 Pikachu cards from different sets
4. Applies filter: "LIGHTNING" type
5. Applies filter: "RARE_HOLO" rarity
6. Sees 1 result: "Pikachu (Holo)"
7. Clicks card to view details

**Components:**
- GlobalSearchBar
- SearchPage
- FilterSidebar
- SearchResults
- CardGrid
- CardItem
- CardDetail

---

### Flow 3: Load a New Set (Admin)

1. User navigates to "Load Set" page (admin only)
2. Enters set information:
   - Author: "pokemon"
   - Set Name: "Jungle"
   - Version: "1.0"
3. Clicks "Load Set" button
4. Sees loading progress
5. Success message: "Loaded 64 cards from Pokemon Jungle v1.0"
6. Set now appears in "Browse Sets"

**Components:**
- LoadSetPage
- LoadSetForm
- ProgressBar
- SuccessMessage

---

### Flow 4: Filter by Type and Rarity

1. User navigates to Search page
2. Opens filter sidebar
3. Checks "FIRE" type
4. Checks "RARE_HOLO" rarity
5. Clicks "Apply Filters"
6. Views filtered results (all Fire-type Holo rares)
7. Scrolls and loads more results (pagination)
8. Clicks "Clear Filters" to reset

**Components:**
- SearchPage
- FilterSidebar
- TypeFilter
- RarityFilter
- SearchResults
- Pagination

---

## Technical Recommendations

### 1. API Client Setup

Create a centralized API client for type safety and reusability:

```typescript
// src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.statusCode, error.message);
    }

    return await response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.statusCode, error.message);
    }

    return await response.json();
  }
}

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
```

```typescript
// src/api/cards.api.ts
import { apiClient } from './client';
import type { CardDetail, CardSummary, SearchCardsResponse, SearchFilters } from '../types';

export const cardsApi = {
  searchCards: (filters: SearchFilters) => {
    const params: Record<string, string> = {};
    if (filters.query) params.query = filters.query;
    if (filters.cardType) params.cardType = filters.cardType;
    if (filters.pokemonType) params.pokemonType = filters.pokemonType;
    if (filters.author) params.author = filters.author;
    if (filters.rarity) params.rarity = filters.rarity;
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.offset) params.offset = String(filters.offset);
    
    return apiClient.get<SearchCardsResponse>('/cards/search', params);
  },

  getCardById: (cardId: string) => {
    return apiClient.get<CardDetail>(`/cards/${cardId}`);
  },

  // ... other methods
};
```

---

### 2. React Query Integration

Use TanStack Query for efficient data fetching and caching:

```typescript
// src/hooks/useCards.ts
import { useQuery } from '@tanstack/react-query';
import { cardsApi } from '../api/cards.api';
import type { SearchFilters } from '../types';

export const useSearchCards = (filters: SearchFilters) => {
  return useQuery({
    queryKey: ['cards', 'search', filters],
    queryFn: () => cardsApi.searchCards(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCardDetail = (cardId: string) => {
  return useQuery({
    queryKey: ['cards', cardId],
    queryFn: () => cardsApi.getCardById(cardId),
    enabled: !!cardId,
  });
};
```

---

### 3. Type Safety

Import types directly from a shared types file:

```typescript
// src/types/enums.ts
export enum CardType {
  POKEMON = 'POKEMON',
  TRAINER = 'TRAINER',
  ENERGY = 'ENERGY'
}

export enum PokemonType {
  GRASS = 'GRASS',
  FIRE = 'FIRE',
  WATER = 'WATER',
  // ... etc
}

// src/types/card.types.ts
import { CardType, PokemonType, Rarity } from './enums';

export interface CardSummary {
  cardId: string;
  instanceId: string;
  name: string;
  // ... rest of fields
}

export interface CardDetail extends CardSummary {
  // ... additional fields
}
```

---

### 4. UI/UX Best Practices

**Performance:**
- Lazy load images with `loading="lazy"`
- Use React.memo for card components
- Virtualize long lists (react-window)
- Debounce search input (300ms)

**Accessibility:**
- Semantic HTML elements
- ARIA labels for icons
- Keyboard navigation support
- Focus management in modals
- Alt text for card images

**Responsive Design:**
- Mobile-first approach
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Touch-friendly tap targets (min 44x44px)
- Bottom navigation for mobile
- Responsive card grid (1-2-3-4 columns)

**Visual Polish:**
- Type-based color schemes (Fire = red, Water = blue, etc.)
- Smooth hover transitions
- Card flip animations
- Holo/foil effects for rare cards
- Loading skeletons
- Toasts for notifications

---

### 5. State Management

**Local Component State:**
- Form inputs
- Modal open/close
- Accordion expand/collapse

**URL State (React Router):**
- Search query
- Filter parameters
- Current page/offset
- Selected card ID

**Global State (Zustand):**
- Active search filters
- Recently viewed cards
- User preferences (theme, view mode)

Example Zustand store:
```typescript
// src/store/searchStore.ts
import { create } from 'zustand';
import type { SearchFilters } from '../types';

interface SearchStore {
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  filters: {
    limit: 50,
    offset: 0,
  },
  setFilters: (filters) => 
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => 
    set({ filters: { limit: 50, offset: 0 } }),
}));
```

---

### 6. Environment Variables

```bash
# .env.example
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=OpenTCG
VITE_ENABLE_ANIMATIONS=true
```

---

## Summary

This frontend application will provide a rich, interactive interface for exploring TCG cards by:

1. **Consuming the OpenTCG Backend API** for all card data
2. **Displaying cards visually** in a card-like format with proper styling
3. **Enabling search and filtering** with multiple criteria
4. **Providing detailed card information** with abilities, attacks, and stats
5. **Supporting set browsing** with set metadata and organization
6. **Offering a responsive, accessible UI** for all device sizes

The architecture follows modern best practices with TypeScript, React, and clean separation of concerns between API layer, business logic, and UI components.

---

## Next Steps

1. Set up the frontend project with chosen framework (React/Next.js)
2. Create TypeScript types matching backend entities
3. Implement API client with error handling
4. Build core components (CardItem, CardDetail, CardGrid)
5. Create page layouts and routing
6. Implement search and filtering logic
7. Add styling and animations
8. Test with real backend data
9. Deploy frontend application

---

**For Backend API Details:** See [/docs/API.md](/docs/API.md)

