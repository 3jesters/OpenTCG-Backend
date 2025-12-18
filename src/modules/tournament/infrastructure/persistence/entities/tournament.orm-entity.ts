import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TournamentStatus } from '../../../domain/enums';

/**
 * Tournament ORM Entity
 * Database representation of a Tournament domain entity
 * Uses JSONB for complex nested objects
 */
@Entity('tournaments')
export class TournamentOrmEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  version: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  author: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: false })
  @Index()
  official: boolean;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  @Index()
  status: TournamentStatus;

  @Column({ type: 'simple-array', default: '' })
  bannedSets: string[];

  @Column({ type: 'jsonb', default: {} })
  setBannedCards: Record<string, string[]>;

  @Column({ type: 'jsonb' })
  deckRules: {
    minDeckSize: number;
    maxDeckSize: number;
    exactDeckSize: boolean;
    maxCopiesPerCard: number;
    minBasicPokemon: number;
    restrictedCards: Array<{
      setName: string;
      cardId: string;
      maxCopies: number;
    }>;
  };

  @Column({ type: 'jsonb' })
  startGameRules: {
    rules: Array<{
      type: string;
      minCount: number;
    }>;
  };

  @Column({ type: 'simple-array', default: '' })
  savedDecks: string[];

  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @Column({ type: 'integer', nullable: true })
  maxParticipants: number | null;

  @Column({ type: 'varchar', nullable: true })
  format: string | null;

  @Column({ type: 'simple-array', default: '' })
  regulationMarks: string[];

  @Column({ type: 'integer', default: 6 })
  prizeCardCount: number;
}

