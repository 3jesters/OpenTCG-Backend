import { Injectable, Inject } from '@nestjs/common';
import { IAuthService } from '../../domain/services/auth.service.interface';
import { User } from '../../../user/domain/entities/user.entity';
import { FindOrCreateUserUseCase, GoogleProfile } from '../../../user/application/use-cases/find-or-create-user.use-case';

/**
 * Google OAuth Authentication Service
 * Handles Google OAuth authentication
 */
@Injectable()
export class GoogleOAuthAuthService implements IAuthService {
  constructor(
    private readonly findOrCreateUserUseCase: FindOrCreateUserUseCase,
  ) {}

  async authenticate(credentials: { profile: GoogleProfile }): Promise<User> {
    return await this.findOrCreateUserUseCase.execute(credentials.profile);
  }

  getAuthMethod(): string {
    return 'google-oauth';
  }
}
