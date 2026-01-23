// This script re-extracts only the invalid decks
// It uses the same extraction logic as extract-decks-from-urls.ts

import * as fs from 'fs';
import * as path from 'path';

// Read the extract-decks-from-urls.ts file and modify it to only process invalid decks
const invalidDeckUrls = [
  'http://pkmntcg4gbc.tumblr.com/post/100796212958/fire-auto-deck-machine-fire-charge-deck',
  'http://pkmntcg4gbc.tumblr.com/post/99368120044/first-auto-deck-machine-psychic-machamp-deck',
  'http://pkmntcg4gbc.tumblr.com/post/99959162541/grass-auto-deck-machine-jungle-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102025124676/science-auto-deck-machine-science-corps-deck',
  'http://pkmntcg4gbc.tumblr.com/post/100874708954/water-auto-deck-machine-blue-water-deck',
  'http://pkmntcg4gbc.tumblr.com/post/100633486106/fire-auto-deck-machine-traffic-light-deck',
  'http://pkmntcg4gbc.tumblr.com/post/100715385527/fire-auto-deck-machine-fire-pokemon-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102291739967/psychic-auto-deck-machine-psychic-power-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102544793542/psychic-auto-deck-machine-strange-power-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102463954172/psychic-auto-deck-machine-scavenging-slowbro-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102111161549/science-auto-deck-machine-flyin-pokemon-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102973975574/fighting-auto-deck-machine-heated-battle-deck',
  'http://pkmntcg4gbc.tumblr.com/post/101506510108/lightning-auto-deck-machine-cute-pokemon-deck',
  'http://pkmntcg4gbc.tumblr.com/post/103389003090/rock-auto-deck-machine-excavation-deck',
  'http://pkmntcg4gbc.tumblr.com/post/99017380305/first-auto-deck-machine-charmander-friends-deck',
  'http://pkmntcg4gbc.tumblr.com/post/99167909592/first-auto-deck-machine-squirtle-friends-deck',
  'http://pkmntcg4gbc.tumblr.com/post/100285778742/grass-auto-deck-machine-kaleidoscope-deck',
  'http://pkmntcg4gbc.tumblr.com/post/99259990469/first-auto-deck-machine-bulbasaur-friends-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102801094862/fighting-auto-deck-machine-bench-attack-deck',
  'http://pkmntcg4gbc.tumblr.com/post/99451474376/first-auto-deck-machine-water-beetle-deck',
  'http://pkmntcg4gbc.tumblr.com/post/101137987094/water-auto-deck-machine-energy-removal-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102889946636/fighting-auto-deck-machine-battle-contest-deck',
  'http://pkmntcg4gbc.tumblr.com/post/101859498188/lightning-auto-deck-machine-zapping-selfdestruct-deck',
  'http://pkmntcg4gbc.tumblr.com/post/103477722049/rock-auto-deck-machine-rock-crusher-deck',
  'http://pkmntcg4gbc.tumblr.com/post/101942301870/science-auto-deck-machine-lovely-nidoran-deck',
  'http://pkmntcg4gbc.tumblr.com/post/102202509372/science-auto-deck-machine-poison-deck',
  'http://pkmntcg4gbc.tumblr.com/post/103056335494/fighting-auto-deck-machine-first-strike-deck',
  'http://pkmntcg4gbc.tumblr.com/post/101775509472/lightning-auto-deck-machine-electric-shock-deck',
  'http://pkmntcg4gbc.tumblr.com/post/103217326362/rock-auto-deck-machine-great-quake-deck',
  'http://pkmntcg4gbc.tumblr.com/post/101689945141/lightning-auto-deck-machine-yellow-flash-deck',
];

console.log(`📋 Will re-extract ${invalidDeckUrls.length} invalid decks`);
console.log('💡 To actually re-extract, modify extract-decks-from-urls.ts to use this URL list');
console.log('   or run: npx ts-node scripts/extract-decks-from-urls.ts');
console.log('\nInvalid deck URLs:');
invalidDeckUrls.forEach((url, i) => {
  console.log(`${i + 1}. ${url}`);
});
