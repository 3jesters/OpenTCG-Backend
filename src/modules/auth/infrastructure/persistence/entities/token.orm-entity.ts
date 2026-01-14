import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Refresh Token ORM Entity
 * Database representation of a RefreshToken domain entity
 */
@Entity('refresh_tokens')
export class RefreshTokenOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  userId: string;

  @Column({ type: 'text', unique: true })
  @Index()
  token: string;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
