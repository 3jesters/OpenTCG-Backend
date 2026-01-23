import * as fs from 'fs/promises';
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

/**
 * Manual level data entry script
 * Use this to add level data when scraping is not possible
 * Format: Map of card name to level number
 */
const manualLevelData: Record<string, number> = {
  // Add level data here in format: "Card Name": level
  // Example:
  // "Pikachu": 12,
  // "Raichu": 40,
};

/**
 * Add levels to card JSON files manually
 */
async function addLevelsManually() {
  const sets = [
    { name: 'base-set', file: 'pokemon-base-set-v1.0.json' },
    { name: 'jungle', file: 'pokemon-jungle-v1.0.json' },
    { name: 'fossil', file: 'pokemon-fossil-v1.0.json' },
  ];

  console.log('📝 Adding manual level data to cards...\n');

  for (const set of sets) {
    const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', set.file);
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const jsonData: CardSetFile = JSON.parse(jsonContent);

    let updatedCount = 0;

    for (const card of jsonData.cards) {
      // Only update Pokemon cards
      if (card.cardType && card.cardType !== 'POKEMON') {
        continue;
      }

      // Check if we have manual level data for this card
      const level = manualLevelData[card.name];
      if (level !== undefined) {
        if (card.level !== level) {
          card.level = level;
          updatedCount++;
          console.log(`  ✓ ${set.name}: ${card.name} (${card.cardNumber}) -> level ${level}`);
        }
      }
    }

    // Save the updated JSON
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log(`\n  ✅ ${set.name}: Updated ${updatedCount} cards with level data\n`);
  }

  console.log('✅ Manual level data entry completed!');
}

// Run the script
addLevelsManually()
  .then(() => {
    console.log('\n✅ Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });
