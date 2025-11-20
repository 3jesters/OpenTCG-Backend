# Deck Module

## Overview

The Deck module manages player decks within the OpenTCG system. It follows clean architecture principles with clear separation between domain logic, application use cases, infrastructure, and presentation layers.

## Features

- ✅ CRUD operations for decks
- ✅ Card management (add/remove/update quantities)
- ✅ Tournament association (optional)
- ✅ Basic deck validation (size, card copies)
- ✅ Advanced tournament validation (banned sets/cards, restricted cards)
- ✅ JSON file-based persistence
- ✅ RESTful API endpoints
- ✅ Comprehensive unit tests
- ✅ Full TypeScript type safety

## Architecture

```
deck/
├── domain/                  # Business logic layer (framework-agnostic)
│   ├── entities/
│   │   └── deck.entity.ts  # Core Deck entity with business logic
│   ├── value-objects/
│   │   ├── deck-card.value-object.ts
│   │   └── validation-result.value-object.ts
│   └── repositories/
│       └── deck.repository.interface.ts
├── application/            # Use cases & DTOs
│   ├── use-cases/
│   │   ├── create-deck.use-case.ts
│   │   ├── get-deck-by-id.use-case.ts
│   │   ├── list-decks.use-case.ts
│   │   ├── update-deck.use-case.ts
│   │   ├── delete-deck.use-case.ts
│   │   └── validate-deck-against-tournament.use-case.ts
│   └── dto/
├── infrastructure/         # External dependencies
│   └── persistence/
│       ├── deck.mapper.ts
│       └── json-deck.repository.ts
├── presentation/          # HTTP layer
│   ├── controllers/
│   │   └── deck.controller.ts
│   └── dto/
├── docs/                  # Documentation
│   ├── domain-model.md
│   ├── business-rules.md
│   └── use-cases.md
└── deck.module.ts        # NestJS module configuration
```

## Quick Start

### Creating a Deck

```typescript
POST /api/v1/decks
Content-Type: application/json

{
  "name": "My Pikachu Deck",
  "createdBy": "player-1",
  "tournamentId": "tournament-1",
  "cards": [
    {
      "cardId": "base-set-025-pikachu-lv12",
      "setName": "Base Set",
      "quantity": 4
    },
    {
      "cardId": "base-set-026-raichu-lv40",
      "setName": "Base Set",
      "quantity": 2
    }
  ]
}
```

### Validating a Deck

```typescript
POST /api/v1/decks/{deckId}/validate
Content-Type: application/json

{
  "tournamentId": "tournament-1"
}
```

Response:
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    "Cannot verify minimum basic Pokemon requirement without full card data"
  ]
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/decks` | POST | Create a new deck |
| `/api/v1/decks` | GET | List all decks (optional: ?tournamentId=xxx) |
| `/api/v1/decks/:id` | GET | Get deck by ID |
| `/api/v1/decks/:id` | PUT | Update deck |
| `/api/v1/decks/:id` | DELETE | Delete deck |
| `/api/v1/decks/:id/validate` | POST | Validate deck against tournament rules |

## Domain Model

### Deck Entity

Represents a player's deck of cards.

**Properties:**
- `id`: Unique identifier (UUID)
- `name`: Deck name
- `createdBy`: Creator identifier
- `cards`: Array of DeckCard value objects
- `createdAt`: Creation timestamp
- `updatedAt`: Last modification timestamp
- `tournamentId`: Optional tournament reference
- `isValid`: Validation status flag

**Methods:**
- `addCard(cardId, setName, quantity)`: Add card to deck
- `removeCard(cardId, setName, quantity?)`: Remove card from deck
- `setCardQuantity(cardId, setName, quantity)`: Set exact quantity
- `clearCards()`: Remove all cards
- `getTotalCardCount()`: Get total number of cards
- `getCardQuantity(cardId, setName)`: Get quantity of specific card
- `hasCard(cardId, setName)`: Check if card is in deck
- `getUniqueSets()`: Get all unique sets in deck
- `performBasicValidation(...)`: Validate deck size and card copies

### DeckCard Value Object

Represents a card in a deck with its quantity.

**Properties:**
- `cardId`: Card identifier
- `setName`: Set name
- `quantity`: Number of copies (minimum 1)

### ValidationResult Value Object

Contains validation results with errors and warnings.

**Properties:**
- `isValid`: Boolean validation status
- `errors`: Array of error messages
- `warnings`: Array of warning messages

## Validation

### Basic Validation

Performed in the entity, checks:
- Deck size (min/max)
- Card copy limits (max per card)

### Tournament Validation

Performed by `ValidateDeckAgainstTournamentUseCase`, checks:
- All basic validation rules
- Banned sets
- Banned cards
- Card-specific copy restrictions
- Minimum basic Pokémon (currently returns warning)

## Dependencies

### Required Modules
- `TournamentModule`: For tournament validation

### Optional Modules (Future)
- `CardModule`: For complete card type validation

## Testing

Run tests:
```bash
npm test deck
```

Coverage includes:
- Domain entities and value objects (100%)
- Application use cases (100%)
- Infrastructure mappers (100%)
- All business logic

## File Storage

Decks are stored as JSON files in `data/decks/`:
- Each deck is a separate file: `{deck-id}.json`
- Human-readable format
- Easy to backup and version control

Example deck file:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Pikachu Deck",
  "createdBy": "player-1",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "tournamentId": "tournament-1",
  "isValid": true,
  "cards": [
    {
      "cardId": "base-set-025-pikachu-lv12",
      "setName": "Base Set",
      "quantity": 4
    }
  ]
}
```

## Business Rules

1. **Deck Identity**: Each deck must have a unique ID, name, and creator
2. **Card Management**: Cards identified by cardId + setName combination
3. **Set Handling**: Same card from different sets treated as distinct
4. **Validation**: Two-level validation (basic + tournament)
5. **Tournament Association**: Optional, decks can exist standalone
6. **Immutability**: Value objects are immutable
7. **Persistence**: Automatic JSON serialization/deserialization

## Future Enhancements

1. **Complete Card Validation**: Integration with Card module to verify:
   - Card existence
   - Basic Pokémon count
   - Energy card requirements

2. **Sideboard Support**: Additional cards for tournament play

3. **Deck Statistics**: Card type distribution, mana curve, etc.

4. **Deck Templates**: Pre-built deck templates for quick creation

5. **Deck Sharing**: Export/import functionality

## Documentation

For detailed information, see:
- [Domain Model](./docs/domain-model.md)
- [Business Rules](./docs/business-rules.md)
- [Use Cases](./docs/use-cases.md)

