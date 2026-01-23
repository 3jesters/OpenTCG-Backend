import * as fs from 'fs';
import * as path from 'path';

interface CardSetFile {
  metadata: {
    author: string;
    setName: string;
    version: string;
  };
  cards: Array<{
    name: string;
    cardNumber: string;
    pokemonNumber?: string;
    cardType?: string;
    level?: number;
    [key: string]: any;
  }>;
}

interface DeckFile {
  id: string;
  name: string;
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;
  isValid: boolean;
  url?: string;
}

// Expected card list from user
const expectedCards = [
  { name: 'Fire Energy', quantity: 21 },
  { name: 'Double Colorless Energy', quantity: 4 },
  { name: 'Growlithe', quantity: 4 },
  { name: 'Arcanine', level: 45, quantity: 3 },
  { name: 'Magmar', level: 24, quantity: 2 },
  { name: 'Jigglypuff', level: 12, quantity: 3 },
  { name: 'Jigglypuff', level: 14, quantity: 1 },
  { name: 'Wigglytuff', quantity: 1 },
  { name: 'Chansey', quantity: 2 },
  { name: 'Tauros', quantity: 2 },
  { name: 'Professor Oak', quantity: 1 },
  { name: 'Bill', quantity: 2 },
  { name: 'Energy Retrieval', quantity: 2 },
  { name: 'Poké Ball', quantity: 1 },
  { name: 'Computer Search', quantity: 1 },
  { name: 'Defender', quantity: 2 },
  { name: 'Potion', quantity: 3 },
  { name: 'Full Heal', quantity: 1 },
  { name: 'Recycle', quantity: 3 },
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCard(
  cardName: string,
  level: number | undefined,
  cardSets: CardSetFile[],
): { card: any; set: CardSetFile } | null {
  const normalizedName = normalizeName(cardName);

  for (const set of cardSets) {
    for (const card of set.cards) {
      const cardNameNorm = normalizeName(card.name);

      // Match by normalized name
      if (cardNameNorm === normalizedName) {
        // If level is specified, match by level as well
        if (level !== undefined) {
          // Only match if card has the same level
          if (card.level === level) {
            return { card, set };
          }
          // If card doesn't have level but we're searching for one, skip it
          continue;
        }
        // If no level specified, match any card with that name (backward compatible)
        return { card, set };
      }
    }
  }

  return null;
}

function generateCardId(
  author: string,
  setName: string,
  version: string,
  cardName: string,
  cardNumber: string,
  level?: number,
): string {
  const toKebabCase = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/♂/g, '')
      .replace(/♀/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const authorKebab = toKebabCase(author);
  const setNameKebab = toKebabCase(setName);
  const cardNameKebab = toKebabCase(cardName);
  const levelStr = level !== undefined ? level.toString() : '';

  if (levelStr === '') {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}--${cardNumber}`;
  } else {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${levelStr}-${cardNumber}`;
  }
}

function main() {
  console.log('🔍 Validating Fire Auto Deck Machine - Fire Charge Deck\n');

  // Load card sets
  const cardSets: CardSetFile[] = [];
  const setFiles = [
    'pokemon-base-set-v1.0.json',
    'pokemon-jungle-v1.0.json',
    'pokemon-fossil-v1.0.json',
  ];

  for (const file of setFiles) {
    const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', file);
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const cardSet: CardSetFile = JSON.parse(jsonContent);
    cardSets.push(cardSet);
  }

  // Load deck file
  const deckPath = path.resolve(
    __dirname,
    '..',
    'data',
    'decks',
    'fire-auto-deck-machine-fire-charge-deck.json',
  );
  const deckContent = fs.readFileSync(deckPath, 'utf-8');
  const deck: DeckFile = JSON.parse(deckContent);

  console.log(`Deck: ${deck.name}`);
  console.log(`Current total cards: ${deck.cards.reduce((sum, c) => sum + c.quantity, 0)}\n`);

  // Validate each expected card
  const missing: Array<{ name: string; level?: number; quantity: number; reason: string }> = [];
  const found: Array<{ name: string; level?: number; expected: number; actual: number }> = [];
  const incorrect: Array<{ name: string; level?: number; issue: string }> = [];

  for (const expected of expectedCards) {
    const cardMatch = findCard(expected.name, expected.level, cardSets);

    if (!cardMatch) {
      missing.push({
        name: expected.name,
        level: expected.level,
        quantity: expected.quantity,
        reason: `Card not found${expected.level ? ` with level ${expected.level}` : ''}`,
      });
      continue;
    }

    const { card, set } = cardMatch;
    const expectedCardId = generateCardId(
      set.metadata.author,
      set.metadata.setName,
      set.metadata.version,
      card.name,
      card.cardNumber,
      card.level,
    );

    // Find in deck
    const deckCard = deck.cards.find((dc) => dc.cardId === expectedCardId);

    if (!deckCard) {
      missing.push({
        name: expected.name,
        level: expected.level,
        quantity: expected.quantity,
        reason: `CardId not found in deck: ${expectedCardId}`,
      });
    } else {
      if (deckCard.quantity !== expected.quantity) {
        found.push({
          name: expected.name,
          level: expected.level,
          expected: expected.quantity,
          actual: deckCard.quantity,
        });
      }
    }
  }

  // Check for extra cards in deck
  const expectedCardIds = new Set<string>();
  for (const expected of expectedCards) {
    const cardMatch = findCard(expected.name, expected.level, cardSets);
    if (cardMatch) {
      const { card, set } = cardMatch;
      const cardId = generateCardId(
        set.metadata.author,
        set.metadata.setName,
        set.metadata.version,
        card.name,
        card.cardNumber,
        card.level,
      );
      expectedCardIds.add(cardId);
    }
  }

  const extraCards = deck.cards.filter((dc) => !expectedCardIds.has(dc.cardId));

  // Report results
  console.log('📊 Validation Results:\n');

  if (missing.length > 0) {
    console.log(`❌ Missing Cards (${missing.length}):`);
    missing.forEach((m) => {
      console.log(
        `   - ${m.name}${m.level ? ` lv. ${m.level}` : ''} x${m.quantity} (${m.reason})`,
      );
    });
    console.log();
  }

  if (found.length > 0) {
    console.log(`⚠️  Incorrect Quantities (${found.length}):`);
    found.forEach((f) => {
      console.log(
        `   - ${f.name}${f.level ? ` lv. ${f.level}` : ''}: expected x${f.expected}, found x${f.actual}`,
      );
    });
    console.log();
  }

  if (extraCards.length > 0) {
    console.log(`⚠️  Extra Cards in Deck (${extraCards.length}):`);
    extraCards.forEach((ec) => {
      console.log(`   - ${ec.cardId} (${ec.setName}) x${ec.quantity}`);
    });
    console.log();
  }

  const totalExpected = expectedCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalActual = deck.cards.reduce((sum, c) => sum + c.quantity, 0);

  console.log(`\n📈 Summary:`);
  console.log(`   Expected total: ${totalExpected} cards`);
  console.log(`   Actual total: ${totalActual} cards`);
  console.log(`   Missing: ${missing.length} card types`);
  console.log(`   Incorrect quantities: ${found.length} card types`);
  console.log(`   Extra cards: ${extraCards.length} card types`);

  if (missing.length === 0 && found.length === 0 && extraCards.length === 0 && totalExpected === totalActual) {
    console.log(`\n✅ Deck is valid and matches expected list!`);
  } else {
    console.log(`\n❌ Deck needs fixes`);
  }

  // Test level matching specifically
  console.log(`\n🔬 Level Matching Test:`);
  const levelCards = expectedCards.filter((c) => c.level !== undefined);
  console.log(`   Cards with levels: ${levelCards.length}`);
  
  for (const levelCard of levelCards) {
    const match = findCard(levelCard.name, levelCard.level, cardSets);
    if (match) {
      console.log(`   ✓ ${levelCard.name} lv. ${levelCard.level}: Found (${match.card.level})`);
    } else {
      console.log(`   ✗ ${levelCard.name} lv. ${levelCard.level}: NOT FOUND`);
    }
  }
}

main();
