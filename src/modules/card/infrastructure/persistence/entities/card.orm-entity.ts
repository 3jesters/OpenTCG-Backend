import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
} from 'typeorm';
import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  TrainerType,
  EnergyType,
} from '../../../domain/enums';

/**
 * Card ORM Entity
 * Database representation of a Card domain entity
 * Uses JSONB for complex nested objects (attacks, abilities, etc.)
 */
@Entity('cards')
export class CardOrmEntity {
  // ========================================
  // Identity & Cataloging
  // ========================================
  @PrimaryColumn('varchar')
  instanceId: string;

  @Column({ type: 'varchar' })
  cardId: string;

  @Column({ type: 'varchar', nullable: true })
  pokemonNumber: string | null;

  @Column({ type: 'varchar' })
  @Index()
  name: string;

  @Column({ type: 'varchar' })
  @Index()
  setName: string;

  @Column({ type: 'varchar' })
  cardNumber: string;

  @Column({
    type: 'enum',
    enum: Rarity,
  })
  rarity: Rarity;

  // ========================================
  // Card Type & Classification
  // ========================================
  @Column({
    type: 'enum',
    enum: CardType,
  })
  @Index()
  cardType: CardType;

  @Column({
    type: 'enum',
    enum: PokemonType,
    nullable: true,
  })
  pokemonType: PokemonType | null;

  @Column({
    type: 'enum',
    enum: EvolutionStage,
    nullable: true,
  })
  stage: EvolutionStage | null;

  @Column({ type: 'simple-array', default: '' })
  subtypes: string[];

  // ========================================
  // Evolution Chain (JSONB)
  // ========================================
  @Column({ type: 'jsonb', nullable: true })
  evolvesFrom: {
    pokemonNumber: string;
    stage: EvolutionStage;
    condition?: string;
  } | null;

  @Column({ type: 'jsonb', default: [] })
  evolvesTo: Array<{
    pokemonNumber: string;
    stage: EvolutionStage;
    condition?: string;
  }>;

  // ========================================
  // Battle Stats
  // ========================================
  @Column({ type: 'integer', nullable: true })
  hp: number | null;

  @Column({ type: 'integer', nullable: true })
  retreatCost: number | null;

  // ========================================
  // Combat Modifiers (JSONB)
  // ========================================
  @Column({ type: 'jsonb', nullable: true })
  weakness: {
    type: PokemonType;
    modifier: string;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  resistance: {
    type: PokemonType;
    modifier: string;
  } | null;

  // ========================================
  // Actions & Abilities (JSONB)
  // ========================================
  @Column({ type: 'jsonb', default: [] })
  attacks: Array<{
    name: string;
    energyCost: string[];
    damage: number;
    description: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  ability: {
    name: string;
    description: string;
    type: string;
  } | null;

  // ========================================
  // Rules & Effects
  // ========================================
  @Column({ type: 'text', nullable: true })
  rulesText: string | null;

  @Column({ type: 'jsonb', nullable: true })
  cardRules: Array<{
    type: string;
    priority: number;
    condition?: string;
    effect: string;
  }> | null;

  // ========================================
  // Trainer Card Specific
  // ========================================
  @Column({
    type: 'enum',
    enum: TrainerType,
    nullable: true,
  })
  trainerType: TrainerType | null;

  @Column({ type: 'jsonb', default: [] })
  trainerEffects: Array<{
    type: string;
    description: string;
    condition?: string;
  }>;

  // ========================================
  // Energy Card Specific
  // ========================================
  @Column({
    type: 'enum',
    enum: EnergyType,
    nullable: true,
  })
  energyType: EnergyType | null;

  @Column({ type: 'jsonb', nullable: true })
  energyProvision: {
    provides: string[];
    isSpecial: boolean;
    specialEffect?: string;
  } | null;

  // ========================================
  // Metadata
  // ========================================
  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  artist: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @Column({ type: 'varchar', nullable: true })
  regulationMark: string | null;

  // ========================================
  // Editor Metadata
  // ========================================
  @Column({ type: 'varchar', nullable: true })
  @Index()
  createdBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @Column({ type: 'boolean', default: false })
  @Index()
  isEditorCreated: boolean;
}

