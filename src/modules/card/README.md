# Card Module

## Overview
The Card module is the foundation of the OpenTCG trading card game system. It implements a comprehensive card structure following Pokémon TCG rules, built with clean architecture principles.

## Module Structure

```
card/
├── domain/                      # Business logic layer (framework-agnostic)
│   ├── entities/
│   │   └── card.entity.ts      # Core Card entity with business logic
│   ├── value-objects/          # Immutable value objects
│   │   ├── weakness.value-object.ts
│   │   ├── resistance.value-object.ts
│   │   ├── evolution.value-object.ts
│   │   ├── attack.value-object.ts
│   │   ├── ability.value-object.ts
│   │   └── card-rule.value-object.ts
│   ├── enums/                  # Domain enums
│   │   ├── card-type.enum.ts
│   │   ├── evolution-stage.enum.ts
│   │   ├── pokemon-type.enum.ts
│   │   ├── rarity.enum.ts
│   │   ├── trainer-type.enum.ts
│   │   └── energy-type.enum.ts
│   └── repositories/           # Repository interfaces (to be created)
├── application/                # Use cases layer (to be created)
│   ├── use-cases/
│   └── dto/
├── infrastructure/             # External dependencies layer (to be created)
│   └── persistence/
│       ├── entities/           # ORM entities
│       ├── mappers/            # Domain ↔ ORM mappers
│       └── repositories/       # Repository implementations
├── presentation/               # API layer (to be created)
│   ├── controllers/
│   └── dto/
└── docs/                       # Business documentation
    ├── domain-model.md         # Domain concepts and relationships
    └── card-fields-summary.md  # Complete field reference
```

## Quick Start

### Import the Card Domain

```typescript
import {
  Card,
  CardType,
  PokemonType,
  EvolutionStage,
  Rarity,
  Attack,
  Weakness,
  EnergyType,
} from './modules/card/domain';
```

### Create a Pokémon Card

```typescript
// Create a basic Pikachu card
const pikachu = Card.createPokemonCard(
  '550e8400-e29b-41d4-a716-446655440000', // instanceId (UUID)
  'base-set-025-pikachu-lv12',             // cardId
  '025',                                    // pokemonNumber
  'Pikachu',                                // name
  'Base Set',                               // setName
  '58/102',                                 // cardNumber
  Rarity.COMMON,                            // rarity
  'When several of these...',               // description
  'Mitsuhiro Arita',                        // artist
  '/cards/base-set/pikachu-58.png',        // imageUrl
);

// Set Pokémon-specific properties
pikachu.setPokemonType(PokemonType.ELECTRIC);
pikachu.setStage(EvolutionStage.BASIC);
pikachu.setLevel(12);
pikachu.setHp(60);
pikachu.setRetreatCost(1);

// Add weakness
const weakness = new Weakness(EnergyType.FIGHTING, '×2');
pikachu.setWeakness(weakness);

// Add an attack with preconditions
const attack = new Attack(
  'Thunder Shock',
  [EnergyType.ELECTRIC],
  '10',
  'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
  [
    {
      type: 'COIN_FLIP',
      value: 1,
      description: 'Flip a coin',
    },
  ], // preconditions
);
pikachu.addAttack(attack);

// Add evolution path
pikachu.addEvolvesTo(
  new Evolution('026', EvolutionStage.STAGE_1) // Raichu
);
```

### Create a Trainer Card

```typescript
const professorOak = Card.createTrainerCard(
  '550e8400-e29b-41d4-a716-446655440001',
  'base-set-professor-oak',
  'T01',
  'Professor Oak',
  'Base Set',
  '88/102',
  Rarity.UNCOMMON,
  'A famous Pokémon researcher.',
  'Ken Sugimori',
  '/cards/base-set/professor-oak.png',
);

professorOak.setTrainerType(TrainerType.SUPPORTER);
professorOak.setTrainerEffect(
  'Discard your hand and draw 7 cards.'
);
```

### Create an Energy Card

```typescript
const fireEnergy = Card.createEnergyCard(
  '550e8400-e29b-41d4-a716-446655440002',
  'base-set-fire-energy',
  'E01',
  'Fire Energy',
  'Base Set',
  '98/102',
  Rarity.COMMON,
  'Basic Fire Energy',
  'Energy Card',
  '/cards/base-set/fire-energy.png',
);

fireEnergy.setEnergyType(EnergyType.FIRE);
fireEnergy.setIsSpecialEnergy(false);
```

## Card Features

### 30+ Fields
The Card entity supports 30+ fields covering:
- ✅ Identity & cataloging (7 fields)
- ✅ Card type & classification (5 fields)
- ✅ Evolution chain (2 fields)
- ✅ Battle stats (2 fields)
- ✅ Combat modifiers (2 fields)
- ✅ Actions & abilities (2 fields)
- ✅ Rules & effects (2 fields)
- ✅ Trainer card specific (2 fields)
- ✅ Energy card specific (3 fields)
- ✅ Metadata (4 fields)

### Business Logic
- ✅ Type-safe setters with validation
- ✅ Automatic constraint enforcement
- ✅ Query methods for card properties
- ✅ Factory methods for different card types
- ✅ Evolution chain management
- ✅ Attack and ability management

### Value Objects
- ✅ **Weakness**: Type weakness with modifiers
- ✅ **Resistance**: Type resistance with modifiers
- ✅ **Evolution**: Evolution relationships with conditions
- ✅ **Attack**: Complete attack structure with energy costs
- ✅ **Ability**: Pokémon abilities (placeholder)
- ✅ **CardRule**: Special card rules (placeholder)

## Documentation

- 📘 [Domain Model](./docs/domain-model.md) - Complete domain concepts and relationships
- 📋 [Card Fields Summary](./docs/card-fields-summary.md) - Detailed field reference with examples

## Architecture Principles

This module follows **Clean Architecture**:

1. **Domain Layer** (current): Pure TypeScript, no framework dependencies
2. **Application Layer** (next): Use cases and business workflows
3. **Infrastructure Layer** (next): Database, external APIs
4. **Presentation Layer** (next): REST controllers

### Design Decisions

- ✅ **Separation of Concerns**: Domain entities separate from ORM entities
- ✅ **Immutability**: Value objects are immutable
- ✅ **Validation**: Business rules enforced in domain layer
- ✅ **Type Safety**: Strong typing throughout
- ✅ **Extensibility**: Placeholder structures for future game mechanics

## Placeholders for Future Development

The following are placeholders to be expanded:

1. **Attack Effects**: Structured effect system for game engine
2. **Ability Effects**: Structured ability system
3. **Card Rules**: Programmatic rule execution
4. **Repository Layer**: Database persistence
5. **Use Cases**: Create, update, query cards
6. **REST API**: HTTP endpoints

## Examples

See `/docs/card-fields-summary.md` for a complete Pokémon card example with all fields populated.

## Status

✅ **Phase 1 Complete**: Domain layer implemented
- Card entity with 30+ fields
- 6 value objects
- 6 enums
- Business logic and validation
- Complete documentation

🔄 **Next Phase**: Application layer (use cases, DTOs)

---

**Built with Clean Architecture | Test-Driven Development | TypeScript**

