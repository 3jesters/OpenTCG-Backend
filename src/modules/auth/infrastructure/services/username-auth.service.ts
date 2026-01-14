import { Injectable, Inject } from '@nestjs/common';
import { IAuthService } from '../../domain/services/auth.service.interface';
import { User } from '../../../user/domain/entities/user.entity';
import { IUserRepository } from '../../../user/domain/repositories/user.repository.interface';
import { IUserRepository as IUserRepositorySymbol } from '../../../user/domain/repositories/user.repository.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Username Authentication Service
 * Simple development authentication using just username
 * Creates or finds user by username (for dev/testing only)
 */
@Injectable()
export class UsernameAuthService implements IAuthService {
  constructor(
    @Inject(IUserRepositorySymbol)
    private readonly userRepository: IUserRepository,
  ) {}

  async authenticate(credentials: { username: string }): Promise<User> {
    const { username } = credentials;

    if (!username || username.trim().length === 0) {
      throw new Error('Username is required');
    }

    // For dev mode, create a simple user from username
    // Use username as both email and name for simplicity
    const normalizedUsername = username.trim().toLowerCase();

    // Try to find existing user by email (using username as email in dev mode)
    let user = await this.userRepository.findByEmail(normalizedUsername);

    if (!user) {
      // Create new user with username
      // In dev mode, we use username as googleId (prefixed with 'dev-')
      const devGoogleId = `dev-${normalizedUsername}`;
      
      // Check if user exists with this dev Google ID
      user = await this.userRepository.findByGoogleId(devGoogleId);

      if (!user) {
        // Create new user
        user = User.createFromGoogleProfile(
          uuidv4(),
          devGoogleId,
          normalizedUsername, // email
          username, // name
        );

        user = await this.userRepository.save(user);
      }
    }

    return user;
  }

  getAuthMethod(): string {
    return 'username';
  }
}
