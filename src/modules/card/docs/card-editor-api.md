# Card Editor API Documentation

## Overview

The Card Editor API allows clients to create custom Pokémon cards through a validated, structured interface. All cards created through this API are marked as editor-created and include metadata tracking.

**Base URL**: `/api/v1/cards/editor`

---

## Create Card

Creates a new Pokémon card with full validation.

### Endpoint

```
POST /api/v1/cards/editor/create
```

### Request Headers

```
Content-Type: application/json
```

### Request Body

The request body must be a JSON object conforming to `CreateCardRequestDto`:

#### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `pokemonName` | `string` | Name of the Pokémon (must exist in database) | `"Pikachu"` |
| `pokemonNumber` | `string` | Pokédex number (must match pokemonName) | `"025"` |
| `hp` | `number` | Hit points (must be ≥ 1) | `60` |
| `stage` | `string` | Evolution stage (enum) | `"BASIC"` |
| `pokemonType` | `string` | Pokémon type (enum) | `"ELECTRIC"` |
| `createdBy` | `string` | Username of creator | `"test-user"` |

#### Optional Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `attacks` | `Attack[]` | Array of attacks (max 2) | See Attack Structure below |
| `ability` | `Ability` | Pokémon ability | See Ability Structure below |
| `weakness` | `Weakness` | Type weakness | See Weakness Structure below |
| `resistance` | `Resistance` | Type resistance | See Resistance Structure below |
| `retreatCost` | `number` | Retreat cost (≥ 0) | `0-4` typical range |
| `evolvesFrom` | `Evolution` | Previous evolution | See Evolution Structure below |

### Data Structures

#### Attack Structure

```typescript
{
  name: string;              // Required: Attack name
  energyCost: string[];      // Required: Array of energy types (enum values)
  damage: string;            // Required: Damage string (e.g., "30", "30+", "20×")
  text: string;              // Required: Human-readable attack description
  effects?: AttackEffect[];  // Optional: Structured effects
  energyBonusCap?: number;   // Optional: Max extra energy for "+" damage attacks
}
```

**Energy Types** (for `energyCost`):
- `"FIRE"`, `"WATER"`, `"GRASS"`, `"ELECTRIC"`, `"PSYCHIC"`, `"FIGHTING"`, `"DARKNESS"`, `"METAL"`, `"FAIRY"`, `"DRAGON"`, `"COLORLESS"`

**Attack Effect Types**:
- `"DISCARD_ENERGY"` - Discard energy from self or opponent
- `"STATUS_CONDITION"` - Apply status condition (PARALYZED, POISONED, BURNED, ASLEEP, CONFUSED)
- `"DAMAGE_MODIFIER"` - Modify attack damage
- `"HEAL"` - Heal damage
- `"PREVENT_DAMAGE"` - Prevent incoming damage
- `"RECOIL_DAMAGE"` - Self-inflicted damage
- `"ENERGY_ACCELERATION"` - Attach energy from deck/discard/hand
- `"SWITCH_POKEMON"` - Switch with benched Pokémon

#### Ability Structure

```typescript
{
  name: string;                    // Required: Ability name
  text: string;                    // Required: Ability description
  activationType: string;           // Required: "PASSIVE" | "TRIGGERED" | "ACTIVATED"
  effects?: AbilityEffect[];       // Optional: Structured effects
}
```

**Activation Types**:
- `"PASSIVE"` - Always active
- `"TRIGGERED"` - Activates on game events
- `"ACTIVATED"` - Player chooses to use

#### Weakness Structure

```typescript
{
  type: string;      // Required: Pokémon type (enum)
  modifier: string;  // Required: Modifier format (e.g., "×2", "+20")
}
```

**Modifier Format**: Must match pattern `/^[×+]\d+$/` (e.g., `"×2"`, `"+20"`)

#### Resistance Structure

```typescript
{
  type: string;      // Required: Pokémon type (enum)
  modifier: string;  // Required: Modifier format (e.g., "-20", "-30")
}
```

**Modifier Format**: Must match pattern `/^-\d+$/` (e.g., `"-20"`, `"-30"`)

#### Evolution Structure

```typescript
{
  name: string;          // Required: Pokémon name
  pokemonNumber: string; // Required: Pokédex number
}
```

### Request Examples

#### Minimal Request (Basic Pokémon)

```json
{
  "pokemonName": "Pikachu",
  "pokemonNumber": "025",
  "hp": 60,
  "stage": "BASIC",
  "pokemonType": "ELECTRIC",
  "createdBy": "test-user"
}
```

#### Complete Request (Full Card)

```json
{
  "pokemonName": "Charizard",
  "pokemonNumber": "006",
  "hp": 120,
  "stage": "STAGE_2",
  "pokemonType": "FIRE",
  "attacks": [
    {
      "name": "Fire Blast",
      "energyCost": ["FIRE", "FIRE", "FIRE"],
      "damage": "100",
      "text": "Discard 2 Energy attached to this Pokemon."
    },
    {
      "name": "Wing Attack",
      "energyCost": ["FIRE", "COLORLESS", "COLORLESS"],
      "damage": "60",
      "text": "Does 60 damage."
    }
  ],
  "ability": {
    "name": "Energy Burn",
    "text": "As often as you like during your turn, you may turn all Energy attached to this Pokemon into Fire Energy for the rest of the turn.",
    "activationType": "ACTIVATED",
    "effects": []
  },
  "weakness": {
    "type": "WATER",
    "modifier": "×2"
  },
  "resistance": {
    "type": "FIGHTING",
    "modifier": "-30"
  },
  "retreatCost": 3,
  "evolvesFrom": {
    "name": "Charmeleon",
    "pokemonNumber": "005"
  },
  "createdBy": "test-user"
}
```

#### Request with Attack Effects

```json
{
  "pokemonName": "Arbok",
  "pokemonNumber": "024",
  "hp": 60,
  "stage": "STAGE_1",
  "pokemonType": "GRASS",
  "attacks": [
    {
      "name": "Poison Sting",
      "energyCost": ["GRASS"],
      "damage": "10",
      "text": "The Defending Pokemon is now Poisoned.",
      "effects": [
        {
          "effectType": "STATUS_CONDITION",
          "statusCondition": "POISONED",
          "target": "DEFENDING"
        }
      ]
    }
  ],
  "createdBy": "test-user"
}
```

### Response

#### Success Response (201 Created)

```json
{
  "instanceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cardId": "editor-charizard-006",
  "name": "Charizard",
  "pokemonNumber": "006",
  "cardNumber": "1699123456789",
  "setName": "editor-created",
  "cardType": "POKEMON",
  "pokemonType": "FIRE",
  "rarity": "COMMON",
  "hp": 120,
  "stage": "STAGE_2",
  "evolvesFrom": "Charmeleon",
  "attacks": [
    {
      "name": "Fire Blast",
      "energyCost": ["FIRE", "FIRE", "FIRE"],
      "damage": "100",
      "text": "Discard 2 Energy attached to this Pokemon.",
      "effects": []
    }
  ],
  "ability": {
    "name": "Energy Burn",
    "text": "As often as you like during your turn...",
    "activationType": "ACTIVATED",
    "effects": []
  },
  "weakness": {
    "type": "WATER",
    "modifier": "×2"
  },
  "resistance": {
    "type": "FIGHTING",
    "modifier": "-30"
  },
  "retreatCost": 3,
  "artist": "Editor",
  "description": "",
  "imageUrl": "",
  "createdBy": "test-user",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "isEditorCreated": true
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `instanceId` | `string` | Unique UUID for this card instance |
| `cardId` | `string` | Unique identifier for this card variant |
| `name` | `string` | Pokémon name |
| `pokemonNumber` | `string` | Pokédex number |
| `cardNumber` | `string` | Card number (timestamp-based for editor cards) |
| `setName` | `string` | Set name (always `"editor-created"` for editor cards) |
| `cardType` | `string` | Always `"POKEMON"` |
| `pokemonType` | `string` | Pokémon type |
| `rarity` | `string` | Always `"COMMON"` for editor-created cards |
| `hp` | `number` | Hit points |
| `stage` | `string` | Evolution stage |
| `evolvesFrom` | `string` | Name of previous evolution (if applicable) |
| `attacks` | `Attack[]` | Array of attacks (0-2) |
| `ability` | `Ability` | Ability object (if provided) |
| `weakness` | `Weakness` | Weakness object (if provided) |
| `resistance` | `Resistance` | Resistance object (if provided) |
| `retreatCost` | `number` | Retreat cost (if provided) |
| `artist` | `string` | Always `"Editor"` for editor-created cards |
| `description` | `string` | Empty string for editor-created cards |
| `imageUrl` | `string` | Empty string for editor-created cards |
| `createdBy` | `string` | Username of creator |
| `createdAt` | `string` | ISO 8601 timestamp |
| `isEditorCreated` | `boolean` | Always `true` |

### Error Responses

#### 400 Bad Request - Validation Errors

**Missing Required Field**:
```json
{
  "statusCode": 400,
  "message": [
    "pokemonName should not be empty",
    "pokemonName must be a string"
  ],
  "error": "Bad Request"
}
```

**Invalid Array Size** (more than 2 attacks):
```json
{
  "statusCode": 400,
  "message": [
    "attacks must contain not more than 2 items"
  ],
  "error": "Bad Request"
}
```

**Invalid HP Value**:
```json
{
  "statusCode": 400,
  "message": [
    "hp must not be less than 1"
  ],
  "error": "Bad Request"
}
```

#### 422 Unprocessable Entity - Business Logic Errors

**Invalid Pokémon Selection**:
```json
{
  "statusCode": 422,
  "message": "Pokemon \"FakePokemon\" with number \"999\" is not in the supported list. Please select a Pokemon from existing cards.",
  "error": "Unprocessable Entity"
}
```

**Pokémon Name/Number Mismatch**:
```json
{
  "statusCode": 422,
  "message": "Pokemon name \"Pikachu\" does not match Pokemon number \"999\".",
  "error": "Unprocessable Entity"
}
```

**Invalid Energy Type**:
```json
{
  "statusCode": 422,
  "message": "Invalid energy type: INVALID_ENERGY",
  "error": "Unprocessable Entity"
}
```

**Invalid Attack Effect Type**:
```json
{
  "statusCode": 422,
  "message": "Invalid attack effect type: INVALID_EFFECT",
  "error": "Unprocessable Entity"
}
```

**Invalid Weakness Modifier**:
```json
{
  "statusCode": 422,
  "message": "Invalid weakness modifier format: invalid. Expected format: ×2, +20, etc.",
  "error": "Unprocessable Entity"
}
```

**Invalid Resistance Modifier**:
```json
{
  "statusCode": 422,
  "message": "Invalid resistance modifier format: invalid. Expected format: -20, -30, etc.",
  "error": "Unprocessable Entity"
}
```

**Invalid Stage**:
```json
{
  "statusCode": 422,
  "message": "Invalid evolution stage: INVALID_STAGE",
  "error": "Unprocessable Entity"
}
```

**Invalid Pokémon Type**:
```json
{
  "statusCode": 422,
  "message": "Invalid Pokemon type: INVALID_TYPE",
  "error": "Unprocessable Entity"
}
```

---

## Validation Rules & Constraints

### Pokémon Selection

1. **Pokémon Must Exist**: The `pokemonName` and `pokemonNumber` combination must exist in the database (from existing card sets).
2. **Name-Number Match**: The provided `pokemonName` must match the `pokemonNumber` in the database.

**How to Get Valid Pokémon List**:
- Query existing cards from the database
- Extract unique `(name, pokemonNumber)` pairs
- Present these as options in your UI

### Attacks

1. **Maximum 2 Attacks**: A card can have at most 2 attacks.
2. **Required Fields**: Each attack must have `name`, `energyCost`, `damage`, and `text`.
3. **Energy Types**: All values in `energyCost` array must be valid `EnergyType` enum values.
4. **Effects**: If provided, all effects must have valid `effectType` values.

### Ability

1. **Required Fields**: Ability must have `name`, `text`, and `activationType`.
2. **Activation Type**: Must be one of: `"PASSIVE"`, `"TRIGGERED"`, `"ACTIVATED"`.
3. **Effects**: If provided, all effects must have valid `effectType` values.

### Weakness & Resistance

1. **Type Validation**: Type must be a valid `PokemonType` enum value.
2. **Modifier Format**:
   - Weakness: Must match `/^[×+]\d+$/` (e.g., `"×2"`, `"+20"`)
   - Resistance: Must match `/^-\d+$/` (e.g., `"-20"`, `"-30"`)

### HP

1. **Minimum Value**: HP must be ≥ 1.
2. **Integer**: HP must be an integer (not a decimal).

### Stage

Must be one of:
- `"BASIC"`
- `"STAGE_1"`
- `"STAGE_2"`
- `"VMAX"`
- `"VSTAR"`
- `"GX"`
- `"EX"`
- `"MEGA"`
- `"BREAK"`
- `"LEGEND"`

### Pokémon Type

Must be one of:
- `"FIRE"`
- `"WATER"`
- `"GRASS"`
- `"ELECTRIC"`
- `"PSYCHIC"`
- `"FIGHTING"`
- `"DARKNESS"`
- `"METAL"`
- `"FAIRY"`
- `"DRAGON"`
- `"COLORLESS"`

---

## Client-Side Implementation Guide

### 1. Pre-validation

Before submitting the request, validate on the client side:

```typescript
// Example TypeScript validation
function validateCardRequest(data: CreateCardRequestDto): string[] {
  const errors: string[] = [];
  
  // Required fields
  if (!data.pokemonName) errors.push('Pokemon name is required');
  if (!data.pokemonNumber) errors.push('Pokemon number is required');
  if (!data.hp || data.hp < 1) errors.push('HP must be at least 1');
  if (!data.stage) errors.push('Stage is required');
  if (!data.pokemonType) errors.push('Pokemon type is required');
  if (!data.createdBy) errors.push('Creator username is required');
  
  // Attacks validation
  if (data.attacks && data.attacks.length > 2) {
    errors.push('Maximum 2 attacks allowed');
  }
  
  // Attack fields validation
  data.attacks?.forEach((attack, index) => {
    if (!attack.name) errors.push(`Attack ${index + 1}: name is required`);
    if (!attack.energyCost || attack.energyCost.length === 0) {
      errors.push(`Attack ${index + 1}: energy cost is required`);
    }
    if (!attack.damage) errors.push(`Attack ${index + 1}: damage is required`);
    if (!attack.text) errors.push(`Attack ${index + 1}: text is required`);
  });
  
  // Ability validation
  if (data.ability) {
    if (!data.ability.name) errors.push('Ability name is required');
    if (!data.ability.text) errors.push('Ability text is required');
    if (!data.ability.activationType) {
      errors.push('Ability activation type is required');
    }
  }
  
  return errors;
}
```

### 2. Making the Request

```typescript
// Example fetch request
async function createCard(cardData: CreateCardRequestDto): Promise<CardEditorResponseDto> {
  const response = await fetch('/api/v1/cards/editor/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cardData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create card');
  }
  
  return await response.json();
}
```

### 3. Error Handling

```typescript
try {
  const card = await createCard(cardData);
  console.log('Card created:', card.instanceId);
} catch (error) {
  if (error.response?.status === 400) {
    // Validation errors - show field-specific messages
    const messages = error.response.data.message;
    messages.forEach(msg => showError(msg));
  } else if (error.response?.status === 422) {
    // Business logic errors - show message
    showError(error.response.data.message);
  } else {
    // Network or server errors
    showError('An unexpected error occurred');
  }
}
```

### 4. Getting Valid Pokémon List

To get the list of valid Pokémon for selection, you can:

1. **Query existing cards** (if you have access to the card preview API):
   ```
   GET /api/v1/cards/sets/preview/:author/:setName/v:version
   ```

2. **Extract unique Pokémon**:
   ```typescript
   const pokemonMap = new Map<string, { name: string; number: string }>();
   
   cards.forEach(card => {
     if (card.cardType === 'POKEMON' && card.pokemonNumber) {
       const key = `${card.name}-${card.pokemonNumber}`;
       if (!pokemonMap.has(key)) {
         pokemonMap.set(key, {
           name: card.name,
           number: card.pokemonNumber,
         });
       }
     }
   });
   
   const pokemonList = Array.from(pokemonMap.values());
   ```

---

## Example Workflows

### Workflow 1: Create Basic Pokémon

1. User selects Pokémon from dropdown (Pikachu, #025)
2. User enters HP (60)
3. User selects stage (BASIC)
4. User selects type (ELECTRIC)
5. User enters creator name
6. Submit request
7. Display created card with `instanceId`

### Workflow 2: Create Full Card with Attacks

1. Complete Workflow 1 steps
2. Add first attack:
   - Name: "Thunder Shock"
   - Energy: [ELECTRIC]
   - Damage: "20"
   - Text: "Does 20 damage."
3. Add second attack (optional):
   - Name: "Thunderbolt"
   - Energy: [ELECTRIC, ELECTRIC, COLORLESS]
   - Damage: "60"
   - Text: "Discard 1 Energy attached to this Pokemon."
4. Submit request
5. Display created card with all details

### Workflow 3: Create Card with Ability

1. Complete Workflow 1 steps
2. Add ability:
   - Name: "Static"
   - Text: "If this Pokemon is your Active Pokemon and is damaged by an opponent's attack, flip a coin. If heads, the Attacking Pokemon is now Paralyzed."
   - Activation Type: "TRIGGERED"
3. Submit request
4. Display created card with ability

---

## Notes

1. **Card ID Generation**: The `cardId` is automatically generated as `editor-{pokemonName}-{pokemonNumber}` (kebab-case).

2. **Card Number**: The `cardNumber` is automatically generated as a timestamp for uniqueness.

3. **Set Name**: All editor-created cards have `setName: "editor-created"`.

4. **Rarity**: All editor-created cards default to `"COMMON"` rarity.

5. **Metadata**: All editor-created cards include:
   - `createdBy`: The username provided in the request
   - `createdAt`: Timestamp when the card was created
   - `isEditorCreated`: Always `true`

6. **Evolution Stage Logic**: When providing `evolvesFrom`, the system automatically determines the previous stage:
   - If current stage is `STAGE_1`, previous is `BASIC`
   - If current stage is `STAGE_2`, previous is `STAGE_1`

7. **Attack Effects**: Status condition effects always target `DEFENDING` (opponent's active Pokémon), regardless of the `target` field provided.

---

## Support

For questions or issues with the Card Editor API, please refer to:
- API endpoint: `POST /api/v1/cards/editor/create`
- Validation rules: See "Validation Rules & Constraints" section above
- Error handling: See "Error Responses" section above

