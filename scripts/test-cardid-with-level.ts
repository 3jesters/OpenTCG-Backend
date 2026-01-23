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
    level?: number;
    [key: string]: any;
  }>;
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

  // Build card ID with level if present, otherwise use double dash separator
  if (levelStr === '') {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}--${cardNumber}`;
  } else {
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${levelStr}-${cardNumber}`;
  }
}

function main() {
  const jsonPath = path.resolve(__dirname, '..', 'data', 'cards', 'pokemon-base-set-v1.0.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonData: CardSetFile = JSON.parse(jsonContent);

  // Test a few cards
  const testCards = [
    jsonData.cards.find((c) => c.name === 'Pikachu' && c.cardNumber === '60'),
    jsonData.cards.find((c) => c.name === 'Raichu' && c.cardNumber === '14'),
    jsonData.cards.find((c) => c.name === 'Charizard' && c.cardNumber === '4'),
    jsonData.cards.find((c) => c.name === 'Alakazam' && c.cardNumber === '1'),
  ].filter(Boolean);

  console.log('Testing cardId generation with levels:\n');

  for (const card of testCards) {
    if (!card) continue;

    const cardId = generateCardId(
      jsonData.metadata.author,
      jsonData.metadata.setName,
      jsonData.metadata.version,
      card.name,
      card.cardNumber,
      card.level,
    );

    console.log(`Card: ${card.name} (${card.cardNumber})`);
    console.log(`  Level: ${card.level ?? 'undefined'}`);
    console.log(`  CardId: ${cardId}`);
    console.log(`  Format check: ${card.level ? 'Includes level ✓' : 'No level (double dash) ✓'}`);
    console.log();
  }

  // Count cards with and without levels
  const withLevel = jsonData.cards.filter((c) => c.level !== undefined).length;
  const withoutLevel = jsonData.cards.filter((c) => c.level === undefined).length;
  const pokemonCards = jsonData.cards.filter((c) => !c.cardType || c.cardType === 'POKEMON').length;

  console.log(`\nSummary for ${jsonData.metadata.setName}:`);
  console.log(`  Total cards: ${jsonData.cards.length}`);
  console.log(`  Pokemon cards: ${pokemonCards}`);
  console.log(`  Cards with level: ${withLevel}`);
  console.log(`  Cards without level: ${withoutLevel}`);
}

main();
