import * as fs from 'fs';
import * as path from 'path';

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

function main() {
  console.log('🔧 Fixing deck totals to exactly 60 cards...\n');

  const decksDir = path.resolve(__dirname, '..', 'data', 'decks');
  const deckFiles = fs.readdirSync(decksDir)
    .filter((f) => f.endsWith('.json') && f.includes('auto-deck-machine'))
    .sort();

  let fixedCount = 0;
  let adjustedCount = 0;

  for (const deckFile of deckFiles) {
    const deckPath = path.join(decksDir, deckFile);
    const deckContent = fs.readFileSync(deckPath, 'utf-8');
    const deck: DeckFile = JSON.parse(deckContent);

    const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
    const difference = 60 - totalCards;

    if (difference === 0) {
      // Already valid, just mark as valid
      if (!deck.isValid) {
        deck.isValid = true;
        deck.updatedAt = new Date().toISOString();
        fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2), 'utf-8');
        fixedCount++;
      }
      continue;
    }

    console.log(`📦 ${deck.name}`);
    console.log(`   Current: ${totalCards} cards (${difference > 0 ? 'missing' : 'too many'} ${Math.abs(difference)})`);

    if (difference > 0) {
      // Too few cards - try to add basic energy cards
      // Find the most common energy type in the deck
      const energyCounts = new Map<string, number>();
      for (const card of deck.cards) {
        if (card.cardId.includes('energy') && !card.cardId.includes('double-colorless')) {
          const energyType = card.cardId.split('-').find(part => 
            ['fire', 'water', 'grass', 'lightning', 'psychic', 'fighting'].includes(part)
          );
          if (energyType) {
            energyCounts.set(energyType, (energyCounts.get(energyType) || 0) + card.quantity);
          }
        }
      }

      // Add the most common energy type
      if (energyCounts.size > 0) {
        const mostCommonEnergy = Array.from(energyCounts.entries())
          .sort((a, b) => b[1] - a[1])[0][0];
        
        const energyCardId = `pokemon-base-set-v1.0-${mostCommonEnergy}-energy--${mostCommonEnergy === 'fire' ? '99' : mostCommonEnergy === 'water' ? '101' : mostCommonEnergy === 'grass' ? '100' : mostCommonEnergy === 'lightning' ? '103' : mostCommonEnergy === 'psychic' ? '102' : '98'}`;
        
        const existingEnergy = deck.cards.find(c => c.cardId === energyCardId);
        if (existingEnergy) {
          existingEnergy.quantity += difference;
          console.log(`   ✓ Added ${difference} ${mostCommonEnergy} energy (now x${existingEnergy.quantity})`);
        } else {
          deck.cards.push({
            cardId: energyCardId,
            setName: 'base-set',
            quantity: difference,
          });
          console.log(`   ✓ Added ${difference} ${mostCommonEnergy} energy`);
        }
      } else {
        // No energy found, add basic energy (default to fire)
        const energyCardId = 'pokemon-base-set-v1.0-fire-energy--99';
        const existingEnergy = deck.cards.find(c => c.cardId === energyCardId);
        if (existingEnergy) {
          existingEnergy.quantity += difference;
        } else {
          deck.cards.push({
            cardId: energyCardId,
            setName: 'base-set',
            quantity: difference,
          });
        }
        console.log(`   ✓ Added ${difference} fire energy (default)`);
      }
    } else {
      // Too many cards - remove from the most common card
      const cardCounts = deck.cards.map(c => ({ card: c, total: c.quantity }));
      cardCounts.sort((a, b) => b.total - a.total);
      
      let remaining = Math.abs(difference);
      for (const { card } of cardCounts) {
        if (remaining <= 0) break;
        const toRemove = Math.min(remaining, card.quantity);
        card.quantity -= toRemove;
        remaining -= toRemove;
        console.log(`   ✓ Removed ${toRemove} from ${card.cardId}`);
      }

      // Remove cards with quantity 0
      deck.cards = deck.cards.filter(c => c.quantity > 0);
    }

    // Update deck
    deck.cards.sort((a, b) => a.cardId.localeCompare(b.cardId));
    const newTotal = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
    deck.isValid = newTotal === 60;
    deck.updatedAt = new Date().toISOString();

    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2), 'utf-8');
    console.log(`   ✅ Updated deck (${newTotal} cards, ${deck.isValid ? 'VALID' : 'INVALID'})\n`);
    adjustedCount++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Marked as valid: ${fixedCount} decks`);
  console.log(`   🔧 Adjusted totals: ${adjustedCount} decks`);
  console.log(`\n✅ Done!`);
}

main();
