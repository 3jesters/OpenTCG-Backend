# Card Schema Field Analysis

## Overview
Analysis of Card entity fields to identify unused/always-null fields that can be removed.

## Fields Analysis

### ✅ KEEP - Core Identity Fields
| Field | Usage | Reason |
|-------|-------|--------|
| `instanceId` | Always populated | Primary key, unique identifier |
| `cardId` | Always populated | Card reference ID |
| `pokemonNumber` | Pokemon only | Pokedex number (null for Trainer/Energy) |
| `name` | Always populated | Card name |
| `setName` | Always populated | Which set the card belongs to |
| `cardNumber` | Always populated | Card number in set |
| `rarity` | Always populated | COMMON, UNCOMMON, RARE, etc. |
| `cardType` | Always populated | POKEMON, TRAINER, or ENERGY |

### ✅ KEEP - Pokemon-Specific Fields (nullable)
| Field | Usage | Reason |
|-------|-------|--------|
| `pokemonType` | Pokemon only | FIRE, WATER, GRASS, etc. (null for Trainer/Energy) |
| `stage` | Pokemon only | BASIC, STAGE_1, STAGE_2 (null for Trainer/Energy) |
| `hp` | Pokemon only | Hit points (null for Trainer/Energy) |
| `retreatCost` | Pokemon only | Energy cost to retreat (null for Trainer/Energy) |
| `weakness` | Pokemon only | Weakness type and modifier |
| `resistance` | Pokemon only | Resistance type and modifier |
| `attacks` | Pokemon only | Array of attacks (empty for Trainer/Energy) |
| `ability` | Some Pokemon | Abilities/Powers (null if no ability) |
| `evolvesFrom` | Evolved Pokemon | Evolution source |
| `evolvesTo` | Some Pokemon | What this evolves into |

### ✅ KEEP - Trainer/Energy-Specific Fields (nullable)
| Field | Usage | Reason |
|-------|-------|--------|
| `trainerType` | Trainer only | ITEM, SUPPORTER, STADIUM (null for Pokemon/Energy) |
| `trainerEffects` | Trainer only | Array of effects (empty for Pokemon/Energy) |
| `energyType` | Energy only | FIRE, WATER, etc. (null for Pokemon/Trainer) |
| `energyProvision` | Energy only | How much energy it provides |

### ✅ KEEP - Metadata Fields
| Field | Usage | Reason |
|-------|-------|--------|
| `description` | Always populated | Card flavor text/description |
| `artist` | Always populated | Card artist name |
| `imageUrl` | Always populated | Card image URL |
| `subtypes` | Sometimes used | Additional card classifications |
| `rulesText` | Some cards | Special rules text |
| `cardRules` | Some cards | Structured rule definitions |

### ❌ REMOVE - Unused Fields

#### 1. `level` (integer, nullable)
- **Current Status**: ALWAYS NULL in all card data
- **Original Purpose**: Used in older Pokemon TCG formats (e.g., Pokemon-ex, LV.X cards from Diamond & Pearl era)
- **In Your Data**: Base Set, Jungle, Fossil sets don't use levels
- **Recommendation**: **REMOVE** - Not used in classic Pokemon TCG sets
- **Impact**: None - field is never populated

#### 2. `regulationMark` (string, nullable)
- **Current Status**: ALWAYS NULL in all card data
- **Original Purpose**: Modern Pokemon TCG uses regulation marks (D, E, F, G, etc.) for tournament legality
- **In Your Data**: Classic sets (1999-2000) predate regulation marks (introduced ~2017)
- **Recommendation**: **REMOVE** for now, or keep for future modern set support
- **Impact**: None currently - only needed if you add modern card sets

## Recommendations

### Immediate Actions (Remove Unused Fields)

#### Option 1: Remove Both Unused Fields (Recommended for Classic Sets Only)
If you're only supporting classic Pokemon TCG sets (Base Set, Jungle, Fossil, etc.):

```typescript
// Remove from CardOrmEntity
- level: number | null;
- regulationMark: string | null;

// Remove from Card domain entity
// Remove from migration script
// Remove from mappers
```

**Pros**:
- Cleaner schema
- No unused columns
- Better performance (slightly)

**Cons**:
- If you later add modern sets, you'll need to add `regulationMark` back

#### Option 2: Keep `regulationMark`, Remove `level` (Recommended for Future-Proofing)
If you plan to add modern card sets in the future:

```typescript
// Remove from CardOrmEntity
- level: number | null;

// Keep regulationMark for future use
regulationMark: string | null;
```

**Pros**:
- Future-proof for modern sets
- `level` is truly obsolete (not used since ~2009)
- `regulationMark` might be needed later

**Cons**:
- One unused column in current data

### Implementation Plan

If you choose **Option 1 (Remove Both)**:

1. **Update ORM Entity**:
```typescript
// src/modules/card/infrastructure/persistence/entities/card.orm-entity.ts
// Remove these lines:
@Column({ type: 'integer', nullable: true })
level: number | null;

@Column({ type: 'varchar', nullable: true })
regulationMark: string | null;
```

2. **Update Domain Entity**:
```typescript
// src/modules/card/domain/entities/card.entity.ts
// Remove level and regulationMark from constructor and properties
```

3. **Update Mapper**:
```typescript
// src/modules/card/infrastructure/persistence/mappers/card-orm.mapper.ts
// Remove level and regulationMark mapping
```

4. **Update Migration Script**:
```typescript
// scripts/migrate-to-postgres.ts
// Remove these lines from card entity creation:
entity.level = cardData.level || null;
entity.regulationMark = cardData.regulationMark || null;
```

5. **Restart Docker** to apply schema changes:
```bash
docker-compose restart app
```

### No Action Needed (Fields Are Fine)

These nullable fields are **correctly implemented** as they depend on card type:

- ✅ `pokemonNumber` - null for Trainer/Energy (you just fixed this!)
- ✅ `pokemonType` - null for Trainer/Energy  
- ✅ `stage` - null for Trainer/Energy
- ✅ `hp` - null for Trainer/Energy
- ✅ `retreatCost` - null for Trainer/Energy
- ✅ `weakness` - null for cards without weakness
- ✅ `resistance` - null for cards without resistance
- ✅ `ability` - null for Pokemon without abilities
- ✅ `evolvesFrom` - null for Basic Pokemon
- ✅ `trainerType` - null for Pokemon/Energy
- ✅ `energyType` - null for Pokemon/Trainer
- ✅ `rulesText` - null for cards without special rules

## Summary

**Fields to Remove**: `level` (100% unused, obsolete)

**Fields to Consider**: `regulationMark` (currently unused, but might be needed for modern sets)

**Fields to Keep**: Everything else is correctly used based on card type

Would you like me to proceed with removing these unused fields?

