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
  isValid: boolean;
  cards: DeckCard[];
}

/**
 * Validate that all decks have exactly 60 cards
 */
function main() {
  const decksDir = path.join(__dirname, '../data/decks');
  const deckFiles = fs.readdirSync(decksDir)
    .filter(f => f.endsWith('.json') && (f.includes('auto-deck-machine') || f.includes('deck-machine')))
    .sort();

  console.log(`Validating ${deckFiles.length} deck files...\n`);

  const results = {
    valid: [] as { file: string; name: string; total: number }[],
    invalid: [] as { file: string; name: string; total: number; difference: number }[],
  };

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const difference = 60 - total;

    if (total === 60) {
      results.valid.push({
        file: deckFile,
        name: deck.name,
        total,
      });
    } else {
      results.invalid.push({
        file: deckFile,
        name: deck.name,
        total,
        difference,
      });
    }
  }

  // Print results
  console.log('='.repeat(80));
  console.log(`✓ Valid decks (60 cards): ${results.valid.length}`);
  console.log(`⚠️  Invalid decks: ${results.invalid.length}`);
  console.log('='.repeat(80));

  if (results.valid.length > 0) {
    console.log('\n✅ Valid Decks (60 cards):');
    console.log('-'.repeat(80));
    for (const valid of results.valid) {
      console.log(`  ${valid.file}`);
      console.log(`    ${valid.name}`);
    }
  }

  if (results.invalid.length > 0) {
    console.log('\n⚠️  Invalid Decks:');
    console.log('-'.repeat(80));
    
    // Sort by difference (closest to 60 first)
    results.invalid.sort((a, b) => Math.abs(a.difference) - Math.abs(b.difference));
    
    for (const invalid of results.invalid) {
      const status = invalid.total < 60 ? 'TOO FEW' : 'TOO MANY';
      console.log(`  ${invalid.file}`);
      console.log(`    ${invalid.name}`);
      console.log(`    Total: ${invalid.total} cards (${status} by ${Math.abs(invalid.difference)} cards)`);
      console.log('');
    }

    // Summary by difference ranges
    console.log('\n📊 Summary by Difference:');
    console.log('-'.repeat(80));
    const ranges = {
      'Missing 1-5 cards': results.invalid.filter(d => d.difference > 0 && d.difference <= 5).length,
      'Missing 6-10 cards': results.invalid.filter(d => d.difference > 5 && d.difference <= 10).length,
      'Missing 11+ cards': results.invalid.filter(d => d.difference > 10).length,
      'Too many 1-5 cards': results.invalid.filter(d => d.difference < 0 && d.difference >= -5).length,
      'Too many 6+ cards': results.invalid.filter(d => d.difference < -5).length,
    };
    
    for (const [range, count] of Object.entries(ranges)) {
      if (count > 0) {
        console.log(`  ${range}: ${count} deck(s)`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Total decks validated: ${deckFiles.length}`);
  console.log(`Valid: ${results.valid.length} (${((results.valid.length / deckFiles.length) * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${results.invalid.length} (${((results.invalid.length / deckFiles.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));
}

main();
