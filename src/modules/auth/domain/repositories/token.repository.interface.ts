import { RefreshToken } from '../entities/token.entity';

/**
 * Token Repository Interface
 * Defines the contract for refresh token persistence
 * Implementations are in the infrastructure layer
 */
export interface ITokenRepository {
  /**
   * Find refresh token by token string
   */
  findByToken(token: string): Promise<RefreshToken | null>;

  /**
   * Find refresh token by user ID
   */
  findByUserId(userId: string): Promise<RefreshToken | null>;

  /**
   * Save refresh token (create or update)
   */
  save(token: RefreshToken): Promise<RefreshToken>;

  /**
   * Delete refresh token by token string
   */
  deleteByToken(token: string): Promise<void>;

  /**
   * Delete all refresh tokens for a user
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Delete expired tokens
   */
  deleteExpired(): Promise<number>;
}

/**
 * Symbol for dependency injection
 */
export const ITokenRepository = Symbol('ITokenRepository');
