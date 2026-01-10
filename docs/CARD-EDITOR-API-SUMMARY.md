# Card Editor System - Client API Summary

## Overview

The Card Editor System provides REST APIs for creating, editing, and analyzing Pokemon trading cards. The system includes a comprehensive card strength calculation algorithm to help assess card balance.

**Base URL**: `http://localhost:3000/api/v1`

**Status**: Phase 1 (Card Strength Calculation) ✅ **COMPLETED** | Phases 2-4 (Editor Features) - **In Progress**

---

## Available Endpoints

### ✅ Phase 1: Card Strength Calculation (IMPLEMENTED)

#### Calculate Card Strength

**GET** `/api/v1/cards/strength/:cardId`

Calculates the strength and balance score for an existing card on-demand.

**Path Parameters:**
- `cardId` (string, required) - The unique card ID to calculate strength for

**Response:** `200 OK`

```json
{
  "totalStrength": 52.3,
  "balanceCategory": "balanced",
  "breakdown": {
    "hpStrength": 45.2,
    "attackStrength": 38.7,
    "abilityStrength": 12.4
  },
  "penalties": {
    "sustainability": 0,
    "evolutionDependency": 5.0,
    "prizeLiability": 0,
    "evolution": 2.5
  },
  "bonuses": {
    "retreatCost": 0,
    "basicPokemon": 0
  }
}
```

**Error Responses:**
- `404 Not Found` - Card with the specified ID does not exist

**Example Request:**
```bash
curl http://localhost:3000/api/v1/cards/strength/pokemon-base-set-v1.0-chansey--3
```

---

### 🔄 Phase 2-4: Card Editor Endpoints (PLANNED)

#### 1. Get Editor Metadata

**GET** `/api/v1/cards/editor/metadata`

Returns all metadata needed to initialize the card editor UI.

**Response:** `200 OK`

```json
{
  "pokemon": [
    { "name": "Pikachu", "pokemonNumber": "025" },
    { "name": "Charizard", "pokemonNumber": "006" }
  ],
  "energyTypes": ["FIRE", "WATER", "GRASS", "ELECTRIC", "PSYCHIC", "FIGHTING", "DARKNESS", "METAL", "FAIRY", "DRAGON", "COLORLESS"],
  "attackEffectTypes": ["DISCARD_ENERGY", "STATUS_CONDITION", "DAMAGE_MODIFIER", "HEAL", "PREVENT_DAMAGE", "RECOIL_DAMAGE", "ENERGY_ACCELERATION", "SWITCH_POKEMON"],
  "abilityEffectTypes": ["HEAL", "PREVENT_DAMAGE", "STATUS_CONDITION", "ENERGY_ACCELERATION", "SWITCH_POKEMON", "DRAW_CARDS", "SEARCH_DECK", "BOOST_ATTACK", "BOOST_HP", "REDUCE_DAMAGE", "DISCARD_FROM_HAND", "ATTACH_FROM_DISCARD", "RETRIEVE_FROM_DISCARD"],
  "abilityActivationTypes": ["PASSIVE", "TRIGGERED", "ACTIVATED"],
  "pokemonTypes": ["FIRE", "WATER", "GRASS", "ELECTRIC", "PSYCHIC", "FIGHTING", "DARKNESS", "METAL", "FAIRY", "DRAGON", "COLORLESS"],
  "evolutionStages": ["BASIC", "STAGE_1", "STAGE_2", "VMAX", "VSTAR", "GX", "EX", "MEGA", "BREAK", "LEGEND"]
}
```

---

#### 2. Get Card for Editing

**GET** `/api/v1/cards/editor/:instanceId`

Retrieves a card by instanceId for duplication or editing.

**Path Parameters:**
- `instanceId` (string, required) - The unique instance ID of the card

**Response:** `200 OK` - `CardEditorResponseDto`

**Error Responses:**
- `404 Not Found` - Card not found

---

#### 3. Create Card

**POST** `/api/v1/cards/editor/create`

Creates a new card with full server-side validation.

**Request Body:** `CreateCardRequestDto`

```json
{
  "pokemonName": "Pikachu",
  "pokemonNumber": "025",
  "hp": 60,
  "pokemonType": "ELECTRIC",
  "stage": "BASIC",
  "attacks": [
    {
      "name": "Thunder Shock",
      "energyCost": ["ELECTRIC"],
      "damage": "10",
      "text": "Flip a coin. If heads, the Defending Pokémon is now Paralyzed.",
      "effects": []
    },
    {
      "name": "Thunderbolt",
      "energyCost": ["ELECTRIC", "ELECTRIC", "COLORLESS"],
      "damage": "50",
      "text": "Discard all Energy cards attached to Pikachu.",
      "effects": []
    }
  ],
  "ability": {
    "name": "Static",
    "text": "When this Pokémon is your Active Pokémon and is damaged by an opponent's attack, flip a coin. If heads, the Attacking Pokémon is now Paralyzed.",
    "activationType": "TRIGGERED",
    "triggerEvent": "WHEN_DAMAGED",
    "effects": [
      {
        "effectType": "STATUS_CONDITION",
        "target": "DEFENDING",
        "statusCondition": "PARALYZED"
      }
    ]
  },
  "weakness": {
    "type": "FIGHTING",
    "modifier": "×2"
  },
  "resistance": {
    "type": "METAL",
    "modifier": "-30"
  },
  "retreatCost": 1,
  "createdBy": "username"
}
```

**Response:** `201 Created` - `CardEditorResponseDto`

**Error Responses:**
- `400 Bad Request` - Invalid card data or validation failures
- `422 Unprocessable Entity` - Business rule violations (e.g., unsupported energy type, Pokemon not in list)

---

#### 4. Update Card

**PUT** `/api/v1/cards/editor/:instanceId`

Updates an existing editor-created card (official cards are read-only).

**Path Parameters:**
- `instanceId` (string, required) - The unique instance ID of the card to update

**Request Body:** `UpdateCardRequestDto` (same structure as CreateCardRequestDto)

**Response:** `200 OK` - `CardEditorResponseDto`

**Error Responses:**
- `400 Bad Request` - Invalid card data
- `404 Not Found` - Card not found
- `409 Conflict` - Attempting to edit official card (read-only)

---

## Card Strength Algorithm Details

### Overview

The card strength algorithm evaluates card balance across multiple dimensions and normalizes each to a 0-100 scale. A score of **50 represents perfect balance**.

### Algorithm Components

#### 1. Evolution Value Multiplier

The algorithm applies different multipliers based on evolution stage:

- **BASIC**: 1.0 (full value)
- **STAGE_1**: 0.5 (half value)
- **STAGE_2**: 0.33 (one-third value)

**Tooltip**: Higher evolution stages are expected to be stronger, so the algorithm adjusts base calculations accordingly.

---

#### 2. HP Strength Calculation

**Formula:**
```
hpStrength = evolveValue × hp × weaknessModifier × resistanceModifier
```

**Modifiers:**
- `weaknessModifier`: 0.5 if weakness exists, 1.0 otherwise
- `resistanceModifier`: 2.0 if resistance exists, 1.0 otherwise

**Normalization**: 0-200 raw HP strength → 0-100 normalized

**Tooltip**: 
- Weakness reduces HP strength (card is more vulnerable)
- Resistance increases HP strength (card is more durable)
- Evolution stage affects base HP value calculation

---

#### 3. Attack Strength Calculation

**Step 1: Calculate Average Damage**
- Parses damage strings: "30", "30+", "20×", "30+20"
- If coin flip affects damage: divides by 2 (50% chance)
- If extra energy increases damage: calculates average of min and max
  - Example: "30+" with energy bonus cap of 3 → average = (30 + 60) / 2 = 45

**Step 2: Calculate Attack Efficiency**
```
attackEfficiency = averageDamage / energyCost
```

**Step 3: Apply Bonuses & Penalties**
- **Effect Bonus**: +10 points if attack has effects
- **Poison Bonus**: +20 points (instead of +10) if attack has poison effect
- **Coin Flip Penalty**: Divide efficiency by 2 if coin flip required

**Step 4: Average All Attacks**
```
attackStrength = (attack1Strength + attack2Strength) / numberOfAttacks
```

**Normalization**: 0-50 raw attack strength → 0-100 normalized

**Tooltip**:
- More efficient attacks (high damage per energy) score higher
- Effects add value, especially status conditions like poison
- Coin flips reduce reliability and lower the score
- Variable damage ("30+") is averaged for fairness

---

#### 4. Ability Strength Calculation

**Formula:**
```
abilityStrength = (1 / evolveValue) × baseAbilityValue
```

Where:
- `baseAbilityValue`: 50 (fixed base value for having an ability)
- Lower evolution stages get higher ability strength (unexpected/rare)

**Normalization**: 0-150 raw ability strength → 0-100 normalized

**Tooltip**:
- Abilities on Basic Pokemon are more valuable (unexpected)
- Abilities on evolved Pokemon are expected and score lower
- Example: Basic Pokemon with ability = 50 points, Stage 2 with ability = 16.5 points

---

#### 5. Penalties & Bonuses

**Penalties Applied:**
- **Sustainability**: Penalty for self-damaging attacks (reduces card longevity)
- **Evolution Dependency**: Penalty for multi-stage evolution dependency (harder to set up)
- **Prize Liability**: Penalty for low HP making it easy to take prizes
- **Evolution**: Penalty for being an evolved Pokemon (setup cost)

**Bonuses Applied:**
- **Retreat Cost**: Bonus for low or free retreat cost (flexibility)
- **Basic Pokemon**: Bonus for being a Basic Pokemon (format advantage, easier to play)

**Tooltip**: These adjustments account for real gameplay factors beyond raw stats.

---

#### 6. Total Strength Calculation

**Raw Total:**
```
totalStrength = hpStrength + attackStrength + abilityStrength - penalties + bonuses
```

**Normalization**: 0-300 raw total strength → 0-100 normalized

---

### Balance Score Interpretation

The `balanceCategory` field indicates overall card balance:

| Score Range | Category | Meaning |
|------------|----------|---------|
| 0-30 | `very_weak` | Card is significantly underpowered (unbalanced) |
| 31-45 | `weak` | Card is somewhat underpowered (slightly unbalanced) |
| 46-54 | `balanced` | Card is well-balanced ✅ |
| 55-70 | `strong` | Card is somewhat overpowered (slightly unbalanced) |
| 71-100 | `too_strong` | Card is significantly overpowered (unbalanced) |

**Tooltip**: 
- **Balanced (46-54)**: Ideal range for competitive play
- **Very Weak/Weak**: May need buffs or redesign
- **Strong/Too Strong**: May need nerfs or restrictions

---

## Response DTOs

### CardStrengthResponseDto

```typescript
{
  totalStrength: number;        // 0-100 normalized score
  balanceCategory: string;      // 'very_weak' | 'weak' | 'balanced' | 'strong' | 'too_strong'
  breakdown: {
    hpStrength: number;          // 0-100 normalized
    attackStrength: number;      // 0-100 normalized
    abilityStrength: number;     // 0-100 normalized
  };
  penalties: {
    sustainability: number;      // Penalty points applied
    evolutionDependency: number; // Penalty points applied
    prizeLiability: number;     // Penalty points applied
    evolution: number;           // Penalty points applied
  };
  bonuses: {
    retreatCost: number;        // Bonus points applied
    basicPokemon: number;       // Bonus points applied
  };
}
```

---

## Validation Rules

### Pokemon Selection
- ✅ Must be from closed list (extracted from existing cards in database)
- ✅ pokemonNumber must match existing pokemon

### Attacks
- ✅ Maximum 2 attacks per card
- ✅ Each attack must have: name, energyCost (array), damage, text
- ✅ Energy types in energyCost must be from supported list
- ✅ Attack effects (if present) must be from supported list
- ✅ Attack name is user-provided (custom)

### Ability
- ✅ Optional (card may not have an ability)
- ✅ If present, must have: name, text, activationType, effects
- ✅ Activation type must be from supported list
- ✅ Effects must be from supported list

### HP
- ✅ Required positive integer

### Weakness/Resistance
- ✅ Optional
- ✅ If present, type must be from supported PokemonType enum
- ✅ Modifier must be valid format (e.g., "×2", "-30")

### Metadata
- ✅ `createdBy` is required in request body (username)
- ✅ `createdAt` is auto-generated by server

---

## Error Handling

| Status Code | Meaning | Common Causes |
|------------|---------|---------------|
| 200 | Success | Request processed successfully |
| 201 | Created | Card created successfully |
| 400 | Bad Request | Invalid card data, validation failures |
| 404 | Not Found | Card not found |
| 409 | Conflict | Attempting to edit official card (read-only) |
| 422 | Unprocessable Entity | Business rule violations (unsupported energy type, etc.) |
| 500 | Internal Server Error | Server error |

---

## Example Workflows

### 1. Calculate Strength for Existing Card

```bash
# Get strength for a specific card
curl http://localhost:3000/api/v1/cards/strength/pokemon-base-set-v1.0-chansey--3

# Response shows balanced card (52.3)
{
  "totalStrength": 52.3,
  "balanceCategory": "balanced",
  ...
}
```

### 2. Create and Analyze New Card (Planned)

```bash
# Step 1: Get metadata for editor
curl http://localhost:3000/api/v1/cards/editor/metadata

# Step 2: Create new card
curl -X POST http://localhost:3000/api/v1/cards/editor/create \
  -H "Content-Type: application/json" \
  -d '{
    "pokemonName": "Pikachu",
    "pokemonNumber": "025",
    "hp": 60,
    ...
  }'

# Step 3: Calculate strength for newly created card
curl http://localhost:3000/api/v1/cards/strength/{newCardId}
```

---

## Additional Resources

- **Algorithm Documentation**: `src/modules/card/docs/card-strength-algorithm.md`
- **E2E Tests**: `test/card-strength.e2e-spec.ts`
- **Reference Script**: `calculate-card-strengths.js`

---

## Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | Card Strength Calculation | ✅ **COMPLETED** |
| Phase 2 | Card Creation & Validation | 🔄 **PLANNED** |
| Phase 3 | Card Editing & Duplication | 🔄 **PLANNED** |
| Phase 4 | Editor Metadata & Pokemon List | 🔄 **PLANNED** |

---

## Notes

- All endpoints follow RESTful conventions
- API versioning: `/api/v1/`
- No authentication required currently
- CORS enabled for all origins
- All timestamps in ISO 8601 format
- Card IDs follow format: `{author}-{setName}-v{version}-{name}--{cardNumber}`

