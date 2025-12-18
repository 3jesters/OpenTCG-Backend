import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Deck ORM Entity
 * Database representation of a Deck domain entity
 * Uses JSONB for cards array
 */
@Entity('decks')
export class DeckOrmEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'jsonb' })
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;

  @Column({ type: 'varchar' })
  @Index()
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  tournamentId: string | null;

  @Column({ type: 'boolean', default: false })
  isValid: boolean;

  @Column({ type: 'text' })
  cardBackImageUrl: string;
}

