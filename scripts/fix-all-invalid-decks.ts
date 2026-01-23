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

function main() {
  console.log('🔧 Fixing all invalid decks...\n');

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

  // Load all deck files
  const decksDir = path.resolve(__dirname, '..', 'data', 'decks');
  const deckFiles = fs.readdirSync(decksDir).filter((f) => f.endsWith('.json'));

  let fixedCount = 0;
  let stillInvalidCount = 0;

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);

    // Only process invalid decks or decks that don't have 60 cards
    if (deck.isValid && totalCards === 60) {
      continue;
    }

    console.log(`\n📦 Processing: ${deck.name}`);
    console.log(`   Current total: ${totalCards} cards`);
    console.log(`   Status: ${deck.isValid ? 'valid' : 'invalid'}`);

    // Regenerate all cardIds to ensure they include levels
    let updated = false;
    const updatedCards = deck.cards.map((deckCard) => {
      // Try to find the card by cardId
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

          // Check if this cardId matches (with or without level)
          const oldCardIdWithoutLevel = deckCard.cardId.replace(/--(\d+)$/, '--$1');
          const newCardIdWithoutLevel = expectedCardId.replace(/--(\d+)$/, '--$1');

          if (
            deckCard.cardId === expectedCardId ||
            (deckCard.cardId.includes(card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) &&
              deckCard.setName === set.metadata.setName &&
              card.cardNumber === deckCard.cardId.split('-').pop())
          ) {
            // Found matching card, update cardId if needed
            if (deckCard.cardId !== expectedCardId) {
              updated = true;
              return {
                ...deckCard,
                cardId: expectedCardId,
              };
            }
            return deckCard;
          }
        }
      }

      // If we can't match by cardId, try to match by name and set
      const cardIdParts = deckCard.cardId.split('-');
      const cardNumber = cardIdParts[cardIdParts.length - 1];

      for (const set of cardSets) {
        if (set.metadata.setName.toLowerCase().replace(/[^a-z0-9]+/g, '-') !== deckCard.setName) {
          continue;
        }

        for (const card of set.cards) {
          if (card.cardNumber === cardNumber) {
            const expectedCardId = generateCardId(
              set.metadata.author,
              set.metadata.setName,
              set.metadata.version,
              card.name,
              card.cardNumber,
              card.level,
            );

            if (deckCard.cardId !== expectedCardId) {
              updated = true;
              return {
                ...deckCard,
                cardId: expectedCardId,
              };
            }
            return deckCard;
          }
        }
      }

      return deckCard;
    });

    // Check if deck now has 60 cards
    const newTotal = updatedCards.reduce((sum, c) => sum + c.quantity, 0);
    const isValid = newTotal === 60;

    if (updated || isValid !== deck.isValid) {
      deck.cards = updatedCards;
      deck.isValid = isValid;
      deck.updatedAt = new Date().toISOString();

      fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2), 'utf-8');

      if (isValid) {
        console.log(`   ✅ Fixed! Now valid with ${newTotal} cards`);
        fixedCount++;
      } else {
        console.log(`   ⚠️  Updated cardIds but still invalid (${newTotal} cards, need 60)`);
        stillInvalidCount++;
      }
    } else {
      console.log(`   ⏭️  No changes needed (still ${newTotal} cards)`);
      if (newTotal !== 60) {
        stillInvalidCount++;
      }
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Fixed and validated: ${fixedCount} decks`);
  console.log(`   ⚠️  Still invalid: ${stillInvalidCount} decks`);
  console.log(`   Total processed: ${fixedCount + stillInvalidCount} decks`);
}

main();
