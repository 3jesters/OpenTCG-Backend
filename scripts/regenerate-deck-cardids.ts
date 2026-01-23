import * as fs from 'fs';
import * as path from 'path';

interface CardData {
  name: string;
  cardNumber: string;
  level?: number;
  [key: string]: any;
}

interface CardSetFile {
  metadata: {
    author: string;
    setName: string;
    version: string;
  };
  cards: CardData[];
}

interface DeckCard {
  cardId: string;
  setName: string;
  quantity: number;
}

interface DeckFile {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tournamentId?: string;
  isValid: boolean;
  cards: DeckCard[];
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate cardId using the same logic as the card use cases
 */
function generateCardId(
  author: string,
  setName: string,
  version: string,
  cardName: string,
  level: number | undefined,
  cardNumber: string,
): string {
  const authorKebab = toKebabCase(author);
  const setNameKebab = toKebabCase(setName);
  const cardNameKebab = toKebabCase(cardName);
  const levelStr = level !== undefined ? level.toString() : '';

  // Build card ID with level if present, otherwise use double dash separator
  if (levelStr === '') {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}--${cardNumber}`;
  } else {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${levelStr}-${cardNumber}`;
  }
}

/**
 * Load a card set file
 */
function loadCardSet(filename: string): CardSetFile | null {
  const filePath = path.join(__dirname, '../data/cards', filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as CardSetFile;
  } catch (error) {
    console.error(`Failed to load card set ${filename}:`, error);
    return null;
  }
}

/**
 * Find a card in a set by name and cardNumber
 */
function findCardInSet(
  set: CardSetFile,
  cardName: string,
  cardNumber: string,
): CardData | null {
  return (
    set.cards.find(
      (c) =>
        c.name.toLowerCase() === cardName.toLowerCase() &&
        c.cardNumber === cardNumber,
    ) || null
  );
}

/**
 * Find a card in a set by name only (fuzzy match)
 */
function findCardInSetByName(
  set: CardSetFile,
  cardNameFromId: string,
): CardData | null {
  // Normalize the name from cardId (kebab-case) to match card names
  const normalizedIdName = cardNameFromId
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/pok mon/g, 'pokémon') // Fix "pok-mon" -> "pokémon"
    .trim();
  
  // Try exact match first
  let card = set.cards.find(
    (c) => c.name.toLowerCase() === normalizedIdName,
  );
  
  if (card) return card;
  
  // Try matching with spaces replaced by dashes
  card = set.cards.find(
    (c) => c.name.toLowerCase().replace(/\s+/g, '-') === cardNameFromId.toLowerCase(),
  );
  
  if (card) return card;
  
  // Try matching with special character handling (pok-mon -> pokémon)
  const idNameFixed = cardNameFromId.toLowerCase().replace(/pok-mon/g, 'pokémon');
  card = set.cards.find(
    (c) => {
      const cardNameNorm = c.name.toLowerCase().replace(/\s+/g, '-');
      return cardNameNorm === idNameFixed || cardNameNorm.replace(/-/g, ' ') === idNameFixed.replace(/-/g, ' ');
    },
  );
  
  if (card) return card;
  
  // Try fuzzy match - card name contains the id name or vice versa
  card = set.cards.find(
    (c) => {
      const cardNameNorm = c.name.toLowerCase().replace(/\s+/g, '-');
      const idNameNorm = cardNameFromId.toLowerCase();
      return cardNameNorm.includes(idNameNorm) ||
             idNameNorm.includes(cardNameNorm) ||
             cardNameNorm.replace(/-/g, '') === idNameNorm.replace(/-/g, '');
    },
  );
  
  return card || null;
}

/**
 * Regenerate cardId for a deck card
 */
function regenerateCardId(
  deckCard: DeckCard,
  cardSets: Map<string, CardSetFile>,
): string | null {
  // Try to find the card in the set files
  for (const [filename, set] of cardSets.entries()) {
    // Check if this set matches the deckCard's setName
    // Handle different setName formats (e.g., "Base Set" vs "base-set")
    const setNameMatch =
      set.metadata.setName.toLowerCase().replace(/\s+/g, '-') ===
        deckCard.setName.toLowerCase().replace(/\s+/g, '-') ||
      set.metadata.setName.toLowerCase() === deckCard.setName.toLowerCase();
    
    if (!setNameMatch) {
      continue;
    }

    // Parse the cardId to extract card name
    // Format: author-setName-vversion-cardName--cardNumber (double dash means empty level)
    // Or: author-setName-vversion-cardName-level-cardNumber
    
    // Extract card name from cardId - everything between version and the last number
    // Pattern: -v1.0-cardname--number or -v1.0-cardname-level-number
    let nameMatch = deckCard.cardId.match(/-v\d+\.\d+-(.+?)(?:--|-?\d+)?-?\d+$/);
    
    if (nameMatch) {
      const cardNameFromId = nameMatch[1];
      
      // Try to find the card by name (ignore the incorrect card number)
      const card = findCardInSetByName(set, cardNameFromId);
      
      if (card) {
        // Found it! Generate correct cardId with the actual card number
        return generateCardId(
          set.metadata.author,
          set.metadata.setName,
          set.metadata.version,
          card.name,
          card.level,
          card.cardNumber,
        );
      }
    }

    // Try alternative pattern: -v1.0-cardname-number (no dashes before number, old format)
    const altMatch = deckCard.cardId.match(/-v\d+\.\d+-(.+?)-(\d+)$/);
    if (altMatch) {
      const cardNameFromId = altMatch[1];
      const card = findCardInSetByName(set, cardNameFromId);
      
      if (card) {
        return generateCardId(
          set.metadata.author,
          set.metadata.setName,
          set.metadata.version,
          card.name,
          card.level,
          card.cardNumber,
        );
      }
    }
    
    // Try pattern without double dash: -v1.0-cardname-number (old format like example-deck)
    const oldFormatMatch = deckCard.cardId.match(/-v\d+\.\d+-(.+?)-(\d+)$/);
    if (oldFormatMatch) {
      const cardNameFromId = oldFormatMatch[1];
      const card = findCardInSetByName(set, cardNameFromId);
      
      if (card) {
        return generateCardId(
          set.metadata.author,
          set.metadata.setName,
          set.metadata.version,
          card.name,
          card.level,
          card.cardNumber,
        );
      }
    }
  }

  return null;
}

/**
 * Main function to regenerate all deck cardIds
 */
function main() {
  const decksDir = path.join(__dirname, '../data/decks');
  const cardsDir = path.join(__dirname, '../data/cards');

  // Load all card sets
  const cardSetFiles = fs.readdirSync(cardsDir).filter((f) => f.endsWith('.json'));
  const cardSets = new Map<string, CardSetFile>();

  console.log('Loading card sets...');
  for (const filename of cardSetFiles) {
    const set = loadCardSet(filename);
    if (set) {
      cardSets.set(filename, set);
      console.log(
        `  Loaded ${set.metadata.author}-${set.metadata.setName}-v${set.metadata.version} (${set.cards.length} cards)`,
      );
    }
  }

  // Load all deck files
  const deckFiles = fs
    .readdirSync(decksDir)
    .filter((f) => f.endsWith('.json') && f !== 'README.md');

  console.log(`\nProcessing ${deckFiles.length} deck files...`);

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    console.log(`\nProcessing deck: ${deck.name} (${deck.id})`);

    let updated = false;
    const updatedCards: DeckCard[] = [];

    for (const deckCard of deck.cards) {
      const newCardId = regenerateCardId(deckCard, cardSets);

      if (newCardId && newCardId !== deckCard.cardId) {
        console.log(
          `  Updated: ${deckCard.cardId} -> ${newCardId}`,
        );
        updatedCards.push({
          ...deckCard,
          cardId: newCardId,
        });
        updated = true;
      } else if (newCardId) {
        // CardId is already correct
        updatedCards.push(deckCard);
      } else {
        console.warn(
          `  WARNING: Could not regenerate cardId for: ${deckCard.cardId}`,
        );
        // Special case: Water Energy doesn't exist in base-set, might be a typo
        // Check if it's water-energy and suggest alternative
        if (deckCard.cardId.includes('water-energy')) {
          console.warn(
            `    NOTE: Water Energy doesn't exist in base-set. The deck might need to be updated manually.`,
          );
        }
        // Keep the original cardId if we can't regenerate it
        updatedCards.push(deckCard);
      }
    }

    if (updated) {
      // Update the deck file
      deck.cards = updatedCards;
      deck.updatedAt = new Date().toISOString();

      // Write back to file
      fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2) + '\n');
      console.log(`  ✓ Updated deck file: ${deckFile}`);
    } else {
      console.log(`  - No changes needed`);
    }
  }

  console.log('\n✓ Done!');
}

// Run the script
main();

