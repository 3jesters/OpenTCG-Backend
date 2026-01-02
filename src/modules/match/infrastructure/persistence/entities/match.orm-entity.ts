import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  MatchState,
  MatchResult,
  PlayerIdentifier,
  WinCondition,
  PlayerType,
} from '../../../domain/enums';
import { GameStateJson } from '../match.mapper';

/**
 * Match ORM Entity
 * Database representation of a Match domain entity
 * Uses jsonb for gameState to leverage PostgreSQL's JSON capabilities
 */
@Entity('matches')
export class MatchOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  tournamentId: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  player1Id: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  player2Id: string | null;

  @Column({ type: 'varchar', nullable: true })
  player1DeckId: string | null;

  @Column({ type: 'varchar', nullable: true })
  player2DeckId: string | null;

  @Column({
    type: 'enum',
    enum: PlayerType,
    nullable: true,
  })
  player1Type: PlayerType | null;

  @Column({
    type: 'enum',
    enum: PlayerType,
    nullable: true,
  })
  player2Type: PlayerType | null;

  @Column({
    type: 'enum',
    enum: MatchState,
  })
  @Index()
  state: MatchState;

  @Column({
    type: 'enum',
    enum: PlayerIdentifier,
    nullable: true,
  })
  currentPlayer: PlayerIdentifier | null;

  @Column({
    type: 'enum',
    enum: PlayerIdentifier,
    nullable: true,
  })
  firstPlayer: PlayerIdentifier | null;

  @Column({ type: 'boolean', default: false })
  player1HasDrawnValidHand: boolean;

  @Column({ type: 'boolean', default: false })
  player2HasDrawnValidHand: boolean;

  @Column({ type: 'boolean', default: false })
  player1HasSetPrizeCards: boolean;

  @Column({ type: 'boolean', default: false })
  player2HasSetPrizeCards: boolean;

  @Column({ type: 'boolean', default: false })
  player1ReadyToStart: boolean;

  @Column({ type: 'boolean', default: false })
  player2ReadyToStart: boolean;

  @Column({ type: 'boolean', default: false })
  player1HasConfirmedFirstPlayer: boolean;

  @Column({ type: 'boolean', default: false })
  player2HasConfirmedFirstPlayer: boolean;

  @Column({ type: 'boolean', default: false })
  player1HasApprovedMatch: boolean;

  @Column({ type: 'boolean', default: false })
  player2HasApprovedMatch: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  winnerId: string | null;

  @Column({
    type: 'enum',
    enum: MatchResult,
    nullable: true,
  })
  result: MatchResult | null;

  @Column({
    type: 'enum',
    enum: WinCondition,
    nullable: true,
  })
  winCondition: WinCondition | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  gameState: GameStateJson | null;
}

