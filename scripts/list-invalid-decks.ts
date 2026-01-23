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

function extractDeckNameFromUrl(url: string): string {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart;
}

/**
 * List all invalid decks with their URLs
 */
function main() {
  // Deck URLs from extract-decks-from-urls.ts
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

  // Create URL to deck ID mapping
  const urlToDeckIdMap = new Map<string, string>();
  for (const url of urls) {
    const deckNameFromUrl = extractDeckNameFromUrl(url);
    const deckId = toKebabCase(deckNameFromUrl);
    urlToDeckIdMap.set(deckId, url);
  }

  const decksDir = path.join(__dirname, '../data/decks');
  const deckFiles = fs.readdirSync(decksDir)
    .filter(f => f.endsWith('.json') && (f.includes('auto-deck-machine') || f.includes('deck-machine')))
    .sort();

  const invalidDecks: Array<{
    file: string;
    id: string;
    name: string;
    total: number;
    difference: number;
    url: string | undefined;
  }> = [];

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const difference = 60 - total;

    if (total !== 60) {
      const url = urlToDeckIdMap.get(deck.id);
      invalidDecks.push({
        file: deckFile,
        id: deck.id,
        name: deck.name,
        total,
        difference,
        url,
      });
    }
  }

  // Sort by difference (closest to 60 first)
  invalidDecks.sort((a, b) => Math.abs(a.difference) - Math.abs(b.difference));

  // Output simple list
  console.log('='.repeat(80));
  console.log(`INVALID DECKS LIST (${invalidDecks.length} total)`);
  console.log('='.repeat(80));
  console.log();

  invalidDecks.forEach((deck, index) => {
    const status = deck.difference > 0 
      ? `Missing ${deck.difference} cards` 
      : `Extra ${Math.abs(deck.difference)} cards`;
    
    console.log(`${index + 1}. ${deck.name}`);
    console.log(`   File: ${deck.file}`);
    console.log(`   Total: ${deck.total} cards (${status})`);
    if (deck.url) {
      console.log(`   URL: ${deck.url}`);
    } else {
      console.log(`   URL: NOT FOUND`);
    }
    console.log();
  });

  console.log('='.repeat(80));
}

main();
