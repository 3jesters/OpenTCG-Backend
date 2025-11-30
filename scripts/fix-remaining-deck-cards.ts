import * as fs from 'fs';
import * as path from 'path';

interface DeckFile {
  id: string;
  name: string;
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;
  [key: string]: any;
}

/**
 * Fix remaining cardId issues in deck files
 */
function main() {
  const decksDir = path.join(__dirname, '../data/decks');
  const deckFiles = fs
    .readdirSync(decksDir)
    .filter((f) => f.endsWith('.json') && f !== 'README.md');

  console.log(`Processing ${deckFiles.length} deck files...\n`);

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    console.log(`Processing deck: ${deck.name} (${deck.id})`);

    let updated = false;
    const updatedCards = deck.cards.map((card) => {
      // Fix Pokémon Breeder - the cardId has "pok-mon" but should be "pokémon-breeder"
      // The actual card is "Pokémon Breeder" at card number 78
      if (card.cardId === 'pokemon-base-set-v1.0-pok-mon-breeder--78') {
        console.log(
          `  Fixing: ${card.cardId} -> pokemon-base-set-v1.0-pokémon-breeder--78`,
        );
        updated = true;
        return {
          ...card,
          cardId: 'pokemon-base-set-v1.0-pokémon-breeder--78',
        };
      }

      // Fix Water Energy - it doesn't exist in base-set
      // The last energy card is Psychic Energy at #102
      // We should replace it with a basic energy that exists, or remove it
      // For now, let's replace with Psychic Energy as a placeholder
      if (card.cardId === 'pokemon-base-set-v1.0-water-energy--103') {
        console.log(
          `  WARNING: Water Energy doesn't exist in base-set. Replacing with Psychic Energy (#102)`,
        );
        console.log(
          `  Fixing: ${card.cardId} -> pokemon-base-set-v1.0-psychic-energy--102`,
        );
        updated = true;
        return {
          ...card,
          cardId: 'pokemon-base-set-v1.0-psychic-energy--102',
        };
      }

      return card;
    });

    if (updated) {
      deck.cards = updatedCards;
      deck.updatedAt = new Date().toISOString();

      fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2) + '\n');
      console.log(`  ✓ Updated deck file: ${deckFile}\n`);
    } else {
      console.log(`  - No changes needed\n`);
    }
  }

  console.log('✓ Done!');
}

main();

