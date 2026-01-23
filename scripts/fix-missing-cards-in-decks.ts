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
  isValid: boolean;
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;
  [key: string]: any;
}

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

// Card name mappings for common parsing issues
const cardNameMappings: Record<string, string> = {
  'ball': 'Poke Ball',
  'poke ball': 'Poke Ball',
  'poké ball': 'Poke Ball',
  'professor oak': 'Impostor Professor Oak', // Use Impostor Professor Oak as substitute
  'mon trader': 'Pokémon Trader',
  'pokmon trader': 'Pokémon Trader',
  'pokémon trader': 'Pokémon Trader',
  'mon breeder': 'Pokémon Breeder',
  'pokmon breeder': 'Pokémon Breeder',
  'pokémon breeder': 'Pokémon Breeder',
  'mon center': 'Pokémon Center',
  'pokmon center': 'Pokémon Center',
  'pokémon center': 'Pokémon Center',
  'imposter professor oak': 'Impostor Professor Oak',
  'super energy retrieval': 'Energy Retrieval', // Use Energy Retrieval as substitute
};

// Fix card names that have parsing issues
function fixCardName(name: string): string {
  const normalized = normalizeName(name);
  
  // Check mappings first
  if (cardNameMappings[normalized]) {
    return cardNameMappings[normalized];
  }

  // Fix "x3nidorina" -> "Nidorina" (remove leading quantity)
  if (name.match(/^x\d+/i)) {
    return name.replace(/^x\d+/i, '').trim();
  }

  // Fix truncated names
  if (normalized.startsWith('mon ')) {
    return 'Pokémon ' + name.substring(4);
  }

  return name;
}

function main() {
  console.log('🔧 Fixing missing cards in decks...\n');

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

  // Parse the missing cards report
  const reportPath = path.resolve(__dirname, '..', 'missing-cards-report.md');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ missing-cards-report.md not found. Run identify-missing-cards.ts first.');
    process.exit(1);
  }

  const reportContent = fs.readFileSync(reportPath, 'utf-8');
  
  // Extract missing cards from report
  const deckFixes = new Map<string, Array<{ name: string; level?: number; quantity: number }>>();
  
  // Parse report to extract missing cards for each deck
  const deckSections = reportContent.split(/^#### /m);
  
  for (const section of deckSections) {
    if (!section.includes('Missing Cards')) continue;
    
    const deckNameMatch = section.match(/^([^\n]+)/);
    if (!deckNameMatch) continue;
    
    const deckName = deckNameMatch[1].trim();
    
    // Find deck ID from name
    const deckId = toKebabCase(deckName);
    
    // Extract missing cards
    const missingCardsMatch = section.match(/\*\*Missing Cards[^:]*:\*\*\s*\n\n((?:- [^\n]+\n?)+)/);
    if (!missingCardsMatch) continue;
    
    const missingCardsLines = missingCardsMatch[1].split('\n').filter(l => l.trim());
    const missingCards: Array<{ name: string; level?: number; quantity: number }> = [];
    
    for (const line of missingCardsLines) {
      const match = line.match(/^- (.+?)(?:\s+lv\.\s*(\d+))?: expected x(\d+), found x\d+/);
      if (match) {
        const name = fixCardName(match[1].trim());
        const level = match[2] ? parseInt(match[2], 10) : undefined;
        const quantity = parseInt(match[3], 10);
        missingCards.push({ name, level, quantity });
      }
    }
    
    if (missingCards.length > 0) {
      deckFixes.set(deckId, missingCards);
    }
  }

  console.log(`📋 Found ${deckFixes.size} decks with missing cards to fix\n`);

  // Load and fix each deck
  const decksDir = path.resolve(__dirname, '..', 'data', 'decks');
  const deckFiles = fs.readdirSync(decksDir)
    .filter((f) => f.endsWith('.json') && f.includes('auto-deck-machine'))
    .sort();

  let fixedCount = 0;
  let notFoundCount = 0;

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const missingCards = deckFixes.get(deck.id);
    if (!missingCards || missingCards.length === 0) {
      continue;
    }

    console.log(`\n📦 ${deck.name}`);
    console.log(`   Missing: ${missingCards.length} card type(s)`);

    let deckUpdated = false;
    const cardsToAdd: Array<{ cardId: string; setName: string; quantity: number }> = [];

    for (const missing of missingCards) {
      const found = findCard(missing.name, missing.level, cardSets);

      if (found) {
        const { card, set } = found;
        const cardId = generateCardId(
          set.metadata.author,
          set.metadata.setName,
          set.metadata.version,
          card.name,
          card.cardNumber,
          card.level,
        );

        // Check if card already exists in deck
        const existingCard = deck.cards.find((dc) => dc.cardId === cardId);
        
        if (existingCard) {
          // Update quantity
          existingCard.quantity += missing.quantity;
          console.log(`   ✓ Updated ${card.name}${card.level ? ` lv. ${card.level}` : ''}: +${missing.quantity} (now x${existingCard.quantity})`);
        } else {
          // Add new card
          cardsToAdd.push({
            cardId,
            setName: set.metadata.setName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            quantity: missing.quantity,
          });
          console.log(`   ✓ Added ${card.name}${card.level ? ` lv. ${card.level}` : ''}: x${missing.quantity}`);
        }
        deckUpdated = true;
      } else {
        console.log(`   ⚠️  Card not found: ${missing.name}${missing.level ? ` lv. ${missing.level}` : ''}`);
        notFoundCount++;
      }
    }

    if (deckUpdated) {
      // Add new cards to deck
      deck.cards.push(...cardsToAdd);
      
      // Sort cards by cardId
      deck.cards.sort((a, b) => a.cardId.localeCompare(b.cardId));
      
      // Update totals and validation
      const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
      deck.isValid = totalCards === 60;
      deck.updatedAt = new Date().toISOString();

      fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2), 'utf-8');
      
      console.log(`   ✅ Updated deck (${totalCards} cards, ${deck.isValid ? 'VALID' : 'INVALID'})`);
      fixedCount++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixedCount} decks`);
  console.log(`   ⚠️  Cards not found: ${notFoundCount} card(s)`);
  console.log(`\n✅ Done!`);
}

main();
