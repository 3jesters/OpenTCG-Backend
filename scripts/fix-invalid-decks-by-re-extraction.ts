import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Import the extraction logic from extract-decks-from-urls.ts
// For now, we'll use a simplified version that focuses on re-extracting

interface DeckInfo {
  id: string;
  name: string;
  url: string;
  missingCards: number;
}

// Decks to re-extract, ordered by missing cards (fewest first)
const decksToFix: DeckInfo[] = [
  // Missing 1 card
  { id: 'fire-auto-deck-machine-fire-charge-deck', name: 'Fire Auto Deck Machine - Fire Charge Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/100796212958/fire-auto-deck-machine-fire-charge-deck', missingCards: 1 },
  { id: 'first-auto-deck-machine-psychic-machamp-deck', name: 'First Auto Deck Machine - Psychic Machamp Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/99368120044/first-auto-deck-machine-psychic-machamp-deck', missingCards: 1 },
  { id: 'grass-auto-deck-machine-jungle-deck', name: 'Grass Auto Deck Machine - Jungle Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/99959162541/grass-auto-deck-machine-jungle-deck', missingCards: 1 },
  { id: 'science-auto-deck-machine-science-corps-deck', name: 'Science Auto Deck Machine - Science Corps Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102025124676/science-auto-deck-machine-science-corps-deck', missingCards: 1 },
  { id: 'water-auto-deck-machine-blue-water-deck', name: 'Water Auto Deck Machine - Blue Water Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/100874708954/water-auto-deck-machine-blue-water-deck', missingCards: 1 },
  // Missing 2 cards
  { id: 'fire-auto-deck-machine-fire-pokemon-deck', name: 'Fire Auto Deck Machine - Fire Pokémon Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/100715385527/fire-auto-deck-machine-fire-pokemon-deck', missingCards: 2 },
  { id: 'psychic-auto-deck-machine-psychic-power-deck', name: 'Psychic Auto Deck Machine - Psychic Power Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102291739967/psychic-auto-deck-machine-psychic-power-deck', missingCards: 2 },
  // Missing 3 cards
  { id: 'psychic-auto-deck-machine-strange-power-deck', name: 'Psychic Auto Deck Machine - Strange Power Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102544793542/psychic-auto-deck-machine-strange-power-deck', missingCards: 3 },
  // Missing 4 cards
  { id: 'psychic-auto-deck-machine-scavenging-slowbro-deck', name: 'Psychic Auto Deck Machine - Scavenging Slowbro Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102463954172/psychic-auto-deck-machine-scavenging-slowbro-deck', missingCards: 4 },
  // Missing 5 cards
  { id: 'science-auto-deck-machine-flyin-pokemon-deck', name: 'Science Auto Deck Machine - Flyin\' Pokémon Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102111161549/science-auto-deck-machine-flyin-pokemon-deck', missingCards: 5 },
  // Missing 8 cards
  { id: 'fighting-auto-deck-machine-heated-battle-deck', name: 'Fighting Auto Deck Machine - Heated Battle Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102973975574/fighting-auto-deck-machine-heated-battle-deck', missingCards: 8 },
  { id: 'lightning-auto-deck-machine-cute-pokemon-deck', name: 'Lightning Auto Deck Machine - Cute Pokémon Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/101506510108/lightning-auto-deck-machine-cute-pokemon-deck', missingCards: 8 },
  { id: 'rock-auto-deck-machine-excavation-deck', name: 'Rock Auto Deck Machine - Excavation Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/103389003090/rock-auto-deck-machine-excavation-deck', missingCards: 8 },
  // Missing 10 cards
  { id: 'first-auto-deck-machine-charmander-friends-deck', name: 'First Auto Deck Machine - Charmander & Friends Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/99017380305/first-auto-deck-machine-charmander-friends-deck', missingCards: 10 },
  { id: 'first-auto-deck-machine-squirtle-friends-deck', name: 'First Auto Deck Machine - Squirtle & Friends Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/99167909592/first-auto-deck-machine-squirtle-friends-deck', missingCards: 10 },
  { id: 'grass-auto-deck-machine-kaleidoscope-deck', name: 'Grass Auto Deck Machine - Kaleidoscope Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/100285778742/grass-auto-deck-machine-kaleidoscope-deck', missingCards: 10 },
  // Missing 11 cards
  { id: 'first-auto-deck-machine-bulbasaur-friends-deck', name: 'First Auto Deck Machine - Bulbasaur & Friends Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/99259990469/first-auto-deck-machine-bulbasaur-friends-deck', missingCards: 11 },
  // Missing 12 cards
  { id: 'fighting-auto-deck-machine-bench-attack-deck', name: 'Fighting Auto Deck Machine - Bench Attack Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102801094862/fighting-auto-deck-machine-bench-attack-deck', missingCards: 12 },
  // Missing 14 cards
  { id: 'first-auto-deck-machine-water-beetle-deck', name: 'First Auto Deck Machine - Water-Beetle Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/99451474376/first-auto-deck-machine-water-beetle-deck', missingCards: 14 },
  // Missing 17 cards
  { id: 'water-auto-deck-machine-energy-removal-deck', name: 'Water Auto Deck Machine - Energy Removal Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/101137987094/water-auto-deck-machine-energy-removal-deck', missingCards: 17 },
  // Missing 24 cards
  { id: 'fighting-auto-deck-machine-battle-contest-deck', name: 'Fighting Auto Deck Machine - Battle Contest Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102889946636/fighting-auto-deck-machine-battle-contest-deck', missingCards: 24 },
  { id: 'lightning-auto-deck-machine-zapping-selfdestruct-deck', name: 'Lightning Auto Deck Machine - Zapping Selfdestruct Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/101859498188/lightning-auto-deck-machine-zapping-selfdestruct-deck', missingCards: 24 },
  { id: 'rock-auto-deck-machine-rock-crusher-deck', name: 'Rock Auto Deck Machine - Rock Crusher Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/103477722049/rock-auto-deck-machine-rock-crusher-deck', missingCards: 24 },
  { id: 'science-auto-deck-machine-lovely-nidoran-deck', name: 'Science Auto Deck Machine - Lovely Nidoran Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/101942301870/science-auto-deck-machine-lovely-nidoran-deck', missingCards: 24 },
  { id: 'science-auto-deck-machine-poison-deck', name: 'Science Auto Deck Machine - Poison Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/102202509372/science-auto-deck-machine-poison-deck', missingCards: 24 },
  // Missing 25 cards
  { id: 'fighting-auto-deck-machine-first-strike-deck', name: 'Fighting Auto Deck Machine - First Strike Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/103056335494/fighting-auto-deck-machine-first-strike-deck', missingCards: 25 },
  { id: 'lightning-auto-deck-machine-electric-shock-deck', name: 'Lightning Auto Deck Machine - Electric Shock Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/101775509472/lightning-auto-deck-machine-electric-shock-deck', missingCards: 25 },
  { id: 'rock-auto-deck-machine-great-quake-deck', name: 'Rock Auto Deck Machine - Great Quake Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/103217326362/rock-auto-deck-machine-great-quake-deck', missingCards: 25 },
  // Missing 26 cards
  { id: 'lightning-auto-deck-machine-yellow-flash-deck', name: 'Lightning Auto Deck Machine - Yellow Flash Deck', url: 'http://pkmntcg4gbc.tumblr.com/post/101689945141/lightning-auto-deck-machine-yellow-flash-deck', missingCards: 26 },
];

console.log(`📋 Found ${decksToFix.length} decks to re-extract`);
console.log('💡 Run the extract-decks-from-urls.ts script with these URLs to fix them.');
console.log('\nDecks ordered by missing cards (fewest first):\n');
decksToFix.forEach((deck, i) => {
  console.log(`${i + 1}. ${deck.name} (missing ${deck.missingCards} cards)`);
  console.log(`   URL: ${deck.url}`);
  console.log(`   ID: ${deck.id}\n`);
});
