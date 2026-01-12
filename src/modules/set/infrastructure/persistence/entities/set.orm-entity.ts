import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
} from 'typeorm';

/**
 * Set ORM Entity
 * Database representation of a Set domain entity
 */
@Entity('sets')
export class SetOrmEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  name: string;

  @Column({ type: 'varchar' })
  series: string;

  @Column({ type: 'varchar' })
  releaseDate: string;

  @Column({ type: 'integer' })
  totalCards: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  @Index()
  official: boolean;

  @Column({ type: 'varchar' })
  @Index()
  ownerId: string;

  @Column({ type: 'text', nullable: true })
  symbolUrl: string | null;

  @Column({ type: 'text', nullable: true })
  logoUrl: string | null;
}

