import * as fs from 'fs';
import * as path from 'path';

interface DeckCard {
  cardId: string;
  setName: string;
  quantity: number;
}

interface DeckFile {
  id: string;
  name: string;
  cards: DeckCard[];
}

// Expected card list from user
const expectedCards = [
  { name: 'Fire Energy', quantity: 21 },
  { name: 'Double Colorless Energy', quantity: 4 },
  { name: 'Growlithe', quantity: 4 },
  { name: 'Arcanine lv. 45', quantity: 3 },
  { name: 'Magmar lv. 24', quantity: 2 },
  { name: 'Jigglypuff lv. 12', quantity: 3 },
  { name: 'Jigglypuff lv. 14', quantity: 1 },
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

// Load card sets to map cardIds to names
function loadCardSets() {
  const cardSetsDir = path.join(__dirname, '../data/cards');
  const files = ['pokemon-base-set-v1.0.json', 'pokemon-jungle-v1.0.json', 'pokemon-fossil-v1.0.json'];
  const cardMap = new Map<string, { name: string; setName: string }>();

  for (const file of files) {
    const filePath = path.join(cardSetsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const cardSet = JSON.parse(content);
    const setName = cardSet.metadata.setName;

    for (const card of cardSet.cards) {
      // Generate cardId
      const authorKebab = cardSet.metadata.author.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const setNameKebab = setName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const cardNameKebab = card.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/♂/g, '')
        .replace(/♀/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const levelStr = card.level !== undefined ? card.level.toString() : '';
      const cardId = levelStr === ''
        ? `${authorKebab}-${setNameKebab}-v${cardSet.metadata.version}-${cardNameKebab}--${card.cardNumber}`
        : `${authorKebab}-${setNameKebab}-v${cardSet.metadata.version}-${cardNameKebab}-${levelStr}-${card.cardNumber}`;
      
      cardMap.set(cardId, { name: card.name, setName });
    }
  }

  return cardMap;
}

function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♂/g, '')
    .replace(/♀/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function main() {
  const deckPath = path.join(__dirname, '../data/decks/fire-auto-deck-machine-fire-charge-deck.json');
  const deckContent = fs.readFileSync(deckPath, 'utf-8');
  const deck: DeckFile = JSON.parse(deckContent);

  const cardMap = loadCardSets();

  console.log('='.repeat(80));
  console.log('VALIDATION: Fire Auto Deck Machine - Fire Charge Deck');
  console.log('='.repeat(80));
  console.log();

  // Map current deck cards
  const currentCards = new Map<string, number>();
  for (const deckCard of deck.cards) {
    const cardInfo = cardMap.get(deckCard.cardId);
    if (cardInfo) {
      const normalizedName = normalizeCardName(cardInfo.name);
      const currentQty = currentCards.get(normalizedName) || 0;
      currentCards.set(normalizedName, currentQty + deckCard.quantity);
    } else {
      console.log(`⚠️  Unknown cardId: ${deckCard.cardId}`);
    }
  }

  // Compare with expected
  const missing: Array<{ name: string; expected: number; current: number }> = [];
  const extra: Array<{ name: string; expected: number; current: number }> = [];
  const correct: Array<{ name: string; quantity: number }> = [];

  for (const expected of expectedCards) {
    const normalizedExpected = normalizeCardName(expected.name.replace(/\s+lv\.?\s*\d+/i, '').trim());
    const currentQty = currentCards.get(normalizedExpected) || 0;

    if (currentQty === expected.quantity) {
      correct.push({ name: expected.name, quantity: expected.quantity });
    } else if (currentQty < expected.quantity) {
      missing.push({ name: expected.name, expected: expected.quantity, current: currentQty });
    } else {
      extra.push({ name: expected.name, expected: expected.quantity, current: currentQty });
    }

    // Remove from currentCards to track extras
    currentCards.delete(normalizedExpected);
  }

  // Any remaining in currentCards are extras
  for (const [name, qty] of currentCards.entries()) {
    extra.push({ name, expected: 0, current: qty });
  }

  console.log('✅ CORRECT CARDS:');
  if (correct.length > 0) {
    correct.forEach(c => console.log(`   ${c.name} x${c.quantity}`));
  } else {
    console.log('   (none)');
  }
  console.log();

  if (missing.length > 0) {
    console.log('❌ MISSING/INCORRECT CARDS:');
    missing.forEach(m => {
      if (m.current === 0) {
        console.log(`   ${m.name} x${m.expected} - MISSING (currently: 0)`);
      } else {
        console.log(`   ${m.name} x${m.expected} - WRONG QUANTITY (currently: ${m.current})`);
      }
    });
    console.log();
  }

  if (extra.length > 0) {
    console.log('⚠️  EXTRA/UNEXPECTED CARDS:');
    extra.forEach(e => {
      if (e.expected === 0) {
        console.log(`   ${e.name} x${e.current} - NOT IN EXPECTED LIST`);
      } else {
        console.log(`   ${e.name} x${e.current} - TOO MANY (expected: ${e.expected})`);
      }
    });
    console.log();
  }

  const totalExpected = expectedCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalCurrent = deck.cards.reduce((sum, c) => sum + c.quantity, 0);

  console.log('='.repeat(80));
  console.log(`SUMMARY:`);
  console.log(`   Expected total: ${totalExpected} cards`);
  console.log(`   Current total: ${totalCurrent} cards`);
  console.log(`   Difference: ${totalExpected - totalCurrent} cards`);
  console.log(`   Correct cards: ${correct.length}/${expectedCards.length}`);
  console.log(`   Missing/incorrect: ${missing.length}`);
  console.log(`   Extra/unexpected: ${extra.length}`);
  console.log('='.repeat(80));
}

main();
