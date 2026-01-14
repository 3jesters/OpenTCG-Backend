import { Injectable, Inject } from '@nestjs/common';
import { ITokenRepository } from '../../domain/repositories/token.repository.interface';

/**
 * Logout Use Case
 * Invalidates refresh token
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(ITokenRepository)
    private readonly tokenRepository: ITokenRepository,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    await this.tokenRepository.deleteByToken(refreshToken);
  }

  async executeByUserId(userId: string): Promise<void> {
    await this.tokenRepository.deleteByUserId(userId);
  }
}
