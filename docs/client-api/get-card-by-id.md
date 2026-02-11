# Get Full Information for a Specific Card

This guide explains how a client can fetch **all information** about a single card using its unique `cardId`.

---

## API

**Endpoint:** `GET /api/v1/cards/:cardId`

- **Method:** GET  
- **Path parameter:** `cardId` (string) – the unique card identifier  
- **Response:** `200 OK` with a single card object, or `404 Not Found` if no card matches  

**Base URL examples:**
- Local: `http://localhost:3000`
- Production: `https://api.open-tcg.com`

**Example request:**
```http
GET /api/v1/cards/pokemon-base-set-v1.0-blastoise--2
Host: api.open-tcg.com
Accept: application/json
```

**Example (curl):**
```bash
curl -s "https://api.open-tcg.com/api/v1/cards/pokemon-base-set-v1.0-blastoise--2"
```

---

## Card ID format

- **Pattern:** `{author}-{setName}-v{version}-{cardName}--{cardNumber}`  
  or, if the card has a level:  
  `{author}-{setName}-v{version}-{cardName}-{level}-{cardNumber}`
- **Examples:**
  - `pokemon-base-set-v1.0-blastoise--2` (Blastoise, card #2 in Base Set)
  - `pokemon-base-set-v1.0-alakazam--1` (Alakazam, card #1)
  - `pokemon-fossil-v1.0-dragonite--4` (Dragonite 4/62 in Fossil)
- The server **normalizes** `cardId` (e.g. multiple dashes collapsed), so small formatting differences in the request are accepted as long as they resolve to the same card.

You can discover `cardId` values from:
- `GET /api/v1/cards/sets/preview/:author/:setName/v:version` – each card in the response has a `cardId`
- Deck or match payloads that reference cards by `cardId`

---

## Response object (200 OK)

The response body is a single **card detail object** with the following structure. All fields relevant to the card type are present; optional fields may be omitted or `undefined` for other types.

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | string | Unique card identifier (template ID). |
| `instanceId` | string | Unique instance identifier (UUID). |
| `name` | string | Card name. |
| `cardNumber` | string | Card number within the set (e.g. `"1"`, `"52"`). |
| `setName` | string | Set name (e.g. `"base-set"`). |
| `cardType` | string | One of: `POKEMON`, `TRAINER`, `ENERGY`. |
| `rarity` | string | e.g. `COMMON`, `RARE`, `RARE_HOLO`. |
| `artist` | string | Card artist. |
| `description` | string (optional) | Flavor text or description. |
| `imageUrl` | string | URL to the card image. |
| `regulationMark` | string (optional) | Regulation mark (e.g. `F`). |

**Pokémon-only fields (when `cardType === 'POKEMON'`):**

| Field | Type | Description |
|-------|------|-------------|
| `pokemonNumber` | string (optional) | Pokédex number (e.g. `"009"`). |
| `pokemonType` | string (optional) | e.g. `WATER`, `PSYCHIC`, `COLORLESS`. |
| `hp` | number (optional) | Hit points. |
| `stage` | string (optional) | e.g. `BASIC`, `STAGE_1`, `STAGE_2`. |
| `evolvesFrom` | string (optional) | Name of Pokémon this evolves from. |
| `ability` | object (optional) | Ability (see below). |
| `attacks` | array (optional) | List of attacks (see below). |
| `weakness` | object (optional) | `{ type, modifier }`. |
| `resistance` | object (optional) | `{ type, modifier }`. |
| `retreatCost` | number (optional) | Retreat cost. |

**Trainer-only fields (when `cardType === 'TRAINER'`):**

| Field | Type | Description |
|-------|------|-------------|
| `trainerType` | string (optional) | e.g. `ITEM`, `SUPPORTER`. |
| `trainerEffects` | array (optional) | List of structured trainer effects. |

**Energy-only fields (when `cardType === 'ENERGY'`):**

| Field | Type | Description |
|-------|------|-------------|
| `energyType` | string (optional) | e.g. `WATER`, `FIRE`. |

### Ability object (Pokémon)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Ability name. |
| `text` | string | Human-readable ability text. |
| `activationType` | string | e.g. `ACTIVATED`, `TRIGGERED`. |
| `triggerEvent` | string (optional) | Game event that triggers (for triggered abilities). |
| `usageLimit` | string (optional) | e.g. `UNLIMITED`, `ONCE_PER_TURN`. |
| `effects` | array (optional) | Structured effects (e.g. `effectType`, `target`, `count`). |

### Attack object (Pokémon)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Attack name. |
| `energyCost` | string[] | Energy types required (e.g. `["WATER","WATER","COLORLESS"]`). |
| `damage` | string | Base damage (e.g. `"40"`, `"30×"`, `"40+"`). |
| `text` | string | Human-readable effect text. |
| `effects` | array (optional) | Structured attack effects. |
| `energyBonusCap` | number (optional) | Cap for “+” damage attacks. |

### Weakness / Resistance

- **weakness:** `{ type: string, modifier: string }` (e.g. `{ type: "GRASS", modifier: "×2" }`).
- **resistance:** `{ type: string, modifier: string }` (e.g. `{ type: "FIGHTING", modifier: "-30" }`).

---

## Example response (Pokémon)

```json
{
  "cardId": "pokemon-base-set-v1.0-blastoise--2",
  "instanceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Blastoise",
  "pokemonNumber": "009",
  "cardNumber": "2",
  "setName": "base-set",
  "cardType": "POKEMON",
  "pokemonType": "WATER",
  "rarity": "RARE_HOLO",
  "hp": 100,
  "stage": "STAGE_2",
  "evolvesFrom": "Wartortle",
  "ability": {
    "name": "Rain Dance",
    "text": "As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon...",
    "activationType": "ACTIVATED",
    "usageLimit": "UNLIMITED",
    "effects": [
      {
        "effectType": "ENERGY_ACCELERATION",
        "target": "ALL_YOURS",
        "source": "HAND",
        "count": 1,
        "energyType": "WATER",
        "targetPokemonType": "WATER"
      }
    ]
  },
  "attacks": [
    {
      "name": "Hydro Pump",
      "energyCost": ["WATER", "WATER", "WATER"],
      "damage": "40+",
      "energyBonusCap": 2,
      "text": "Does 40 damage plus 10 more damage for each Water Energy attached to Blastoise..."
    }
  ],
  "weakness": { "type": "LIGHTNING", "modifier": "×2" },
  "retreatCost": 4,
  "artist": "Ken Sugimori",
  "description": "A brutal Pokémon with pressurized water jets on its shell...",
  "imageUrl": "https://example.com/images/blastoise.png"
}
```

---

## Error response (404)

When no card exists for the given `cardId`:

**Status:** `404 Not Found`

**Body (example):**
```json
{
  "message": "Card with ID pokemon-base-set-v1.0-unknown--99 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Summary for clients

1. Use **`GET /api/v1/cards/:cardId`** to get full details for one card.
2. **cardId** comes from set preview responses or deck/match data; format is `{author}-{setName}-v{version}-{cardName}--{cardNumber}` (or with `-{level}-` when applicable).
3. The response is a **single card object** with all display and game-relevant fields (identity, type, stats, ability, attacks, weakness, resistance, etc.).
4. Handle **404** when the card does not exist or the `cardId` is invalid.
