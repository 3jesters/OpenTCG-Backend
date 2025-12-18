import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { DeckOrmEntity } from '../src/modules/deck/infrastructure/persistence/entities';
import { CardOrmEntity } from '../src/modules/card/infrastructure/persistence/entities';
import { MatchOrmEntity } from '../src/modules/match/infrastructure/persistence/entities';
import { migrationConfig } from './migration.config';

/**
 * Recursively fix cardIds in nested objects/arrays
 */
function fixCardIdsInObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Fix cardId strings
    if (obj.match(/--\d+$/)) {
      return obj.replace(/--(\d+)$/, '-$1');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => fixCardIdsInObject(item));
  }

  if (typeof obj === 'object') {
    const fixed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'cardId' && typeof value === 'string' && value.match(/--\d+$/)) {
        fixed[key] = value.replace(/--(\d+)$/, '-$1');
      } else {
        fixed[key] = fixCardIdsInObject(value);
      }
    }
    return fixed;
  }

  return obj;
}

/**
 * Fix Deck and Match CardIds
 * Updates cardIds to match the correct format from the cards table
 */
class CardIdFixer {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      ...migrationConfig.database,
      entities: [DeckOrmEntity, CardOrmEntity, MatchOrmEntity],
      synchronize: false,
      logging: true,
    });
  }

  async fix(): Promise<void> {
    console.log('🔧 Fixing cardIds in decks and matches...\n');

    try {
      await this.dataSource.initialize();
      console.log('✅ Database connected\n');

      // Fix decks
      await this.fixDecks();

      // Fix matches
      await this.fixMatches();

      console.log('\n✨ All cardIds fixed!\n');
    } catch (error) {
      console.error('❌ Fix failed:', error);
      throw error;
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        console.log('📡 Database connection closed');
      }
    }
  }

  private async fixDecks(): Promise<void> {
    console.log('📚 Fixing decks...');
    const deckRepository = this.dataSource.getRepository(DeckOrmEntity);
    const decks = await deckRepository.find();

    let updated = 0;
    for (const deck of decks) {
      const originalCards = JSON.stringify(deck.cards);
      const fixedCards = fixCardIdsInObject(deck.cards);
      const fixedCardsStr = JSON.stringify(fixedCards);

      if (originalCards !== fixedCardsStr) {
        deck.cards = fixedCards;
        await deckRepository.save(deck);
        updated++;
        console.log(`  ✅ Updated deck: ${deck.name}`);
      }
    }
    console.log(`✅ Fixed ${updated} deck(s)\n`);
  }

  private async fixMatches(): Promise<void> {
    console.log('⚔️  Fixing matches...');
    const matchRepository = this.dataSource.getRepository(MatchOrmEntity);
    const matches = await matchRepository.find();

    let updated = 0;
    for (const match of matches) {
      if (!match.gameState) {
        continue;
      }

      const originalGameState = JSON.stringify(match.gameState);
      const fixedGameState = fixCardIdsInObject(match.gameState);
      const fixedGameStateStr = JSON.stringify(fixedGameState);

      if (originalGameState !== fixedGameStateStr) {
        match.gameState = fixedGameState as any;
        await matchRepository.save(match);
        updated++;
        console.log(`  ✅ Updated match: ${match.id}`);
      }
    }
    console.log(`✅ Fixed ${updated} match(es)\n`);
  }
}

// Run fix
const fixer = new CardIdFixer();
fixer.fix().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

