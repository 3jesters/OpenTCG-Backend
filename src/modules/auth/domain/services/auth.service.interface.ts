import { User } from '../../../user/domain/entities/user.entity';
import { TokenPair } from '../../infrastructure/services/jwt.service';

/**
 * Authentication Service Interface
 * Defines the contract for authentication implementations
 */
export interface IAuthService {
  /**
   * Authenticate a user and return user entity
   * @param credentials - Authentication credentials (varies by implementation)
   * @returns User entity
   */
  authenticate(credentials: any): Promise<User>;

  /**
   * Get the authentication method name
   */
  getAuthMethod(): string;
}

/**
 * Symbol for dependency injection
 */
export const IAuthService = Symbol('IAuthService');
