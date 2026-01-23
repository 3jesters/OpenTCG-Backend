import * as fs from 'fs';
import * as path from 'path';

interface DeckFile {
  id: string;
  name: string;
  isValid: boolean;
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;
}

function main() {
  const decksDir = path.resolve(__dirname, '..', 'data', 'decks');
  const deckFiles = fs.readdirSync(decksDir)
    .filter(f => f.endsWith('.json') && f.includes('auto-deck-machine'))
    .sort();

  console.log('📊 Analyzing decks missing 1-5 cards:\n');

  const closeDecks: Array<{ file: string; name: string; total: number; missing: number }> = [];

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const missing = 60 - total;

    if (missing > 0 && missing <= 5) {
      closeDecks.push({ file: deckFile, name: deck.name, total, missing });
    }
  }

  console.log(`Found ${closeDecks.length} decks missing 1-5 cards:\n`);
  
  for (const deck of closeDecks) {
    console.log(`📦 ${deck.name}`);
    console.log(`   File: ${deck.file}`);
    console.log(`   Current: ${deck.total} cards`);
    console.log(`   Missing: ${deck.missing} card(s)`);
    console.log(`   URL: Check the original extraction script for URL`);
    console.log('');
  }

  console.log('\n💡 These decks are close to being valid and may just need:');
  console.log('   - One or more cards that weren\'t parsed correctly');
  console.log('   - Cards with levels that need to be matched correctly');
  console.log('   - Cards from different sets (e.g., fossil vs base-set)');
}

main();
