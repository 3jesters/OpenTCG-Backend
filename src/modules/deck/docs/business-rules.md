# Deck Business Rules

## Overview

This document describes the business rules and constraints that govern deck construction and validation in the OpenTCG system.

## Deck Construction Rules

### Basic Requirements

1. **Deck Identity**
   - Each deck must have a unique ID (UUID)
   - Each deck must have a name
   - Each deck must have a creator identifier

2. **Card Composition**
   - Decks contain zero or more unique cards
   - Each card is identified by cardId + setName
   - Each card has an associated quantity (number of copies)
   - Minimum quantity per card: 1
   - No maximum quantity enforced at entity level (enforced by tournament rules)

3. **Set Management**
   - The same card from different sets is treated as distinct
   - Example: Pikachu from Base Set ≠ Pikachu from Jungle
   - Deck can contain cards from multiple sets

### Card Management Rules

1. **Adding Cards**
   - Adding an existing card increases its quantity
   - Adding a new card creates a new entry in the deck
   - Quantity must always be positive

2. **Removing Cards**
   - Can remove specific quantity or all copies
   - Removing more than available quantity removes the card entirely
   - Cannot remove cards that don't exist in the deck (throws error)

3. **Updating Quantity**
   - Can set exact quantity for any card
   - Setting quantity to 0 removes the card
   - Negative quantities are not allowed

## Validation Levels

### Level 1: Entity Validation (Always Applied)

These rules are enforced when creating/modifying a deck:

1. Deck ID cannot be empty
2. Deck name cannot be empty
3. Creator identifier cannot be empty
4. Card quantities must be at least 1
5. Card IDs and set names cannot be empty

### Level 2: Basic Deck Validation (Optional)

Performed by `performBasicValidation()` method:

1. **Deck Size**
   - Deck must meet minimum size requirement
   - Deck must not exceed maximum size requirement
   - Size is based on total card count (sum of all quantities)

2. **Card Copies**
   - Each card must not exceed maximum copies per card limit
   - This applies to each unique card (cardId + setName)

### Level 3: Tournament Validation (Advanced)

Performed by `ValidateDeckAgainstTournamentUseCase`:

1. **Deck Size Rules**
   - Must meet tournament's minimum deck size
   - Must not exceed tournament's maximum deck size
   - If exactDeckSize is true, must be exactly the specified size

2. **Set Restrictions**
   - Cards from banned sets are not allowed
   - Each tournament defines a list of banned sets
   - Empty list means all sets are allowed

3. **Card Restrictions**
   - Specific cards can be banned per set
   - Tournament defines setBannedCards: { setName: [cardIds] }
   - Banned cards cannot be included in any quantity

4. **Copy Limits**
   - Default: maxCopiesPerCard from tournament rules
   - Card-specific: restrictedCards can override for specific cards
   - Example: Most cards limited to 4, but "Professor Oak" limited to 1

5. **Basic Pokémon Requirement**
   - Tournament may require minimum number of Basic Pokémon
   - Requires checking card data to verify card types
   - Currently returns warning if cannot verify

## Validation Result

### Success
- isValid = true
- No errors
- May have warnings

### Failure
- isValid = false
- One or more errors
- May also have warnings

### Errors vs Warnings

**Errors:** Prevent deck from being valid
- Deck size violations
- Banned cards/sets
- Copy limit violations
- Missing required card types

**Warnings:** Informational, don't affect validity
- Card is restricted (but within limits)
- Cannot verify certain requirements without full card data

## Tournament Association

1. **Optional Association**
   - Decks can exist without a tournament
   - Standalone decks can be validated later against any tournament

2. **Tournament Reference**
   - Stored as simple string ID
   - Not enforced at entity level
   - Use case validates tournament exists before validation

3. **Validation Impact**
   - Tournament rules fully define what's legal in the deck
   - Different tournaments can have different rules
   - Same deck may be valid for one tournament but not another

## Deck Lifecycle

1. **Creation**
   - Create with basic information and optional cards
   - isValid flag defaults to false
   - No validation performed automatically

2. **Modification**
   - Cards can be added/removed/updated at any time
   - updatedAt timestamp is automatically updated
   - isValid flag is NOT automatically updated on modification

3. **Validation**
   - Can be triggered manually via validation endpoint
   - Updates isValid flag based on validation result
   - Returns detailed ValidationResult with errors/warnings

4. **Deletion**
   - Deck can be deleted at any time
   - No cascading deletions (cards exist independently)

## Edge Cases

1. **Empty Decks**
   - Allowed at entity level
   - Will fail basic validation if tournament has minimum size > 0
   - Useful for deck building in progress

2. **Same Card, Different Sets**
   - Treated as completely different cards
   - Each set version counts toward its own copy limit
   - Example: 4× Base Set Pikachu + 4× Jungle Pikachu = valid

3. **Banned Sets with Explicit Card Bans**
   - If a set is banned, all cards from it are banned
   - setBannedCards is typically used for partial set bans
   - Example: Jungle allowed, but specific Jungle cards banned

4. **Restricted Cards**
   - Override the default maxCopiesPerCard
   - Can only restrict further, not expand
   - Example: Default 4, but "Ace Spec" cards limited to 1

## Future Considerations

1. **Basic Pokémon Validation**
   - Currently cannot verify without full card data
   - Future: Integrate with Card module to check card types
   - Would enable complete validation

2. **Energy Card Requirements**
   - Pokémon TCG often requires energy cards
   - Not currently enforced
   - Could be added as tournament rule

3. **Sideboard Support**
   - Some formats allow sideboards
   - Would require additional card collection
   - Could be added as separate entity or property

