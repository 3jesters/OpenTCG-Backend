import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
  tournamentId: string;
  isValid: boolean;
  cardBackImageUrl: string;
  cards: DeckCard[];
}

interface ExtractedCard {
  name: string;
  quantity: number;
  level?: number;
}

interface ExtractionResult {
  deckName: string;
  cards: ExtractedCard[];
  isValid: boolean;
  missingCards: string[];
}

/**
 * Convert string to kebab-case (same logic as PreviewCardUseCase)
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose characters (é becomes e + ́)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .replace(/♂/g, '') // Remove male symbol
    .replace(/♀/g, '') // Remove female symbol
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate cardId using the same logic as the card use cases
 * Format: {author}-{setName}-v{version}-{cardName}-{level}-{cardNumber}
 * If level is undefined, uses -- separator
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

  // If level is empty, use double dash separator
  if (levelStr === '') {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}--${cardNumber}`;
  }
  
  return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${levelStr}-${cardNumber}`;
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
 * Normalize card name for matching (handles special characters, case, etc.)
 */
function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♂/g, '')
    .replace(/♀/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse level from card name (e.g., "Arcanine lv. 45" -> 45)
 */
function parseLevel(cardName: string): { name: string; level?: number } {
  const levelMatch = cardName.match(/lv\.?\s*(\d+)/i);
  if (levelMatch) {
    const level = parseInt(levelMatch[1], 10);
    const nameWithoutLevel = cardName.replace(/\s*lv\.?\s*\d+/i, '').trim();
    return { name: nameWithoutLevel, level };
  }
  return { name: cardName };
}

/**
 * Map common card name variations to actual card names
 */
function mapCardNameVariation(name: string): string[] {
  const variations: string[] = [name];
  
  // Common variations
  const nameMap: Record<string, string[]> = {
    'professor oak': ['Impostor Professor Oak'], // Professor Oak doesn't exist, might be Impostor
    'imposter professor oak': ['Impostor Professor Oak'],
    'super energy retrieval': ['Super Energy Removal'], // Common confusion
    'breeder': ['Pokémon Breeder'],
    'pokemon breeder': ['Pokémon Breeder'],
    'center': ['Pokémon Center'],
    'pokemon center': ['Pokémon Center'],
    'golduck': [], // Golduck might not exist in base/jungle/fossil
    'flying pikachu': [], // Promo cards not in these sets
    'surfing pikachu': [], // Promo cards not in these sets
    'mew': [], // Mew might not be in these sets
    'revive': [], // Revive might not exist
    'xeggcute': ['Exeggcute'],
    'xeggutor': ['Exeggutor'],
  };
  
  const lowerName = name.toLowerCase();
  if (nameMap[lowerName]) {
    return nameMap[lowerName];
  }
  
  return variations;
}

/**
 * Find a card in all sets by name (and optionally level)
 */
function findCard(
  cardSets: CardSetFile[],
  cardName: string,
  level?: number,
): { card: CardData; set: CardSetFile } | null {
  const { name: cleanName, level: parsedLevel } = parseLevel(cardName);
  const searchLevel = level ?? parsedLevel;
  const normalizedName = normalizeCardName(cleanName);
  
  // Try name variations
  const nameVariations = mapCardNameVariation(cleanName);
  const allNamesToTry = [cleanName, ...nameVariations];

  // Try to find in all sets
  for (const setNameToTry of allNamesToTry) {
    const normalizedTry = normalizeCardName(setNameToTry);
    
    for (const set of cardSets) {
      for (const card of set.cards) {
        const cardNameNorm = normalizeCardName(card.name);
        
        // Match by normalized name
        if (cardNameNorm === normalizedTry || cardNameNorm === normalizedName) {
          // If level is specified, match by level as well
          if (searchLevel !== undefined) {
            // Only match if card has the same level
            if (card.level === searchLevel) {
              return { card, set };
            }
            // If card doesn't have level but we're searching for one, skip it
            // This allows distinguishing "Pikachu lv. 12" from "Pikachu lv. 14"
            continue;
          }
          // If no level specified, match any card with that name (backward compatible)
          return { card, set };
        }
      }
    }
  }

  return null;
}

/**
 * Extract deck information from HTML content
 */
function extractDeckFromHtml(html: string, url: string): ExtractionResult | null {
  const $ = cheerio.load(html);
  
  // Extract deck name from heading
  const heading = $('h1, h2, h3').first().text().trim();
  if (!heading) {
    console.error(`Could not find deck heading in ${url}`);
    return null;
  }

  // Get all text content - cards might be in a single line or multiple lines
  // Try multiple selectors to find the card list
  const bodyText = $('body').text();
  let mainContent = $('article, .post, .content, main, [class*="post"]').text() || bodyText;
  
  // Also try extracting from HTML lists (ul, ol, li) - these often contain card lists
  const listItems = $('ul li, ol li').map((_, el) => $(el).text().trim()).get().join('\n');
  if (listItems.length > 100) {
    mainContent = listItems + '\n' + mainContent;
  }
  
  // Also try extracting from table cells (td) - some decks might be in tables
  const tableCells = $('td').map((_, el) => $(el).text().trim()).get().join('\n');
  if (tableCells.length > 100 && tableCells.length > listItems.length) {
    mainContent = tableCells + '\n' + mainContent;
  }
  
  // If we didn't get much content, try getting text from all paragraphs and divs
  if (mainContent.length < 500) {
    mainContent = $('p, div').text() || bodyText;
  }
  
  const cards: ExtractedCard[] = [];
  const seenCards = new Map<string, { name: string; level?: number; quantity: number }>();
  
  // Multiple patterns to handle different card formats:
  // 1. "Card Name x3" or "Card Name x 3" (space before x optional)
  // 2. "Card Namex3" (no space before x)
  // 3. "3x Card Name" (number first)
  // 4. "Card Name 3" (no x, just number at end)
  // 5. "Card Name (3)" (number in parentheses)
  const patterns = [
    // Pattern 1: "Card Name x3" or "Card Name x 3" (with space before x)
    /([A-Z][A-Za-z\s♀♂\.\-\'éÉ]+(?:\s+lv\.?\s*\d+)?)\s+x\s*(\d+)/g,
    // Pattern 2: "Card Namex3" (no space before x)
    /([A-Z][A-Za-z\s♀♂\.\-\'éÉ]+(?:\s+lv\.?\s*\d+)?)x(\d+)/g,
    // Pattern 3: "3x Card Name" (number first)
    /(\d+)\s*x\s+([A-Z][A-Za-z\s♀♂\.\-\'éÉ]+(?:\s+lv\.?\s*\d+)?)/g,
    // Pattern 4: "Card Name 3" (number at end, no x) - be careful with this one
    /([A-Z][A-Za-z\s♀♂\.\-\'éÉ]+(?:\s+lv\.?\s*\d+)?)\s+(\d{1,2})(?:\s|$|[^\d])/g,
    // Pattern 5: "Card Name (3)" (number in parentheses)
    /([A-Z][A-Za-z\s♀♂\.\-\'éÉ]+(?:\s+lv\.?\s*\d+)?)\s*\((\d+)\)/g,
  ];
  
  // Helper function to process a match
  const processMatch = (cardName: string, quantity: number, isReversed: boolean = false) => {
    const finalCardName = isReversed ? cardName : cardName;
    const finalQuantity = quantity;
    
    // Skip if it's just "x" or too short
    if (finalCardName.length < 2 || finalCardName.toLowerCase().trim() === 'x' || finalCardName.trim().length < 2) {
      return;
    }
    
    // Skip common false positives from notes/suggestions
    const falsePositives = /^(Note|Remove|Take|The|You|What|Rather|This|A Fire|A Water|A Grass|A deck|Adding|Don|Leave|Your|They|Colorless|Pokemon|monster|cards|alongside|type|mean|cost|manageable|suggested|more|each|Youre|welcome|pick|focus|general|suggestion|allow|variety|attack|choice|fear|shortage|count|low|add|like|most|feel|work|best|with|deck|If you|perhap|maybe|replace|Definitely|consider|case|Every|Again|There|Because|Adjust|Club)/i;
    if (finalCardName.match(falsePositives)) {
      return;
    }
    
    // Skip if it ends with common sentence endings that got captured
    if (finalCardName.match(/\s+(is|are|can|will|should|would|could|might|may)\s*$/i)) {
      return;
    }
    
    // Skip if quantity is unreasonable (likely false positive)
    if (finalQuantity < 1 || finalQuantity > 60) {
      return;
    }
    
    const { name, level } = parseLevel(finalCardName);
    
    // Normalize name for deduplication
    const normalizedName = normalizeCardName(name);
    
    // Use composite key for leveled cards
    const compositeKey = `${normalizedName}|${level ?? 'none'}`;
    
    // If we've seen this card before, take the maximum quantity (to handle HTML duplicates)
    const existing = seenCards.get(compositeKey);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, finalQuantity);
    } else {
      seenCards.set(compositeKey, { name, level, quantity: finalQuantity });
    }
  };
  
  // Try each pattern
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    let match;
    
    while ((match = pattern.exec(mainContent)) !== null) {
      if (i === 1) {
        // Pattern 2: "3x Card Name" - reversed order
        const quantity = parseInt(match[1], 10);
        const cardName = match[2].trim();
        processMatch(cardName, quantity, false);
      } else {
        // Patterns 1, 3, 4: "Card Name x3" or "Card Name 3"
        const cardName = match[1].trim();
        const quantity = parseInt(match[2], 10);
        processMatch(cardName, quantity, false);
      }
    }
  }
  
  // Convert map to array
  for (const cardData of seenCards.values()) {
    cards.push(cardData);
  }

  // If we still didn't find cards, try a more permissive approach on the full body text
  if (cards.length === 0) {
    // Try matching on the full body text with a simpler pattern
    const simplePattern = /([A-Z][A-Za-z\s♀♂\.\-\'éÉ]+?)\s+x\s*(\d+)/g;
    let simpleMatch;
    while ((simpleMatch = simplePattern.exec(bodyText)) !== null) {
      const cardName = simpleMatch[1].trim();
      const quantity = parseInt(simpleMatch[2], 10);
      
      if (cardName.length >= 2 && quantity > 0 && quantity <= 60) {
        const { name, level } = parseLevel(cardName);
        const normalizedName = normalizeCardName(name);
        const compositeKey = `${normalizedName}|${level ?? 'none'}`;
        const existing = seenCards.get(compositeKey);
        if (existing) {
          existing.quantity = Math.max(existing.quantity, quantity);
        } else {
          seenCards.set(compositeKey, { name, level, quantity });
        }
      }
    }
    
    // Rebuild cards array
    cards.length = 0;
    for (const cardData of seenCards.values()) {
      cards.push(cardData);
    }
  }

  if (cards.length === 0) {
    console.error(`Could not extract card list from ${url}`);
    return null;
  }

  return {
    deckName: heading,
    cards,
    isValid: true,
    missingCards: [],
  };
}

/**
 * Fetch and extract deck from URL
 */
async function fetchDeckFromUrl(url: string): Promise<ExtractionResult | null> {
  try {
    console.log(`Fetching ${url}...`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });
    
    return extractDeckFromHtml(response.data, url);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Match extracted cards to card data and generate deck
 */
function createDeckFile(
  extraction: ExtractionResult,
  cardSets: CardSetFile[],
): DeckFile | null {
  const deckId = toKebabCase(extraction.deckName);
  const now = new Date().toISOString();
  
  const deckCards: DeckCard[] = [];
  const missingCards: string[] = [];
  const cardCounts = new Map<string, number>(); // cardId -> total quantity

  // Process each extracted card
  for (const extractedCard of extraction.cards) {
    const found = findCard(cardSets, extractedCard.name, extractedCard.level);
    
    if (!found) {
      missingCards.push(extractedCard.name);
      console.warn(`  ⚠️  Could not find card: ${extractedCard.name}`);
      continue;
    }

    const { card, set } = found;
    const cardId = generateCardId(
      set.metadata.author,
      set.metadata.setName,
      set.metadata.version,
      card.name,
      card.level, // Use level from card data (usually undefined)
      card.cardNumber,
    );

    // Sum quantities for duplicate cardIds
    const currentQuantity = cardCounts.get(cardId) || 0;
    cardCounts.set(cardId, currentQuantity + extractedCard.quantity);
  }

  // Convert map to deck cards array
  for (const [cardId, quantity] of cardCounts.entries()) {
    // Extract setName from cardId (format: pokemon-{setName}-v1.0-...)
    const match = cardId.match(/^pokemon-(.+?)-v\d+\.\d+-/);
    const setName = match ? match[1] : 'base-set';
    
    deckCards.push({
      cardId,
      setName,
      quantity,
    });
  }

  // Calculate total cards
  const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
  const isValid = missingCards.length === 0 && totalCards === 60;

  return {
    id: deckId,
    name: extraction.deckName,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
    tournamentId: 'classic-tournament',
    isValid,
    cardBackImageUrl: 'https://www.pikawiz.com/images/pokemonback.png',
    cards: deckCards.sort((a, b) => a.cardId.localeCompare(b.cardId)),
  };
}

/**
 * Save deck to file
 */
function saveDeckFile(deck: DeckFile): void {
  const deckPath = path.join(__dirname, '../data/decks', `${deck.id}.json`);
  const content = JSON.stringify(deck, null, 2) + '\n';
  fs.writeFileSync(deckPath, content, 'utf-8');
  console.log(`  ✓ Created: ${deck.id}.json (${deck.cards.length} unique cards, ${deck.cards.reduce((sum, c) => sum + c.quantity, 0)} total)`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting deck extraction from URLs...\n');

  // Load card sets
  console.log('📚 Loading card sets...');
  const baseSet = loadCardSet('pokemon-base-set-v1.0.json');
  const jungleSet = loadCardSet('pokemon-jungle-v1.0.json');
  const fossilSet = loadCardSet('pokemon-fossil-v1.0.json');

  if (!baseSet || !jungleSet || !fossilSet) {
    console.error('Failed to load card sets');
    process.exit(1);
  }

  const cardSets = [baseSet, jungleSet, fossilSet];
  console.log(`  ✓ Loaded ${cardSets.length} card sets\n`);

  // Deck URLs
  const urls = [
    'http://pkmntcg4gbc.tumblr.com/post/99017380305/first-auto-deck-machine-charmander-friends-deck',
    'http://pkmntcg4gbc.tumblr.com/post/99167909592/first-auto-deck-machine-squirtle-friends-deck',
    'http://pkmntcg4gbc.tumblr.com/post/99259990469/first-auto-deck-machine-bulbasaur-friends-deck',
    'http://pkmntcg4gbc.tumblr.com/post/99368120044/first-auto-deck-machine-psychic-machamp-deck',
    'http://pkmntcg4gbc.tumblr.com/post/99451474376/first-auto-deck-machine-water-beetle-deck',
    'http://pkmntcg4gbc.tumblr.com/post/99869586666/grass-auto-deck-machine-insect-collection-deck',
    'http://pkmntcg4gbc.tumblr.com/post/99959162541/grass-auto-deck-machine-jungle-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100189648915/grass-auto-deck-machine-flower-garden-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100285778742/grass-auto-deck-machine-kaleidoscope-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100370572883/grass-auto-deck-machine-flower-power-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100464420036/fire-auto-deck-machine-replace-em-all',
    'http://pkmntcg4gbc.tumblr.com/post/100550475267/fire-auto-deck-machine-chari-saur-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100633486106/fire-auto-deck-machine-traffic-light-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100715385527/fire-auto-deck-machine-fire-pokemon-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100796212958/fire-auto-deck-machine-fire-charge-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100874708954/water-auto-deck-machine-blue-water-deck',
    'http://pkmntcg4gbc.tumblr.com/post/100957602226/water-auto-deck-machine-on-the-beach',
    'http://pkmntcg4gbc.tumblr.com/post/101050468881/water-auto-deck-machine-paralyze-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101137987094/water-auto-deck-machine-energy-removal-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101222492222/water-auto-deck-machine-rain-dance-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101506510108/lightning-auto-deck-machine-cute-pokemon-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101603546532/lightning-auto-deck-machine-pokemon-flute-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101689945141/lightning-auto-deck-machine-yellow-flash-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101775509472/lightning-auto-deck-machine-electric-shock-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101859498188/lightning-auto-deck-machine-zapping-selfdestruct-deck',
    'http://pkmntcg4gbc.tumblr.com/post/101942301870/science-auto-deck-machine-lovely-nidoran-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102025124676/science-auto-deck-machine-science-corps-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102111161549/science-auto-deck-machine-flyin-pokemon-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102202509372/science-auto-deck-machine-poison-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102499599539/science-auto-deck-machine-wonders-of-science',
    'http://pkmntcg4gbc.tumblr.com/post/102291739967/psychic-auto-deck-machine-psychic-power-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102379635588/psychic-auto-deck-machine-dream-eater-haunter',
    'http://pkmntcg4gbc.tumblr.com/post/102463954172/psychic-auto-deck-machine-scavenging-slowbro-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102544793542/psychic-auto-deck-machine-strange-power-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102625993752/psychic-auto-deck-machine-strange-psyshock-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102710636770/fighting-auto-deck-machine-all-fighting-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102801094862/fighting-auto-deck-machine-bench-attack-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102889946636/fighting-auto-deck-machine-battle-contest-deck',
    'http://pkmntcg4gbc.tumblr.com/post/102973975574/fighting-auto-deck-machine-heated-battle-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103056335494/fighting-auto-deck-machine-first-strike-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103137341775/rock-auto-deck-machine-squeaking-mouse-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103217326362/rock-auto-deck-machine-great-quake-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103299508681/rock-auto-deck-machine-bone-attack-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103389003090/rock-auto-deck-machine-excavation-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103477722049/rock-auto-deck-machine-rock-crusher-deck',
    'http://pkmntcg4gbc.tumblr.com/post/103569557917/legendary-auto-deck-machine-legendary-moltres',
    'http://pkmntcg4gbc.tumblr.com/post/103654861664/legendary-auto-deck-machine-legendary-zapdos',
    'http://pkmntcg4gbc.tumblr.com/post/103740353403/legendary-auto-deck-machine-legendary-articuno',
    'http://pkmntcg4gbc.tumblr.com/post/103821364125/legendary-auto-deck-machine-legendary-dragonite',
    'http://pkmntcg4gbc.tumblr.com/post/103907972705/legendary-auto-deck-machine-mysterious-pokemon',
  ];

  console.log(`📋 Processing ${urls.length} deck URLs...\n`);

  const results = {
    success: 0,
    failed: 0,
    invalid: 0,
    missingCards: new Set<string>(),
  };

  // Process each URL
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Processing: ${url}`);

    const extraction = await fetchDeckFromUrl(url);
    if (!extraction) {
      console.log(`  ✗ Failed to extract deck\n`);
      results.failed++;
      continue;
    }

    const deck = createDeckFile(extraction, cardSets);
    if (!deck) {
      console.log(`  ✗ Failed to create deck file\n`);
      results.failed++;
      continue;
    }

    // Track missing cards
    extraction.missingCards.forEach(card => results.missingCards.add(card));

    if (!deck.isValid) {
      results.invalid++;
    } else {
      results.success++;
    }

    saveDeckFile(deck);
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Extraction Summary');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${results.success}`);
  console.log(`⚠️  Created with issues: ${results.invalid}`);
  console.log(`✗ Failed: ${results.failed}`);
  console.log(`\nMissing cards (${results.missingCards.size}):`);
  if (results.missingCards.size > 0) {
    Array.from(results.missingCards).sort().forEach(card => {
      console.log(`  - ${card}`);
    });
  }
  console.log('\n✅ Done!');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
