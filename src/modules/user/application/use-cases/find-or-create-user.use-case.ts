import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Google Profile DTO
 */
export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified?: boolean }>;
  displayName: string;
  photos?: Array<{ value: string }>;
}

/**
 * Find or Create User Use Case
 * Finds an existing user by Google ID or creates a new one
 */
@Injectable()
export class FindOrCreateUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(profile: GoogleProfile): Promise<User> {
    // Try to find existing user by Google ID
    let user = await this.userRepository.findByGoogleId(profile.id);

    if (user) {
      // Update profile if needed
      const email = profile.emails?.[0]?.value || '';
      const name = profile.displayName || '';
      const picture = profile.photos?.[0]?.value;

      // Update if information has changed
      if (user.email !== email || user.name !== name || user.picture !== picture) {
        user.updateEmail(email);
        user.updateProfile(name, picture);
        user = await this.userRepository.save(user);
      }

      return user;
    }

    // Try to find by email in case Google ID changed
    const email = profile.emails?.[0]?.value || '';
    if (email) {
      user = await this.userRepository.findByEmail(email);
      if (user) {
        // Update Google ID if user exists but with different Google ID
        // This shouldn't happen normally, but handle it gracefully
        return user;
      }
    }

    // Create new user
    const newUser = User.createFromGoogleProfile(
      uuidv4(),
      profile.id,
      email,
      profile.displayName || 'User',
      profile.photos?.[0]?.value,
    );

    return await this.userRepository.save(newUser);
  }
}
