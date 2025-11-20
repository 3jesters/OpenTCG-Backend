# Tournament Domain Model

## Overview

The Tournament module manages tournament configurations, rules, and restrictions for matches and decks in the trading card game system.

## Core Entities

### Tournament

The main aggregate root that represents a tournament with all its rules and configurations.

**Identity & Metadata:**
- `id`: Unique tournament identifier
- `name`: Display name of the tournament
- `version`: Version number for tracking changes
- `description`: Detailed description of the tournament
- `author`: Creator of the tournament configuration
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last modification
- `official`: Whether this is an official tournament
- `status`: Current status (DRAFT, ACTIVE, COMPLETED, CANCELLED)

**Set Management:**
- `bannedSets`: Array of set names that are not allowed (empty = all sets allowed by default)
- `setBannedCards`: Object mapping set names to arrays of banned card IDs within those sets

**Deck Rules:**
- `deckRules`: Value object containing all deck construction rules

**Additional Configuration:**
- `savedDecks`: Array of deck IDs (for future implementation)
- `startDate`: Optional tournament start date
- `endDate`: Optional tournament end date
- `maxParticipants`: Optional maximum number of participants
- `format`: Optional format name (e.g., "Standard", "Expanded", "Classic")
- `regulationMarks`: Array of allowed regulation marks

## Value Objects

### DeckRules

Encapsulates all rules for deck construction:

- `minDeckSize`: Minimum number of cards in a deck (typically 60)
- `maxDeckSize`: Maximum number of cards in a deck (typically 60)
- `exactDeckSize`: Whether deck must be exactly the specified size
- `maxCopiesPerCard`: Maximum copies of any card (typically 4, except basic energy)
- `minBasicPokemon`: Minimum number of basic Pokémon required (typically 1)
- `restrictedCards`: Array of RestrictedCard objects for cards with special limits

**Factory Methods:**
- `createStandard()`: Creates standard Pokémon TCG rules (60-card deck, max 4 copies, min 1 basic)

### RestrictedCard

Represents a card with restricted copy limits:

- `setName`: The set the card belongs to
- `cardId`: Unique identifier of the card
- `maxCopies`: Maximum allowed copies (0-4)

## Enums

### TournamentStatus

Represents the lifecycle state of a tournament:

- `DRAFT`: Tournament is being configured
- `ACTIVE`: Tournament is currently running
- `COMPLETED`: Tournament has finished
- `CANCELLED`: Tournament was cancelled

## Domain Relationships

```
Tournament (Aggregate Root)
├── DeckRules (Value Object)
│   └── RestrictedCard[] (Value Objects)
├── bannedSets: string[]
├── setBannedCards: Record<string, string[]>
└── savedDecks: string[] (future: references to Deck entities)
```

## Business Rules

### Set Allowance Logic

1. If `bannedSets` is empty, ALL sets are allowed by default
2. If `bannedSets` contains entries, only sets NOT in the array are allowed
3. Individual cards can be banned even within allowed sets using `setBannedCards`

### Card Validation Hierarchy

When checking if a card is allowed:

1. First check if the card's set is banned → if yes, card is banned
2. Then check if the specific card is in `setBannedCards` → if yes, card is banned
3. Then check if the card is in `restrictedCards` → if yes, use the restricted max copies
4. Otherwise, use the default `maxCopiesPerCard` from deck rules

### Deck Rule Validation

- `minDeckSize` must be ≥ 0
- `maxDeckSize` must be ≥ `minDeckSize`
- If `exactDeckSize` is true, `minDeckSize` must equal `maxDeckSize`
- `maxCopiesPerCard` must be ≥ 1
- `minBasicPokemon` must be ≥ 0
- Restricted cards can have `maxCopies` between 0 and 4

### Date Validation

- `startDate` cannot be after `endDate`
- `endDate` cannot be before `startDate`

## Domain Services

None currently, but future considerations:
- Deck validation service (validate a deck against tournament rules)
- Match creation service (create matches within tournament context)

## Invariants

The Tournament entity maintains these invariants:

1. **Identity Invariant**: `id`, `name`, `version`, and `author` are always required and non-empty
2. **Status Invariant**: Status must always be one of the defined TournamentStatus values
3. **Timestamp Invariant**: `updatedAt` is automatically updated when any property changes
4. **Date Invariant**: If both dates are set, `startDate` must be before or equal to `endDate`
5. **Deck Rules Invariant**: Deck rules must always be valid (checked by DeckRules value object)
6. **No Duplicates**: No duplicate entries in `bannedSets`, `savedDecks`, or `regulationMarks`

