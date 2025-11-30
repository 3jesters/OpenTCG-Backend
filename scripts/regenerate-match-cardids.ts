import * as fs from 'fs';
import * as path from 'path';

interface CardIdMapping {
  old: string;
  new: string;
}

/**
 * Get cardId mappings from deck files
 */
function getCardIdMappings(): Map<string, string> {
  const mappings = new Map<string, string>();
  const decksDir = path.join(__dirname, '../data/decks');
  const deckFiles = fs
    .readdirSync(decksDir)
    .filter((f) => f.endsWith('.json') && f !== 'README.md');

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck = JSON.parse(deckContent);

    // We'll need to check the git diff or previous version to get old->new mappings
    // For now, let's use the regenerate script logic to find correct cardIds
  }

  return mappings;
}

/**
 * Create cardId mappings based on known corrections
 */
function createCardIdMappings(): Map<string, string> {
  const mappings = new Map<string, string>();

  // These are the known corrections from the deck regeneration
  const corrections: CardIdMapping[] = [
    // Bill: 91 -> 92
    { old: 'pokemon-base-set-v1.0-bill--91', new: 'pokemon-base-set-v1.0-bill--92' },
    // Gust of Wind: 93 -> 94
    { old: 'pokemon-base-set-v1.0-gust-of-wind--93', new: 'pokemon-base-set-v1.0-gust-of-wind--94' },
    // Vulpix: 67 -> 70
    { old: 'pokemon-base-set-v1.0-vulpix--67', new: 'pokemon-base-set-v1.0-vulpix--70' },
    // Charmander: 46 -> 48
    { old: 'pokemon-base-set-v1.0-charmander--46', new: 'pokemon-base-set-v1.0-charmander--48' },
    // Charmeleon: 24 -> (need to check)
    // Charizard: 4 -> (need to check)
    // Ponyta: 60 -> 62
    { old: 'pokemon-base-set-v1.0-ponyta--60', new: 'pokemon-base-set-v1.0-ponyta--62' },
    // Magmar: 36 -> (need to check)
    // Growlithe: 28 -> (need to check)
    // Energy Removal: 92 -> 93
    { old: 'pokemon-base-set-v1.0-energy-removal--92', new: 'pokemon-base-set-v1.0-energy-removal--93' },
    // Potion: 94 -> 90
    { old: 'pokemon-base-set-v1.0-potion--94', new: 'pokemon-base-set-v1.0-potion--90' },
    // Switch: 95 -> 96
    { old: 'pokemon-base-set-v1.0-switch--95', new: 'pokemon-base-set-v1.0-switch--96' },
    // Energy Retrieval: 81 -> 83
    { old: 'pokemon-base-set-v1.0-energy-retrieval--81', new: 'pokemon-base-set-v1.0-energy-retrieval--83' },
    // Bulbasaur: 44 -> 46
    { old: 'pokemon-base-set-v1.0-bulbasaur--44', new: 'pokemon-base-set-v1.0-bulbasaur--46' },
    // Tangela: 66 -> 68
    { old: 'pokemon-base-set-v1.0-tangela--66', new: 'pokemon-base-set-v1.0-tangela--68' },
    // Poliwag: 59 -> 39
    { old: 'pokemon-base-set-v1.0-poliwag--59', new: 'pokemon-base-set-v1.0-poliwag--39' },
    // Magikarp: 55 -> 35
    { old: 'pokemon-base-set-v1.0-magikarp--55', new: 'pokemon-base-set-v1.0-magikarp--35' },
  ];

  for (const correction of corrections) {
    mappings.set(correction.old, correction.new);
  }

  return mappings;
}

/**
 * Recursively replace cardIds in an object
 */
function replaceCardIdsInObject(obj: any, mappings: Map<string, string>): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceCardIdsInObject(item, mappings));
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && mappings.has(value)) {
        result[key] = mappings.get(value);
      } else {
        result[key] = replaceCardIdsInObject(value, mappings);
      }
    }
    return result;
  } else if (typeof obj === 'string' && mappings.has(obj)) {
    return mappings.get(obj);
  }
  return obj;
}

/**
 * Main function to update match files
 */
function main() {
  const matchesDir = path.join(__dirname, '../data/matches');
  const matchFiles = fs
    .readdirSync(matchesDir)
    .filter((f) => f.endsWith('.json') && f !== 'README.md');

  const mappings = createCardIdMappings();

  console.log(`Found ${mappings.size} cardId mappings to apply`);
  console.log('Mappings:');
  for (const [old, newId] of mappings.entries()) {
    console.log(`  ${old} -> ${newId}`);
  }

  console.log(`\nProcessing ${matchFiles.length} match files...`);

  for (const matchFile of matchFiles) {
    const matchPath = path.join(matchesDir, matchFile);
    const matchContent = fs.readFileSync(matchPath, 'utf-8');
    const match = JSON.parse(matchContent);

    console.log(`\nProcessing match: ${match.id}`);

    // Replace cardIds throughout the match object
    const updatedMatch = replaceCardIdsInObject(match, mappings);

    // Check if anything changed
    const originalStr = JSON.stringify(match);
    const updatedStr = JSON.stringify(updatedMatch);

    if (originalStr !== updatedStr) {
      // Write back to file
      fs.writeFileSync(matchPath, JSON.stringify(updatedMatch, null, 2) + '\n');
      console.log(`  ✓ Updated match file: ${matchFile}`);
    } else {
      console.log(`  - No changes needed`);
    }
  }

  console.log('\n✓ Done!');
}

// Run the script
main();

