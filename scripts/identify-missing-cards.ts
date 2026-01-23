import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
  isValid: boolean;
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;
  [key: string]: any;
}

interface ExtractedCard {
  name: string;
  quantity: number;
  level?: number;
}

// Deck URLs mapping
const deckUrls: Record<string, string> = {
  'fire-auto-deck-machine-fire-charge-deck': 'http://pkmntcg4gbc.tumblr.com/post/100796212958/fire-auto-deck-machine-fire-charge-deck',
  'first-auto-deck-machine-psychic-machamp-deck': 'http://pkmntcg4gbc.tumblr.com/post/99368120044/first-auto-deck-machine-psychic-machamp-deck',
  'grass-auto-deck-machine-jungle-deck': 'http://pkmntcg4gbc.tumblr.com/post/99959162541/grass-auto-deck-machine-jungle-deck',
  'science-auto-deck-machine-science-corps-deck': 'http://pkmntcg4gbc.tumblr.com/post/102025124676/science-auto-deck-machine-science-corps-deck',
  'water-auto-deck-machine-blue-water-deck': 'http://pkmntcg4gbc.tumblr.com/post/100874708954/water-auto-deck-machine-blue-water-deck',
  'fire-auto-deck-machine-traffic-light-deck': 'http://pkmntcg4gbc.tumblr.com/post/100633486106/fire-auto-deck-machine-traffic-light-deck',
  'fire-auto-deck-machine-fire-pokemon-deck': 'http://pkmntcg4gbc.tumblr.com/post/100715385527/fire-auto-deck-machine-fire-pokemon-deck',
  'psychic-auto-deck-machine-psychic-power-deck': 'http://pkmntcg4gbc.tumblr.com/post/102291739967/psychic-auto-deck-machine-psychic-power-deck',
  'psychic-auto-deck-machine-strange-power-deck': 'http://pkmntcg4gbc.tumblr.com/post/102544793542/psychic-auto-deck-machine-strange-power-deck',
  'psychic-auto-deck-machine-scavenging-slowbro-deck': 'http://pkmntcg4gbc.tumblr.com/post/102463954172/psychic-auto-deck-machine-scavenging-slowbro-deck',
  'science-auto-deck-machine-flyin-pokemon-deck': 'http://pkmntcg4gbc.tumblr.com/post/102111161549/science-auto-deck-machine-flyin-pokemon-deck',
  'fighting-auto-deck-machine-heated-battle-deck': 'http://pkmntcg4gbc.tumblr.com/post/102973975574/fighting-auto-deck-machine-heated-battle-deck',
  'lightning-auto-deck-machine-cute-pokemon-deck': 'http://pkmntcg4gbc.tumblr.com/post/101506510108/lightning-auto-deck-machine-cute-pokemon-deck',
  'rock-auto-deck-machine-excavation-deck': 'http://pkmntcg4gbc.tumblr.com/post/103389003090/rock-auto-deck-machine-excavation-deck',
  'first-auto-deck-machine-charmander-friends-deck': 'http://pkmntcg4gbc.tumblr.com/post/99017380305/first-auto-deck-machine-charmander-friends-deck',
  'first-auto-deck-machine-squirtle-friends-deck': 'http://pkmntcg4gbc.tumblr.com/post/99167909592/first-auto-deck-machine-squirtle-friends-deck',
  'grass-auto-deck-machine-kaleidoscope-deck': 'http://pkmntcg4gbc.tumblr.com/post/100285778742/grass-auto-deck-machine-kaleidoscope-deck',
  'first-auto-deck-machine-bulbasaur-friends-deck': 'http://pkmntcg4gbc.tumblr.com/post/99259990469/first-auto-deck-machine-bulbasaur-friends-deck',
  'fighting-auto-deck-machine-bench-attack-deck': 'http://pkmntcg4gbc.tumblr.com/post/102801094862/fighting-auto-deck-machine-bench-attack-deck',
  'first-auto-deck-machine-water-beetle-deck': 'http://pkmntcg4gbc.tumblr.com/post/99451474376/first-auto-deck-machine-water-beetle-deck',
  'water-auto-deck-machine-energy-removal-deck': 'http://pkmntcg4gbc.tumblr.com/post/101137987094/water-auto-deck-machine-energy-removal-deck',
  'fighting-auto-deck-machine-battle-contest-deck': 'http://pkmntcg4gbc.tumblr.com/post/102889946636/fighting-auto-deck-machine-battle-contest-deck',
  'lightning-auto-deck-machine-zapping-selfdestruct-deck': 'http://pkmntcg4gbc.tumblr.com/post/101859498188/lightning-auto-deck-machine-zapping-selfdestruct-deck',
  'rock-auto-deck-machine-rock-crusher-deck': 'http://pkmntcg4gbc.tumblr.com/post/103477722049/rock-auto-deck-machine-rock-crusher-deck',
  'science-auto-deck-machine-lovely-nidoran-deck': 'http://pkmntcg4gbc.tumblr.com/post/101942301870/science-auto-deck-machine-lovely-nidoran-deck',
  'science-auto-deck-machine-poison-deck': 'http://pkmntcg4gbc.tumblr.com/post/102202509372/science-auto-deck-machine-poison-deck',
  'fighting-auto-deck-machine-first-strike-deck': 'http://pkmntcg4gbc.tumblr.com/post/103056335494/fighting-auto-deck-machine-first-strike-deck',
  'lightning-auto-deck-machine-electric-shock-deck': 'http://pkmntcg4gbc.tumblr.com/post/101775509472/lightning-auto-deck-machine-electric-shock-deck',
  'rock-auto-deck-machine-great-quake-deck': 'http://pkmntcg4gbc.tumblr.com/post/103217326362/rock-auto-deck-machine-great-quake-deck',
  'lightning-auto-deck-machine-yellow-flash-deck': 'http://pkmntcg4gbc.tumblr.com/post/101689945141/lightning-auto-deck-machine-yellow-flash-deck',
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♂/g, '')
    .replace(/♀/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateCardId(
  author: string,
  setName: string,
  version: string,
  cardName: string,
  cardNumber: string,
  level?: number,
): string {
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

function findCard(
  cardName: string,
  level: number | undefined,
  cardSets: CardSetFile[],
): { card: any; set: CardSetFile } | null {
  const normalizedName = normalizeName(cardName);

  for (const set of cardSets) {
    for (const card of set.cards) {
      const cardNameNorm = normalizeName(card.name);

      if (cardNameNorm === normalizedName) {
        if (level !== undefined) {
          if (card.level === level) {
            return { card, set };
          }
          continue;
        }
        return { card, set };
      }
    }
  }

  return null;
}

/**
 * Extract deck cards from HTML (simplified version from extract-decks-from-urls.ts)
 */
function extractDeckFromHtml(html: string): ExtractedCard[] {
  const $ = cheerio.load(html);
  const cards: ExtractedCard[] = [];
  const seenCards = new Map<string, number>();

  // Multiple patterns to catch different formats
  const patterns = [
    // Pattern 1: "Card Name xN" or "Card Name lv. X xN"
    /([A-Za-z0-9\s'\-\.]+?)\s+(?:lv\.?\s*(\d+)\s+)?x\s*(\d+)/gi,
    // Pattern 2: "Nx Card Name" or "Nx Card Name lv. X"
    /(\d+)\s*x\s*([A-Za-z0-9\s'\-\.]+?)(?:\s+lv\.?\s*(\d+))?/gi,
    // Pattern 3: "Card Name (N)" or "Card Name lv. X (N)"
    /([A-Za-z0-9\s'\-\.]+?)(?:\s+lv\.?\s*(\d+))?\s*\((\d+)\)/gi,
  ];

  // Try to find card lists in common HTML structures
  const selectors = [
    'p', 'li', 'div', 'span', 'td',
  ];

  for (const selector of selectors) {
    $(selector).each((_, elem) => {
      const text = $(elem).text();
      if (!text || text.length < 3) return;

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          let cardName: string;
          let quantity: number;
          let level: number | undefined;

          if (pattern.source.includes('x\\s*(\\d+)')) {
            // Pattern 1: "Card Name xN" or "Card Name lv. X xN"
            cardName = match[1].trim();
            level = match[2] ? parseInt(match[2], 10) : undefined;
            quantity = parseInt(match[3], 10);
          } else if (pattern.source.includes('(\\d+)\\s*x')) {
            // Pattern 2: "Nx Card Name"
            quantity = parseInt(match[1], 10);
            cardName = match[2].trim();
            level = match[3] ? parseInt(match[3], 10) : undefined;
          } else {
            // Pattern 3: "Card Name (N)"
            cardName = match[1].trim();
            level = match[2] ? parseInt(match[2], 10) : undefined;
            quantity = parseInt(match[3], 10);
          }

          // Filter out false positives
          if (
            cardName.length < 2 ||
            quantity < 1 ||
            quantity > 60 ||
            cardName.toLowerCase() === 'x' ||
            cardName.match(/^\d+$/)
          ) {
            continue;
          }

          // Normalize card name
          const normalizedName = normalizeName(cardName);
          const compositeKey = `${normalizedName}|${level ?? 'none'}`;

          // Use Math.max to handle duplicates (take the highest quantity)
          const existing = seenCards.get(compositeKey) || 0;
          seenCards.set(compositeKey, Math.max(existing, quantity));
        }
      }
    });
  }

  // Convert map to array
  for (const [key, quantity] of seenCards.entries()) {
    const [name, levelStr] = key.split('|');
    const level = levelStr === 'none' ? undefined : parseInt(levelStr, 10);
    cards.push({ name, quantity, level });
  }

  return cards;
}

async function fetchDeckFromUrl(url: string): Promise<ExtractedCard[] | null> {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    return extractDeckFromHtml(response.data);
  } catch (error: any) {
    console.error(`  ❌ Error fetching ${url}: ${error.message}`);
    return null;
  }
}

async function analyzeDeck(
  deckId: string,
  deckName: string,
  deck: DeckFile,
  cardSets: CardSetFile[],
  url?: string,
): Promise<void> {
  const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
  const missing = 60 - totalCards;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📦 ${deckName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Current total: ${totalCards} cards`);
  console.log(`Missing: ${missing} cards`);
  if (url) {
    console.log(`URL: ${url}`);
  }

  if (!url || missing === 0) {
    if (missing === 0) {
      console.log(`✅ Deck is valid!`);
    } else {
      console.log(`⚠️  No URL available to check against`);
    }
    return;
  }

  // Fetch expected cards from URL
  console.log(`\n🔍 Fetching expected card list from URL...`);
  const expectedCards = await fetchDeckFromUrl(url);

  if (!expectedCards || expectedCards.length === 0) {
    console.log(`❌ Could not extract cards from URL`);
    return;
  }

  console.log(`✓ Found ${expectedCards.length} card types in expected list`);
  const expectedTotal = expectedCards.reduce((sum, c) => sum + c.quantity, 0);
  console.log(`  Expected total: ${expectedTotal} cards`);

  // Create a map of current deck cards by normalized name and level
  const currentCardsMap = new Map<string, { cardId: string; quantity: number; level?: number }>();
  
  for (const deckCard of deck.cards) {
    // Try to find the card in card sets to get its name and level
    for (const set of cardSets) {
      for (const card of set.cards) {
        const expectedCardId = generateCardId(
          set.metadata.author,
          set.metadata.setName,
          set.metadata.version,
          card.name,
          card.cardNumber,
          card.level,
        );

        if (deckCard.cardId === expectedCardId) {
          const normalizedName = normalizeName(card.name);
          const key = `${normalizedName}|${card.level ?? 'none'}`;
          currentCardsMap.set(key, {
            cardId: deckCard.cardId,
            quantity: deckCard.quantity,
            level: card.level,
          });
          break;
        }
      }
    }
  }

  // Compare expected vs current
  const missingCards: Array<{ name: string; level?: number; expected: number; current: number }> = [];
  const extraCards: Array<{ name: string; level?: number; quantity: number }> = [];
  const incorrectQuantities: Array<{ name: string; level?: number; expected: number; current: number }> = [];
  const matchedKeys = new Set<string>();

  for (const expected of expectedCards) {
    const normalizedName = normalizeName(expected.name);
    const key = `${normalizedName}|${expected.level ?? 'none'}`;
    let current = currentCardsMap.get(key);

    // If exact match not found, try matching without level (for cases where URL doesn't specify level)
    if (!current && expected.level === undefined) {
      // Try to find any card with this name (regardless of level)
      for (const [mapKey, mapValue] of currentCardsMap.entries()) {
        const [mapName] = mapKey.split('|');
        if (mapName === normalizedName) {
          current = mapValue;
          matchedKeys.add(mapKey);
          break;
        }
      }
    }

    if (!current) {
      // Check if card exists in card data
      const found = findCard(expected.name, expected.level, cardSets);
      if (found) {
        missingCards.push({
          name: expected.name,
          level: expected.level,
          expected: expected.quantity,
          current: 0,
        });
      } else {
        missingCards.push({
          name: expected.name,
          level: expected.level,
          expected: expected.quantity,
          current: 0,
        });
        console.log(`  ⚠️  Card not found in card data: ${expected.name}${expected.level ? ` lv. ${expected.level}` : ''}`);
      }
    } else if (current.quantity !== expected.quantity) {
      incorrectQuantities.push({
        name: expected.name,
        level: expected.level,
        expected: expected.quantity,
        current: current.quantity,
      });
      matchedKeys.add(key);
    } else {
      matchedKeys.add(key);
    }
  }

  // Any remaining in currentCardsMap that weren't matched are extras
  for (const [key, current] of currentCardsMap.entries()) {
    if (!matchedKeys.has(key)) {
      const [name, levelStr] = key.split('|');
      const level = levelStr === 'none' ? undefined : parseInt(levelStr, 10);
      extraCards.push({ name, level, quantity: current.quantity });
    }
  }

  // Report results
  if (missingCards.length > 0) {
    console.log(`\n❌ Missing Cards (${missingCards.length}):`);
    missingCards.forEach((m) => {
      console.log(`   - ${m.name}${m.level ? ` lv. ${m.level}` : ''}: expected x${m.expected}, found x${m.current}`);
    });
  }

  if (incorrectQuantities.length > 0) {
    console.log(`\n⚠️  Incorrect Quantities (${incorrectQuantities.length}):`);
    incorrectQuantities.forEach((iq) => {
      console.log(`   - ${iq.name}${iq.level ? ` lv. ${iq.level}` : ''}: expected x${iq.expected}, found x${iq.current}`);
    });
  }

  if (extraCards.length > 0) {
    console.log(`\n⚠️  Extra Cards (${extraCards.length}):`);
    extraCards.forEach((e) => {
      console.log(`   - ${e.name}${e.level ? ` lv. ${e.level}` : ''}: x${e.quantity} (not in expected list)`);
    });
  }

  if (missingCards.length === 0 && incorrectQuantities.length === 0 && extraCards.length === 0) {
    console.log(`\n✅ Deck matches expected list perfectly!`);
  }

  // Store results
  const cardsNotFoundInData: string[] = [];
  missingCards.forEach((m) => {
    const found = findCard(m.name, m.level, cardSets);
    if (!found) {
      cardsNotFoundInData.push(`${m.name}${m.level ? ` lv. ${m.level}` : ''}`);
    }
  });

  allResults.push({
    deckName,
    deckId,
    currentTotal: totalCards,
    missing,
    url,
    missingCards,
    incorrectQuantities,
    extraCards,
    cardsNotFoundInData: [...new Set(cardsNotFoundInData)],
  });
}

interface AnalysisResult {
  deckName: string;
  deckId: string;
  currentTotal: number;
  missing: number;
  url?: string;
  missingCards: Array<{ name: string; level?: number; expected: number; current: number }>;
  incorrectQuantities: Array<{ name: string; level?: number; expected: number; current: number }>;
  extraCards: Array<{ name: string; level?: number; quantity: number }>;
  cardsNotFoundInData: string[];
}

const allResults: AnalysisResult[] = [];

async function main() {
  console.log('🔍 Identifying missing cards in invalid decks...\n');

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

  console.log(`✓ Loaded ${cardSets.length} card sets\n`);

  // Load all invalid deck files
  const decksDir = path.resolve(__dirname, '..', 'data', 'decks');
  const deckFiles = fs.readdirSync(decksDir)
    .filter((f) => f.endsWith('.json') && f.includes('auto-deck-machine'))
    .sort();

  const invalidDecks: Array<{ file: string; deck: DeckFile; missing: number }> = [];

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const missing = 60 - total;

    if (missing !== 0 || !deck.isValid) {
      invalidDecks.push({ file: deckFile, deck, missing });
    }
  }

  console.log(`Found ${invalidDecks.length} invalid decks to analyze\n`);

  // Sort by missing cards (fewest first)
  invalidDecks.sort((a, b) => Math.abs(a.missing) - Math.abs(b.missing));

  // Analyze each deck
  for (let i = 0; i < invalidDecks.length; i++) {
    const { file, deck, missing } = invalidDecks[i];
    const url = deckUrls[deck.id];

    await analyzeDeck(deck.id, deck.name, deck, cardSets, url);

    // Add delay between requests to avoid rate limiting
    if (i < invalidDecks.length - 1 && url) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n\n✅ Analysis complete!`);

  // Generate summary report
  console.log(`\n📊 Generating summary report...`);
  const reportPath = path.resolve(__dirname, '..', 'missing-cards-report.md');
  let report = '# Missing Cards Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- Total decks analyzed: ${allResults.length}\n`;
  report += `- Decks with missing cards: ${allResults.filter(r => r.missingCards.length > 0).length}\n`;
  report += `- Decks with incorrect quantities: ${allResults.filter(r => r.incorrectQuantities.length > 0).length}\n`;
  report += `- Decks with extra cards: ${allResults.filter(r => r.extraCards.length > 0).length}\n\n`;

  // Group by missing count
  const byMissing = new Map<number, AnalysisResult[]>();
  allResults.forEach(r => {
    const count = r.missing;
    if (!byMissing.has(count)) {
      byMissing.set(count, []);
    }
    byMissing.get(count)!.push(r);
  });

  const sortedMissing = Array.from(byMissing.entries()).sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]));

  report += `## Decks by Missing Card Count\n\n`;
  for (const [missing, decks] of sortedMissing) {
    if (missing === 0) continue;
    const status = missing > 0 ? 'TOO FEW' : 'TOO MANY';
    report += `### ${status} by ${Math.abs(missing)} card(s) (${decks.length} deck(s))\n\n`;
    
    for (const deck of decks) {
      report += `#### ${deck.deckName}\n\n`;
      report += `- **Current total:** ${deck.currentTotal} cards\n`;
      report += `- **Missing:** ${deck.missing} cards\n`;
      if (deck.url) {
        report += `- **URL:** ${deck.url}\n`;
      }
      
      if (deck.missingCards.length > 0) {
        report += `\n**Missing Cards (${deck.missingCards.length}):**\n\n`;
        deck.missingCards.forEach(m => {
          report += `- ${m.name}${m.level ? ` lv. ${m.level}` : ''}: expected x${m.expected}, found x${m.current}\n`;
        });
        report += `\n`;
      }

      if (deck.incorrectQuantities.length > 0) {
        report += `**Incorrect Quantities (${deck.incorrectQuantities.length}):**\n\n`;
        deck.incorrectQuantities.forEach(iq => {
          report += `- ${iq.name}${iq.level ? ` lv. ${iq.level}` : ''}: expected x${iq.expected}, found x${iq.current}\n`;
        });
        report += `\n`;
      }

      if (deck.extraCards.length > 0) {
        report += `**Extra Cards (${deck.extraCards.length}):**\n\n`;
        deck.extraCards.forEach(e => {
          report += `- ${e.name}${e.level ? ` lv. ${e.level}` : ''}: x${e.quantity} (not in expected list)\n`;
        });
        report += `\n`;
      }

      if (deck.cardsNotFoundInData.length > 0) {
        report += `**Cards Not Found in Card Data:**\n\n`;
        deck.cardsNotFoundInData.forEach(card => {
          report += `- ${card}\n`;
        });
        report += `\n`;
      }

      report += `---\n\n`;
    }
  }

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✓ Report saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
