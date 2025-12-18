#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { migrationConfig } from './migration.config';

// Import ORM entities
import { MatchOrmEntity } from '../src/modules/match/infrastructure/persistence/entities';
import { TournamentOrmEntity } from '../src/modules/tournament/infrastructure/persistence/entities';
import { DeckOrmEntity } from '../src/modules/deck/infrastructure/persistence/entities';
import { SetOrmEntity } from '../src/modules/set/infrastructure/persistence/entities';
import { CardOrmEntity } from '../src/modules/card/infrastructure/persistence/entities';

// Import mappers
import { MatchOrmMapper } from '../src/modules/match/infrastructure/persistence/mappers/match-orm.mapper';
import { MatchMapper } from '../src/modules/match/infrastructure/persistence/match.mapper';
import { DeckOrmMapper } from '../src/modules/deck/infrastructure/persistence/mappers/deck-orm.mapper';

// Import domain for reconstruction
import { Deck } from '../src/modules/deck/domain/entities/deck.entity';
import { DeckCard } from '../src/modules/deck/domain/value-objects';

/**
 * Migration Statistics
 */
interface MigrationStats {
  sets: { success: number; failed: number; skipped: number };
  cards: { success: number; failed: number; skipped: number };
  tournaments: { success: number; failed: number; skipped: number };
  decks: { success: number; failed: number; skipped: number };
  matches: { success: number; failed: number; skipped: number };
}

/**
 * Standalone Data Migration Script
 * Migrates data from JSON files to PostgreSQL
 */
class DataMigration {
  private dataSource: DataSource;
  private stats: MigrationStats = {
    sets: { success: 0, failed: 0, skipped: 0 },
    cards: { success: 0, failed: 0, skipped: 0 },
    tournaments: { success: 0, failed: 0, skipped: 0 },
    decks: { success: 0, failed: 0, skipped: 0 },
    matches: { success: 0, failed: 0, skipped: 0 },
  };

  constructor() {
    this.dataSource = new DataSource({
      ...migrationConfig.database,
      entities: [
        MatchOrmEntity,
        TournamentOrmEntity,
        DeckOrmEntity,
        SetOrmEntity,
        CardOrmEntity,
      ],
      synchronize: true, // Auto-create tables
      logging: migrationConfig.options.verbose,
    });
  }

  /**
   * Main migration entry point
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting data migration to PostgreSQL...\n');

    if (migrationConfig.options.dryRun) {
      console.log('⚠️  DRY RUN MODE - No data will be written\n');
    }

    try {
      // Initialize database connection
      console.log('📡 Connecting to database...');
      await this.dataSource.initialize();
      console.log('✅ Database connected\n');

      // Migrate in order (respecting dependencies)
      await this.migrateSets();
      await this.migrateCards();
      await this.migrateTournaments();
      await this.migrateDecks();
      await this.migrateMatches();

      // Print summary
      this.printSummary();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        console.log('\n📡 Database connection closed');
      }
    }
  }

  /**
   * Migrate Sets
   */
  private async migrateSets(): Promise<void> {
    console.log('📦 Migrating Sets...');

    try {
      const files = await fs.readdir(migrationConfig.dataPaths.sets);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = join(migrationConfig.dataPaths.sets, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const json = JSON.parse(data);

          // Extract set info from metadata or filename
          const setData = json.metadata || json;
          const setName = setData.setName || file.replace('.json', '');

          if (!migrationConfig.options.dryRun) {
            const setEntity = this.dataSource.getRepository(SetOrmEntity).create({
              id: setName,
              name: setData.setName || setName,
              series: setData.series || 'pokemon',
              releaseDate: setData.dateReleased || new Date().toISOString(),
              totalCards: setData.totalCards || (json.cards?.length || 0),
              description: setData.description || null,
              official: setData.official || false,
              symbolUrl: null,
              logoUrl: setData.logoUrl || null,
            });

            await this.dataSource.getRepository(SetOrmEntity).save(setEntity);
          }

          this.stats.sets.success++;
          if (migrationConfig.options.verbose) {
            console.log(`  ✅ Set: ${setName}`);
          }
        } catch (error) {
          this.stats.sets.failed++;
          console.error(`  ❌ Failed to migrate set from ${file}:`, error.message);
        }
      }

      console.log(`✅ Sets migrated: ${this.stats.sets.success}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('⚠️  No sets directory found, skipping...\n');
      } else {
        throw error;
      }
    }
  }

  /**
   * Convert string to kebab case (matches PreviewCardUseCase logic)
   */
  private toKebabCase(str: string): string {
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
   * Generate cardId in the same format as PreviewCardUseCase
   * Format: ${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${cardNumber}
   */
  private generateCardId(
    author: string,
    setName: string,
    version: string,
    cardName: string,
    cardNumber: string,
  ): string {
    const authorKebab = this.toKebabCase(author);
    const setNameKebab = this.toKebabCase(setName);
    const cardNameKebab = this.toKebabCase(cardName);
    return `${authorKebab}-${setNameKebab}-v${version}-${cardNameKebab}-${cardNumber}`;
  }

  /**
   * Migrate Cards
   */
  private async migrateCards(): Promise<void> {
    console.log('🃏 Migrating Cards...');

    try {
      const files = await fs.readdir(migrationConfig.dataPaths.cards);
      const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

      for (const file of jsonFiles) {
        try {
          const filePath = join(migrationConfig.dataPaths.cards, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const json = JSON.parse(data);

          // Handle both array format and object with cards property
          const cardsData = Array.isArray(json) ? json : json.cards || [];
          const metadata = json.metadata || {};
          const author = metadata.author || 'pokemon';
          const setName = metadata.setName || cardsData[0]?.setName || file.replace('.json', '');
          const version = metadata.version || '1.0';

          if (!migrationConfig.options.dryRun && cardsData.length > 0) {
            // Prepare card entities for bulk insert
            const cardEntities = cardsData.map((cardData: any) => {
              // Infer cardType if not explicitly provided
              let cardType = cardData.cardType;
              if (!cardType) {
                if (cardData.trainerType) {
                  cardType = 'TRAINER';
                } else if (cardData.energyType) {
                  cardType = 'ENERGY';
                } else if (cardData.pokemonType || cardData.hp) {
                  cardType = 'POKEMON';
                } else {
                  // Default fallback
                  cardType = 'POKEMON';
                }
              }

              const entity = new CardOrmEntity();
              // Generate unique instanceId using setName-cardNumber (most unique combination)
              const finalSetName = cardData.setName || setName;
              entity.instanceId = cardData.instanceId || `${finalSetName}-${cardData.cardNumber}`;
              // Generate cardId in the same format as PreviewCardUseCase
              entity.cardId = cardData.cardId || this.generateCardId(
                author,
                finalSetName,
                version,
                cardData.name,
                cardData.cardNumber,
              );
              entity.pokemonNumber = cardData.pokemonNumber || null;
              entity.name = cardData.name;
              entity.setName = cardData.setName || setName;
              entity.cardNumber = cardData.cardNumber;
              entity.rarity = cardData.rarity;
              entity.cardType = cardType;
              entity.pokemonType = cardData.pokemonType || null;
              entity.stage = cardData.stage || null;
              entity.subtypes = cardData.subtypes || [];
              entity.evolvesFrom = cardData.evolvesFrom || null;
              entity.evolvesTo = cardData.evolvesTo || [];
              entity.hp = cardData.hp || null;
              entity.retreatCost = cardData.retreatCost || null;
              entity.weakness = cardData.weakness || null;
              entity.resistance = cardData.resistance || null;
              entity.attacks = cardData.attacks || [];
              entity.ability = cardData.ability || null;
              entity.rulesText = cardData.rulesText || null;
              entity.cardRules = cardData.cardRules || [];
              entity.trainerType = cardData.trainerType || null;
              entity.trainerEffects = cardData.trainerEffects || [];
              entity.energyType = cardData.energyType || null;
              entity.energyProvision = cardData.energyProvision || null;
              entity.description = cardData.description || '';
              entity.artist = cardData.artist || 'Unknown';
              entity.imageUrl = cardData.imageUrl || '';
              entity.regulationMark = cardData.regulationMark || null;
              return entity;
            });

            // Bulk insert with chunking for large datasets
            const chunkSize = 100;
            for (let i = 0; i < cardEntities.length; i += chunkSize) {
              const chunk = cardEntities.slice(i, i + chunkSize);
              
              // Skip existing cards if flag is set
              if (migrationConfig.options.skipExisting) {
                const existingIds = await this.dataSource
                  .getRepository(CardOrmEntity)
                  .find({
                    where: chunk.map(c => ({ instanceId: c.instanceId })),
                    select: ['instanceId'],
                  });
                
                const existingIdSet = new Set(existingIds.map(e => e.instanceId));
                const newCards = chunk.filter(c => !existingIdSet.has(c.instanceId));
                
                if (newCards.length > 0) {
                  await this.dataSource.getRepository(CardOrmEntity).save(newCards);
                  this.stats.cards.success += newCards.length;
                }
                this.stats.cards.skipped += (chunk.length - newCards.length);
              } else {
                await this.dataSource.getRepository(CardOrmEntity).save(chunk);
                this.stats.cards.success += chunk.length;
              }
            }
          } else {
            // Dry run - just count
            this.stats.cards.success += cardsData.length;
          }
          
          if (migrationConfig.options.verbose) {
            console.log(`  ✅ Cards from ${setName}: ${cardsData.length}`);
          }
        } catch (error) {
          this.stats.cards.failed++;
          console.error(`  ❌ Failed to migrate cards from ${file}:`, error.message);
          if (migrationConfig.options.verbose) {
            console.error(`     Error details:`, error);
          }
        }
      }

      console.log(`✅ Cards migrated: ${this.stats.cards.success}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('⚠️  No cards directory found, skipping...\n');
      } else {
        throw error;
      }
    }
  }

  /**
   * Migrate Tournaments
   */
  private async migrateTournaments(): Promise<void> {
    console.log('🏆 Migrating Tournaments...');

    try {
      const files = await fs.readdir(migrationConfig.dataPaths.tournaments);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = join(migrationConfig.dataPaths.tournaments, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const json = JSON.parse(data);

          if (!migrationConfig.options.dryRun) {
            const tournamentEntity = this.dataSource.getRepository(TournamentOrmEntity).create({
              id: json.id,
              name: json.name,
              version: json.version,
              description: json.description,
              author: json.author,
              createdAt: new Date(json.createdAt),
              updatedAt: new Date(json.updatedAt),
              official: json.official,
              status: json.status,
              bannedSets: json.bannedSets || [],
              setBannedCards: json.setBannedCards || {},
              deckRules: json.deckRules,
              startGameRules: json.startGameRules,
              savedDecks: json.savedDecks || [],
              startDate: json.startDate ? new Date(json.startDate) : null,
              endDate: json.endDate ? new Date(json.endDate) : null,
              maxParticipants: json.maxParticipants || null,
              format: json.format || null,
              regulationMarks: json.regulationMarks || [],
              prizeCardCount: json.prizeCardCount || 6,
            });

            await this.dataSource.getRepository(TournamentOrmEntity).save(tournamentEntity);
          }

          this.stats.tournaments.success++;
          if (migrationConfig.options.verbose) {
            console.log(`  ✅ Tournament: ${json.name}`);
          }
        } catch (error) {
          this.stats.tournaments.failed++;
          console.error(`  ❌ Failed to migrate tournament from ${file}:`, error.message);
        }
      }

      console.log(`✅ Tournaments migrated: ${this.stats.tournaments.success}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('⚠️  No tournaments directory found, skipping...\n');
      } else {
        throw error;
      }
    }
  }

  /**
   * Migrate Decks
   */
  private async migrateDecks(): Promise<void> {
    console.log('📚 Migrating Decks...');

    try {
      const files = await fs.readdir(migrationConfig.dataPaths.decks);
      const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

      for (const file of jsonFiles) {
        try {
          const filePath = join(migrationConfig.dataPaths.decks, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const json = JSON.parse(data);

          if (!migrationConfig.options.dryRun) {
            // Reconstruct domain entity using constructor
            const deck = new Deck(
              json.id,
              json.name,
              json.createdBy,
              json.cards.map((c: any) => new DeckCard(c.cardId, c.setName, c.quantity)),
              new Date(json.createdAt),
              json.tournamentId,
              json.cardBackImageUrl,
            );
            deck.setValid(json.isValid);

            // Convert to ORM entity and save
            const ormEntity = DeckOrmMapper.toOrm(deck);

            // Skip if exists and flag is set
            if (migrationConfig.options.skipExisting) {
              const exists = await this.dataSource.getRepository(DeckOrmEntity).findOne({
                where: { id: ormEntity.id },
              });
              if (exists) {
                this.stats.decks.skipped++;
                continue;
              }
            }

            await this.dataSource.getRepository(DeckOrmEntity).save(ormEntity);
          }

          this.stats.decks.success++;
          if (migrationConfig.options.verbose) {
            console.log(`  ✅ Deck: ${json.name}`);
          }
        } catch (error) {
          this.stats.decks.failed++;
          console.error(`  ❌ Failed to migrate deck from ${file}:`, error.message);
          if (migrationConfig.options.verbose) {
            console.error(`     Error details:`, error);
          }
        }
      }

      console.log(`✅ Decks migrated: ${this.stats.decks.success}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('⚠️  No decks directory found, skipping...\n');
      } else {
        throw error;
      }
    }
  }

  /**
   * Migrate Matches
   */
  private async migrateMatches(): Promise<void> {
    console.log('⚔️  Migrating Matches...');

    try {
      const files = await fs.readdir(migrationConfig.dataPaths.matches);
      const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

      for (const file of jsonFiles) {
        try {
          const filePath = join(migrationConfig.dataPaths.matches, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const json = JSON.parse(data);

          if (!migrationConfig.options.dryRun) {
            // Use MatchMapper to properly convert JSON to domain entity
            // This handles gameState conversion (Maps, Sets, etc.)
            const match = MatchMapper.toDomain(json);

            // Convert to ORM entity and save
            const ormEntity = MatchOrmMapper.toOrm(match);

            // Skip if exists and flag is set
            if (migrationConfig.options.skipExisting) {
              const exists = await this.dataSource.getRepository(MatchOrmEntity).findOne({
                where: { id: ormEntity.id },
              });
              if (exists) {
                this.stats.matches.skipped++;
                continue;
              }
            }

            await this.dataSource.getRepository(MatchOrmEntity).save(ormEntity);
          }

          this.stats.matches.success++;
          
          if (migrationConfig.options.verbose) {
            console.log(`  ✅ Match: ${json.id}`);
          }
        } catch (error) {
          this.stats.matches.failed++;
          console.error(`  ❌ Failed to migrate match from ${file}:`, error.message);
          if (migrationConfig.options.verbose) {
            console.error(`     Error details:`, error);
          }
        }
      }

      console.log(`✅ Matches migrated: ${this.stats.matches.success}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('⚠️  No matches directory found, skipping...\n');
      } else {
        throw error;
      }
    }
  }

  /**
   * Print migration summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));

    const total = {
      success:
        this.stats.sets.success +
        this.stats.cards.success +
        this.stats.tournaments.success +
        this.stats.decks.success +
        this.stats.matches.success,
      failed:
        this.stats.sets.failed +
        this.stats.cards.failed +
        this.stats.tournaments.failed +
        this.stats.decks.failed +
        this.stats.matches.failed,
      skipped:
        this.stats.sets.skipped +
        this.stats.cards.skipped +
        this.stats.tournaments.skipped +
        this.stats.decks.skipped +
        this.stats.matches.skipped,
    };

    console.log(`\nSets:        ${this.stats.sets.success} ✅ ${this.stats.sets.failed} ❌ ${this.stats.sets.skipped} ⊘`);
    console.log(`Cards:       ${this.stats.cards.success} ✅ ${this.stats.cards.failed} ❌ ${this.stats.cards.skipped} ⊘`);
    console.log(`Tournaments: ${this.stats.tournaments.success} ✅ ${this.stats.tournaments.failed} ❌ ${this.stats.tournaments.skipped} ⊘`);
    console.log(`Decks:       ${this.stats.decks.success} ✅ ${this.stats.decks.failed} ❌ ${this.stats.decks.skipped} ⊘`);
    console.log(`Matches:     ${this.stats.matches.success} ✅ ${this.stats.matches.failed} ❌ ${this.stats.matches.skipped} ⊘`);
    console.log(`\nTOTAL:       ${total.success} ✅ ${total.failed} ❌ ${total.skipped} ⊘`);

    if (total.failed === 0) {
      console.log('\n✨ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${total.failed} errors`);
    }
  }
}

// Run migration
const migration = new DataMigration();
migration.migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

