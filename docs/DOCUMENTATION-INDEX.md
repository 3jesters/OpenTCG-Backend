# OpenTCG Documentation Index

Complete guide to all documentation in this project.

---

## 📚 Overview

This project contains comprehensive documentation for both the **backend API** and the **frontend application** (to be built).

---

## 🔧 Backend Documentation

### [API.md](./API.md)
**Complete REST API reference for the OpenTCG Backend (Card API)**

**Contains:**
- All 5 Card API endpoints with examples
- Request/response formats
- Data structures and enums
- Error handling
- Client implementation guide
- Example workflows

**Use this when:**
- Implementing Card API calls in the frontend
- Testing Card API endpoints
- Understanding card data structures
- Debugging Card API issues

**Quick Example:**
```bash
# Search for Pikachu cards
curl "http://localhost:3000/api/v1/cards/search?query=pikachu"
```

---

### [DECK-API.md](./DECK-API.md)
**Complete REST API reference for Deck Management**

**Contains:**
- All 6 Deck API endpoints with examples
- Deck CRUD operations
- Deck validation endpoints
- Request/response formats
- TypeScript interfaces
- Frontend integration examples (React, Vue)
- Error handling
- UI/UX recommendations

**Use this when:**
- Implementing deck management features
- Building deck builder interfaces
- Validating decks against tournaments
- Understanding deck data structures
- Integrating deck APIs in frontend

**Quick Example:**
```bash
# Create a new deck
curl -X POST http://localhost:3000/api/v1/decks \
  -H "Content-Type: application/json" \
  -d '{"name":"My Deck","createdBy":"player-1","cards":[]}'
```

---

### [MATCH-API.md](./MATCH-API.md)
**Complete REST API reference for Match Management**

**Contains:**
- All 5 Match API endpoints with examples
- Match creation and joining
- Match state management
- Player action execution
- State machine documentation
- Request/response formats
- TypeScript interfaces
- Frontend integration examples (React hooks)
- Error handling
- Communication flow patterns

**Use this when:**
- Implementing match gameplay features
- Building match UI components
- Understanding match state machine
- Executing player actions
- Polling for match state updates
- Integrating match APIs in frontend

**Quick Example:**
```bash
# Create a new match
curl -X POST http://localhost:3000/api/v1/matches \
  -H "Content-Type: application/json" \
  -d '{"tournamentId":"classic-tournament","player1Id":"player-1","player1DeckId":"deck-123"}'
```

---

### [CLIENT-MATCH-FLOW.md](./CLIENT-MATCH-FLOW.md)
**Complete guide for implementing match communication flow**

**Contains:**
- Complete API reference for match flow
- Data structures and TypeScript interfaces
- Communication flow patterns
- State machine explanation
- Polling strategies
- How to detect state changes
- How to handle your turn vs opponent's turn
- State change detection algorithms
- React and Vue implementation examples
- Best practices and error handling

**Use this when:**
- Implementing the complete match communication flow
- Understanding how to poll for state updates
- Detecting opponent actions and state changes
- Building match state management
- Implementing turn-based gameplay logic
- Handling state synchronization

**Quick Example:**
```typescript
// Poll for state updates
const state = await getMatchState(matchId, playerId);

// Detect changes
const changes = detectStateChanges(previousState, currentState);

// Execute action when it's your turn
if (state.currentPlayer === myPlayerId) {
  await executeAction(matchId, playerId, 'ATTACH_ENERGY', {...});
}
```

---

### [CLIENT-MATCH-LIFECYCLE.md](./CLIENT-MATCH-LIFECYCLE.md)
**Complete step-by-step guide for the match lifecycle from creation to gameplay**

**Contains:**
- All 7 stages of the match lifecycle
- API calls for each stage
- Expected states and responses
- Visibility rules (opponent deck, active Pokemon, etc.)
- Client implementation checklist
- Complete code examples (TypeScript, React hooks)
- Polling strategies for each stage
- State transition detection

**Use this when:**
- Implementing the complete match flow from start to finish
- Understanding what happens at each stage
- Knowing what API calls to make and when
- Understanding visibility rules (when opponent info is hidden/shown)
- Building the initial match setup UI
- Implementing match approval flow
- Setting up initial card drawing and Pokemon selection

**Quick Example:**
```typescript
// Stage 1: Create match
const match = await createMatch(tournamentId, playerId, deckId);

// Stage 3: Approve match
```

---

### [CLIENT-SET-PRIZE-CARDS-GUIDE.md](./CLIENT-SET-PRIZE-CARDS-GUIDE.md)
**Complete guide for implementing the SET_PRIZE_CARDS phase**

**Contains:**
- Detailed request/response examples for SET_PRIZE_CARDS phase
- State detection and polling strategies
- Error handling examples
- Complete React/TypeScript implementation example
- UI mockups and visual indicators
- Step-by-step implementation guide

**Use this when:**
- Implementing the prize cards setup phase in the client
- Understanding how to handle SET_PRIZE_CARDS state
- Building UI for setting prize cards
- Handling the transition from DRAWING_CARDS to SELECT_ACTIVE_POKEMON

**Quick Example:**
```typescript
// Set prize cards
POST /api/v1/matches/:matchId/actions
{
  "playerId": "player-1",
  "actionType": "SET_PRIZE_CARDS"
}
```

---
await approveMatch(matchId, playerId);

// Stage 4: Draw initial cards
await drawInitialCards(matchId, playerId);

// Stage 5: Select active Pokemon
await setActivePokemon(matchId, playerId, cardId);
```

---

### [CLIENT-GAMEPLAY-ACTIONS.md](./CLIENT-GAMEPLAY-ACTIONS.md)
**Complete guide for gameplay actions during a match**

**Contains:**
- DRAW_CARD action (draw from deck, transition to MAIN_PHASE)
- ATTACH_ENERGY action (attach energy to Pokemon)
- EVOLVE_POKEMON action (evolve Pokemon on bench/active)
- END_TURN action (end turn, switch to next player)
- Complete gameplay flow examples
- State polling during opponent's turn
- Response structures and error handling
- Best practices and implementation tips

**Use this when:**
- Implementing gameplay actions during PLAYER_TURN
- Understanding how to draw cards, attach energy, evolve Pokemon
- Building turn-based gameplay UI
- Handling state transitions between phases
- Polling for opponent actions
- Implementing action validation and error handling

**Quick Example:**
```typescript
// Draw a card
await executeAction(matchId, playerId, 'DRAW_CARD', {});

// Attach energy
await executeAction(matchId, playerId, 'ATTACH_ENERGY', {
  energyCardId: 'pokemon-base-set-v1.0-fire-energy--99',
  target: 'ACTIVE'
});

// Evolve Pokemon
await executeAction(matchId, playerId, 'EVOLVE_POKEMON', {
  evolutionCardId: 'pokemon-base-set-v1.0-ivysaur--30',
  target: 'BENCH_0'
});

// End turn
await executeAction(matchId, playerId, 'END_TURN', {});
```

---

### [CLIENT-RETREAT-GUIDE.md](./CLIENT-RETREAT-GUIDE.md)
**Complete guide for implementing retreat functionality**

**Contains:**
- RETREAT action API endpoint and request structure
- Energy selection handling (similar to attack energy costs)
- Pre-check retreat cost vs error handling approaches
- Complete request/response examples
- Error handling for all edge cases
- Status effect clearing behavior
- Validation rules and best practices
- Complete TypeScript implementation examples

**Use this when:**
- Implementing retreat functionality in the client
- Handling energy selection for retreat
- Understanding retreat validation rules
- Building retreat UI components
- Handling retreat error responses
- Understanding status effect clearing on retreat

**Quick Example:**
```typescript
// Check retreat cost and attempt retreat
const retreatCost = getRetreatCost(activePokemonCard);

if (retreatCost > 0) {
  // Show energy selection modal
  const selectedEnergyIds = await showEnergySelectionModal({
    amount: retreatCost,
    energyType: null,
    availableEnergy: activePokemon.attachedEnergy,
  });
  
  // Submit retreat with energy selection
  await submitRetreat(matchId, playerId, 'BENCH_0', selectedEnergyIds);
} else {
  // Free retreat
  await submitRetreat(matchId, playerId, 'BENCH_0');
}
```

---

### [CLIENT-COIN-FLIP-SYSTEM.md](./CLIENT-COIN-FLIP-SYSTEM.md)
**Complete guide for coin flip system and client interaction**

**Contains:**
- How to detect when coin flip is needed
- Coin flip states (READY_TO_FLIP, FLIP_RESULT, COMPLETED)
- Client-server communication flow
- GENERATE_COIN_FLIP action execution
- Handling coin flip results
- Different coin flip contexts (ATTACK, STATUS_CHECK, etc.)
- Damage calculation types
- Complete TypeScript examples
- Error handling patterns
- Best practices for UI implementation

**Use this when:**
- Implementing coin flip UI components
- Handling attacks that require coin flips
- Managing status effect coin flips (e.g., sleep checks)
- Displaying coin flip results to players
- Understanding coin flip state transitions
- Building interactive coin flip dialogs

**Quick Example:**
```typescript
// Check if coin flip needed
if (matchState.coinFlipState?.status === 'READY_TO_FLIP') {
  // Show coin flip UI
  showCoinFlipDialog();
  
  // Execute coin flip
  const result = await executeAction(matchId, playerId, 'GENERATE_COIN_FLIP', {});
  
  // Display results
  displayCoinFlipResults(result.lastAction.actionData.coinFlipResults);
}
```

---

### [CLIENT_STATUS_EFFECT_COIN_FLIP_FIX.md](./CLIENT_STATUS_EFFECT_COIN_FLIP_FIX.md)
**Client documentation for status effect coin flip bug fix**

**Contains:**
- Explanation of the bug fix (status effects now respect coin flip results)
- Before/after behavior comparison
- Affected attack patterns ("if heads", "if tails")
- API response changes with examples
- Client-side implementation recommendations
- TypeScript code examples for status effect display logic
- Testing recommendations
- Migration notes

**Use this when:**
- Updating client code to handle status effects correctly
- Understanding why status effects may not apply after coin flips
- Implementing status effect display logic
- Verifying coin flip results match status effect requirements
- Testing attacks with coin flip status effects

**Quick Example:**
```typescript
// Check if status effect should be displayed
function shouldShowStatusEffect(
  actionData: AttackActionData,
  opponentPokemon: PokemonState
): boolean {
  const hasStatusEffect = opponentPokemon.statusEffects.length > 0;
  
  // If coin flip was involved, verify it succeeded
  if (actionData.coinFlipResults?.length > 0) {
    const requiresHeads = attackText.toLowerCase().includes('if heads');
    const coinFlipResult = actionData.coinFlipResults[0].result;
    const conditionMet = requiresHeads ? coinFlipResult === 'heads' : coinFlipResult === 'tails';
    return conditionMet && hasStatusEffect;
  }
  
  return hasStatusEffect;
}
```

---

### [MATCH-STATE-MACHINE-DIAGRAM.md](./MATCH-STATE-MACHINE-DIAGRAM.md)
**Visual state machine diagram for match states**

**Contains:**
- Mermaid state diagram showing all states and transitions
- State descriptions and purposes
- State transition table
- Turn phases within PLAYER_TURN state
- Win conditions
- Complete match lifecycle example
- Text-based state flow diagram
- Special cases and implementation notes

**Use this when:**
- Understanding the complete state machine flow
- Visualizing state transitions
- Debugging state-related issues
- Planning state-based features
- Understanding when states can transition
- Learning the match lifecycle

**Quick Reference:**
```
CREATED → WAITING_FOR_PLAYERS → DECK_VALIDATION → PRE_GAME_SETUP
  → INITIAL_SETUP → PLAYER_TURN ↔ BETWEEN_TURNS → MATCH_ENDED
```

---

### [CLIENT-DECK-CACHING.md](./CLIENT-DECK-CACHING.md)
**Client-side guide for deck caching and card information management**

**Contains:**
- How to use deck IDs from match state
- Fetching deck information and card details
- Caching strategies and best practices
- TypeScript implementation examples
- React hooks with React Query
- Error handling patterns
- Performance optimization tips

**Use this when:**
- Implementing deck caching in the frontend
- Fetching full card details for match display
- Optimizing API calls during gameplay
- Building card display components
- Managing client-side cache

**Quick Example:**
```typescript
// Get match state (includes deck IDs)
const state = await getMatchState(matchId, playerId);

// Fetch decks with cards
const playerDeck = await fetch(`/api/v1/decks/${state.playerDeckId}`);
const opponentDeck = await fetch(`/api/v1/decks/${state.opponentDeckId}`);
```

---

### [TRAINER-EFFECTS-CLIENT-GUIDE.md](./TRAINER-EFFECTS-CLIENT-GUIDE.md)
**Complete guide for trainer card effects and client UI requirements**

**Contains:**
- All 19+ supported trainer effects
- Required actionData for each effect
- Client UI/UX requirements for each effect
- Target type reference (player vs opponent)
- Multiple effects handling
- Summary table of all effects
- Implementation tips and best practices

**Use this when:**
- Implementing trainer card UI
- Building selection modals for trainer effects
- Understanding what UI to show for each effect type
- Handling multiple effects on single cards
- Determining which Pokémon/cards to show based on target type

**Quick Example:**
```typescript
// Check trainer effects from card metadata
const card = await getCardById(cardId);
const effects = card.trainerEffects;

// For HEAL effect with ALL_YOURS target
if (effects.some(e => e.effectType === 'HEAL' && e.target === 'ALL_YOURS')) {
  // Show player's active and bench Pokémon selection modal
  const target = await showPokemonSelectionModal('player');
  await executeAction(matchId, playerId, 'PLAY_TRAINER', {
    cardId,
    target: target.position // 'ACTIVE' or 'BENCH_X'
  });
}
```

---

### [ENUMS-REFERENCE.md](./ENUMS-REFERENCE.md)
**Complete reference guide for all enum types used throughout the OpenTCG backend**

**Contains:**
- All 35+ enum types organized by domain (Card, Match, Tournament)
- Complete list of values for each enum
- Usage examples and code snippets
- Enum relationships and dependencies
- Best practices for enum usage
- Cross-domain enum conversions

**Use this when:**
- Understanding what enum values are available
- Looking up valid values for a specific enum type
- Understanding relationships between enums
- Implementing type-safe code with enums
- Converting between domain enums (e.g., StatusCondition → StatusEffect)
- Debugging enum-related issues

**Quick Example:**
```typescript
// Check card type
if (card.cardType === CardType.POKEMON) {
  // Access Pokemon-specific fields
  const pokemonType = card.pokemonType; // PokemonType enum
}

// Check ability activation
if (ability.activationType === AbilityActivationType.ACTIVATED) {
  // Check usage limit
  if (ability.usageLimit === UsageLimit.ONCE_PER_TURN) {
    // Validate usage tracking
  }
}

// Check match state
if (match.state === MatchState.PLAYER_TURN) {
  // Check turn phase
  if (gameState.turnPhase === TurnPhase.MAIN_PHASE) {
    // Allow main phase actions
  }
}
```

---

### [FRONTEND-START-GAME-RULES.md](./FRONTEND-START-GAME-RULES.md)
**Frontend guide for start game rules and reshuffle feature**

**Contains:**
- API changes (new `revealedHand` field)
- TypeScript interfaces for updated match state
- Display logic for revealed hands during INITIAL_SETUP
- React component examples
- UI/UX recommendations
- Styling examples with CSS/Tailwind
- Error handling patterns
- Testing considerations

**Use this when:**
- Implementing the reshuffle UI feature
- Displaying opponent's revealed hand during initial setup
- Handling match state transitions
- Building revealed hand components
- Styling revealed cards differently from normal hands

**Quick Example:**
```typescript
// Check if revealed hand should be shown
const isInitialSetup = matchState.state === MatchState.INITIAL_SETUP;
const revealedHand = matchState.opponentState.revealedHand;

if (isInitialSetup && revealedHand) {
  // Display revealed hand
}
```

---

## 🎨 Frontend Documentation

### [FRONTEND-APP.md](./FRONTEND-APP.md)
**Complete guide for building the frontend application**

**Contains:**
- Application purpose and features
- All entities and TypeScript interfaces
- API integration details
- Architecture recommendations
- Component structure
- User flows
- Technical best practices

**Use this when:**
- Planning the frontend architecture
- Understanding data models
- Designing user flows
- Setting up the project
- Making architectural decisions

**Covers:**
- 9 core entities (CardSummary, CardDetail, CardSet, etc.)
- 5 API endpoints with TypeScript examples
- Complete project structure
- React Query integration
- State management strategies

**File Size:** ~26 KB (comprehensive guide)

---

### [FRONTEND-QUICK-REFERENCE.md](./FRONTEND-QUICK-REFERENCE.md)
**Quick reference for frontend developers**

**Contains:**
- Condensed entity definitions
- One-line API endpoint descriptions
- Code snippets ready to copy
- Color scheme recommendations
- Common enums
- Quick examples

**Use this when:**
- You need a quick lookup
- Copying type definitions
- Getting color values
- Finding endpoint URLs
- During active development

**Covers:**
- 3 core entities (simplified)
- 5 API endpoints (condensed)
- Type colors and rarity colors
- React Query hooks examples

**File Size:** ~4 KB (quick reference)

---

### [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md)
**Visual and code guide for UI components**

**Contains:**
- Component structures (ASCII art)
- Complete component code examples
- Styling with Tailwind CSS
- Layout examples
- Animation examples
- Responsive design patterns
- Accessibility checklist

**Use this when:**
- Building UI components
- Implementing designs
- Need component code templates
- Creating responsive layouts
- Ensuring accessibility

**Covers:**
- 8 major components (CardItem, CardDetail, SearchBar, etc.)
- 5 page layouts
- Responsive breakpoints
- CSS animations
- Accessibility requirements

**File Size:** ~16 KB (component guide)

---

### [FRONTEND-START-GAME-RULES.md](./FRONTEND-START-GAME-RULES.md)
**Frontend guide for start game rules reshuffle**

**Contains:**
- New `revealedHand` field in match state
- TypeScript interfaces and types
- React component examples
- Display logic and conditional rendering
- UI/UX recommendations
- Styling examples
- Error handling
- Testing patterns

**Use this when:**
- Implementing reshuffle UI
- Displaying opponent's revealed hand
- Handling INITIAL_SETUP state
- Building match view components

**File Size:** ~12 KB (feature guide)

---

## 📊 Documentation Comparison

| Document | Purpose | Size | Best For |
|----------|---------|------|----------|
| **API.md** | Card API reference | Large | Card API integration, testing |
| **DECK-API.md** | Deck API reference | Large | Deck API integration, deck builder |
| **MATCH-API.md** | Match API reference | Large | Match API integration, gameplay |
| **FRONTEND-APP.md** | Complete frontend guide | Large | Architecture, planning |
| **FRONTEND-QUICK-REFERENCE.md** | Developer cheat sheet | Small | Quick lookups, active dev |
| **FRONTEND-COMPONENT-GUIDE.md** | UI component guide | Medium | Building components, design |
| **CLIENT-COIN-FLIP-SYSTEM.md** | Coin flip system guide | Medium | Coin flip UI, attack mechanics |

---

## 🎯 Quick Start Guide

### For Backend Developers
1. Read [API.md](./API.md) to understand endpoints
2. Test endpoints with curl/Postman
3. Reference entity structures for responses

### For Frontend Developers (Planning Phase)
1. Start with [FRONTEND-APP.md](./FRONTEND-APP.md) - Read sections:
   - Purpose
   - Application Overview
   - Entities & Data Models
   - Backend API Integration
   - Frontend Architecture
2. Review [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) for UI design
3. Keep [FRONTEND-QUICK-REFERENCE.md](./FRONTEND-QUICK-REFERENCE.md) open during dev

### For Frontend Developers (Active Development)
1. Keep [FRONTEND-QUICK-REFERENCE.md](./FRONTEND-QUICK-REFERENCE.md) open
2. Reference [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) when building components
3. Use [API.md](./API.md) when implementing API calls

### For Designers
1. Read [FRONTEND-APP.md](./FRONTEND-APP.md) - Sections:
   - Application Overview (features)
   - User Flows
2. Review [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) for component specs
3. Use type/rarity colors from FRONTEND-QUICK-REFERENCE.md

---

## 🗂️ What Each Document Covers

### Card API Endpoints (in API.md)
```
1. POST   /api/v1/cards/load                    - Load card sets
2. GET    /api/v1/cards/sets                    - List available sets
3. GET    /api/v1/cards/sets/:author/:name/v:v  - Get set cards
4. GET    /api/v1/cards/search                  - Search cards
5. GET    /api/v1/cards/:cardId                 - Get card details
```

### Deck API Endpoints (in DECK-API.md)
```
1. POST   /api/v1/decks                         - Create deck
2. GET    /api/v1/decks                         - List all decks
3. GET    /api/v1/decks/:id                     - Get deck by ID
4. PUT    /api/v1/decks/:id                     - Update deck
5. DELETE /api/v1/decks/:id                     - Delete deck
6. POST   /api/v1/decks/:id/validate            - Validate deck
```

### Match API Endpoints (in MATCH-API.md)
```
1. GET    /api/v1/matches                       - List matches (with filters)
2. POST   /api/v1/matches                       - Create match
3. POST   /api/v1/matches/:id/join               - Join match
4. POST   /api/v1/matches/:id/start             - Start match
5. POST   /api/v1/matches/:id/state              - Get match state
6. POST   /api/v1/matches/:id/actions            - Execute player action
```

### Gameplay Actions (in CLIENT-GAMEPLAY-ACTIONS.md)
```
1. DRAW_CARD         - Draw one card from deck (DRAW phase → MAIN_PHASE)
2. ATTACH_ENERGY     - Attach energy card to Pokemon (MAIN_PHASE)
3. EVOLVE_POKEMON    - Evolve Pokemon on bench/active (MAIN_PHASE)
4. GENERATE_COIN_FLIP - Generate coin flip result (ATTACK phase, when coin flip required)
5. END_TURN          - End current turn, switch to next player (any phase)
```

### Core Entities (in all frontend docs)
```
1. CardSummary    - Lightweight card for grids/lists
2. CardDetail     - Full card information
3. CardSet        - Card set metadata
4. Deck           - Player deck with cards
5. DeckCard       - Card in deck with quantity
6. ValidationResult - Deck validation result
7. Ability        - Pokemon ability
8. Attack         - Pokemon attack
9. Weakness       - Type weakness
10. Resistance     - Type resistance
11. SearchFilters  - Search parameters
12. Enums          - CardType, PokemonType, Rarity, etc.
```

### UI Components (in FRONTEND-COMPONENT-GUIDE.md)
```
1. CardItem       - Card in grid
2. CardDetail     - Full card view
3. SearchBar      - Search input
4. FilterSidebar  - Filter options
5. SetCard        - Set display
6. TypeIcon       - Pokemon type icon
7. EnergyIcon     - Energy cost icon
8. RarityBadge    - Rarity indicator
```

### User Flows (in FRONTEND-APP.md)
```
1. Browse a Card Set    - Sets → Set Detail → Card Detail
2. Search for Cards     - Search → Filter → View Card
3. Load a New Set       - Admin: Load Set form
4. Filter by Type       - Search → Apply Filters → Results
```

---

## 📖 Reading Order by Role

### Product Manager
1. **FRONTEND-APP.md** - Sections:
   - Purpose
   - Application Overview
   - User Flows
2. **API.md** - Overview section

### Technical Architect
1. **FRONTEND-APP.md** - Sections:
   - Architecture
   - Technical Recommendations
2. **API.md** - Full read
3. **FRONTEND-COMPONENT-GUIDE.md** - Architecture patterns

### Frontend Developer
1. **FRONTEND-APP.md** - Full read (1st pass)
2. **FRONTEND-QUICK-REFERENCE.md** - Keep handy
3. **FRONTEND-COMPONENT-GUIDE.md** - Reference during implementation
4. **API.md** - Reference for API calls

### UI/UX Designer
1. **FRONTEND-APP.md** - Sections:
   - Application Overview
   - User Flows
2. **FRONTEND-COMPONENT-GUIDE.md** - Full read
3. **FRONTEND-QUICK-REFERENCE.md** - Color schemes

---

## 💡 Key Takeaways

### The Application
- **Type:** Web app for browsing TCG cards
- **Backend:** NestJS REST API (already built)
- **Frontend:** To be built (React or Next.js recommended)
- **Data:** Card sets loaded from JSON files

### The Entities
- **3 main entities:** CardSummary, CardDetail, CardSet
- **All entities** are TypeScript interfaces matching backend
- **9 enums** for types, rarity, stages, etc.

### The APIs
- **5 Card REST endpoints** for card operations
- **6 Deck REST endpoints** for deck management
- **Base URLs:** 
  - Cards: `http://localhost:3000/api/v1/cards`
  - Decks: `http://localhost:3000/api/v1/decks`
- **No authentication** currently required
- **JSON responses** with standard error format

### The UI
- **8 core components** to build
- **5 main pages:** Home, Set Browser, Set Detail, Card Detail, Search
- **Responsive design** (mobile-first)
- **Type-based colors** for visual consistency
- **Accessibility** built-in

---

## 🔍 Search This Documentation

### Find by Topic

**Want to know about...**

| Topic | Look in |
|-------|---------|
| Card API endpoints | API.md |
| Deck API endpoints | DECK-API.md |
| Entity structures | FRONTEND-APP.md or FRONTEND-QUICK-REFERENCE.md |
| Deck entities | DECK-API.md |
| Component code | FRONTEND-COMPONENT-GUIDE.md |
| User flows | FRONTEND-APP.md |
| Colors & styling | FRONTEND-QUICK-REFERENCE.md or FRONTEND-COMPONENT-GUIDE.md |
| Architecture | FRONTEND-APP.md |
| Quick lookups | FRONTEND-QUICK-REFERENCE.md |
| Layouts | FRONTEND-COMPONENT-GUIDE.md |

### Find by Keyword

**Search for these keywords:**

- `CardSummary` - Entity for card lists (in all frontend docs)
- `CardDetail` - Full card entity (in all frontend docs)
- `search` - Search endpoint or SearchBar component
- `filter` - FilterSidebar component or search filters
- `TypeIcon` - Type icon component
- `API` - API.md or API Integration sections
- `React Query` - FRONTEND-APP.md and FRONTEND-QUICK-REFERENCE.md
- `responsive` - FRONTEND-COMPONENT-GUIDE.md layouts
- `animation` - FRONTEND-COMPONENT-GUIDE.md animations
- `accessibility` - FRONTEND-COMPONENT-GUIDE.md checklist

---

## 🚀 Next Steps

### For Starting Frontend Development

1. **Set up project:**
   ```bash
   # Option 1: Vite + React
   npm create vite@latest opentcg-frontend -- --template react-ts
   
   # Option 2: Next.js
   npx create-next-app@latest opentcg-frontend --typescript
   ```

2. **Install dependencies:**
   ```bash
   npm install @tanstack/react-query axios
   npm install -D tailwindcss
   ```

3. **Copy type definitions** from FRONTEND-APP.md to `src/types/`

4. **Implement API client** using examples from FRONTEND-QUICK-REFERENCE.md

5. **Build components** using FRONTEND-COMPONENT-GUIDE.md

6. **Test with backend:**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run start:dev
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

---

## 📝 Updating This Documentation

### When to Update

**Update API.md when:**
- Adding/changing API endpoints
- Modifying request/response formats
- Adding new query parameters
- Changing error handling

**Update FRONTEND-APP.md when:**
- Adding new features
- Changing architecture
- Adding new entities
- Modifying user flows

**Update FRONTEND-QUICK-REFERENCE.md when:**
- API endpoints change
- Entity structures change
- Adding new enums
- Updating color schemes

**Update FRONTEND-COMPONENT-GUIDE.md when:**
- Adding new components
- Changing component APIs
- Updating layout patterns
- Adding new animations

---

## 🤝 Contributing

When contributing to this documentation:

1. **Keep it accurate** - Update docs when code changes
2. **Keep it consistent** - Follow existing format and style
3. **Keep it complete** - Include examples and explanations
4. **Keep it organized** - Use proper headings and structure

---

## 📞 Support

For questions or issues:

1. Check this index for the right document
2. Search within the document for your topic
3. Review code examples in FRONTEND-COMPONENT-GUIDE.md
4. Test endpoints with examples in API.md

---

**Last Updated:** November 19, 2025

**Documentation Version:** 1.0

**Backend Version:** Compatible with OpenTCG Backend v1.0

