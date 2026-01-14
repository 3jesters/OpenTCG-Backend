import { User } from '../entities/user.entity';

/**
 * User Repository Interface
 * Defines the contract for user persistence
 * Implementations are in the infrastructure layer
 */
export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by Google ID
   */
  findByGoogleId(googleId: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Save user (create or update)
   */
  save(user: User): Promise<User>;

  /**
   * Delete user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if user exists by ID
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Symbol for dependency injection
 */
export const IUserRepository = Symbol('IUserRepository');
