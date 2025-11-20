# Deck Domain Model

## Overview

The Deck module manages player decks within the OpenTCG system. A deck is a collection of cards that can be validated against tournament rules to ensure compliance with deck construction requirements.

## Core Entities

### Deck

The main aggregate root representing a player's deck of cards.

**Identity & Metadata:**
- `id`: Unique deck identifier (UUID)
- `name`: Display name of the deck
- `createdBy`: Creator identifier (string placeholder for player/user ID)
- `createdAt`: Timestamp when deck was created
- `updatedAt`: Timestamp of last modification

**Composition:**
- `cards`: Array of DeckCard value objects (card ID, set name, and quantity)

**Association:**
- `tournamentId`: Optional reference to a tournament (for tournament-specific decks)

**Validation:**
- `isValid`: Boolean flag indicating if the deck passes validation

## Value Objects

### DeckCard

Represents a card in the deck with its quantity. This is an immutable value object.

**Properties:**
- `cardId`: Unique card identifier (e.g., "base-set-025-pikachu-lv12")
- `setName`: Name of the card set (e.g., "Base Set")
- `quantity`: Number of copies of this card in the deck (minimum 1)

**Methods:**
- `withQuantity(newQuantity)`: Creates a new DeckCard with updated quantity
- `equals(other)`: Checks equality with another DeckCard
- `isSameCard(other)`: Checks if represents the same card (ignoring quantity)

**Validation:**
- Card ID cannot be empty
- Set name cannot be empty
- Quantity must be at least 1 and an integer

### ValidationResult

Contains the result of deck validation with detailed feedback.

**Properties:**
- `isValid`: Boolean indicating if validation passed
- `errors`: Array of error messages (prevent deck from being valid)
- `warnings`: Array of warning messages (informational, don't affect validity)

**Factory Methods:**
- `success()`: Create a successful validation result
- `failure(errors)`: Create a failed validation with errors
- `withWarnings(warnings)`: Create a valid result with warnings
- `failureWithWarnings(errors, warnings)`: Create a failed result with both

**Methods:**
- `addErrors(newErrors)`: Add more errors to the result
- `addWarnings(newWarnings)`: Add more warnings to the result
- `merge(other)`: Combine two validation results
- `hasIssues()`: Check if there are any errors or warnings

## Relationships

### Deck → Cards
- A deck contains zero or more DeckCard value objects
- Each DeckCard references a card by its cardId and setName
- The actual Card entities are stored in the Card module
- Decks store only the reference and quantity, not the full card data

### Deck → Tournament
- A deck can optionally be associated with a tournament
- The tournament ID is stored as a simple string reference
- Tournament validation uses this reference to fetch tournament rules
- Decks can exist without a tournament (standalone decks)

## Business Logic

### Card Management

**Adding Cards:**
- If card already exists in deck, quantity is increased
- If card is new, it's added to the deck
- Quantity must be positive

**Removing Cards:**
- Can remove specific quantity or entire card
- Throws error if card doesn't exist in deck
- If quantity reaches 0, card is removed from deck

**Setting Quantity:**
- Sets exact quantity for a card
- If quantity is 0, removes the card
- If card doesn't exist, adds it with specified quantity

### Validation

**Basic Validation:**
- Performed in the entity itself
- Checks deck size (min/max)
- Checks card copy limits
- Does NOT require external dependencies

**Tournament Validation:**
- Performed in the ValidateDeckAgainstTournamentUseCase
- Checks all basic validation rules
- Checks banned sets
- Checks banned cards
- Checks card-specific copy restrictions
- Checks minimum basic Pokémon requirement
- Updates deck's isValid flag
- Returns detailed ValidationResult

### Query Methods

- `getTotalCardCount()`: Get total number of cards in deck
- `getCardQuantity(cardId, setName)`: Get quantity of specific card
- `hasCard(cardId, setName)`: Check if deck contains a card
- `getUniqueSets()`: Get all unique sets represented in the deck

## Domain Rules

1. A deck must have an ID, name, and creator
2. Cards can only be added with positive quantities
3. Each card in a deck is uniquely identified by cardId + setName combination
4. The same card from different sets are treated as different cards
5. Validation status (isValid) is separate from entity validity
6. Basic validation can be performed without external dependencies
7. Tournament validation requires tournament rules and may require card data

