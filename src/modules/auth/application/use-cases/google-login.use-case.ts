import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../../user/domain/entities/user.entity';
import { JwtService, TokenPair } from '../../infrastructure/services/jwt.service';
import { ITokenRepository } from '../../domain/repositories/token.repository.interface';
import { RefreshToken } from '../../domain/entities/token.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Google Login Use Case
 * Handles Google OAuth callback and generates tokens
 */
@Injectable()
export class GoogleLoginUseCase {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(ITokenRepository)
    private readonly tokenRepository: ITokenRepository,
  ) {}

  async execute(user: User): Promise<{ user: User; tokens: TokenPair }> {
    // Generate token pair
    const tokens = this.jwtService.generateTokenPair({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Calculate refresh token expiration
    const refreshTokenExpiration = this.calculateRefreshTokenExpiration();

    // Save refresh token
    const refreshTokenEntity = RefreshToken.create(
      uuidv4(),
      user.id,
      tokens.refreshToken,
      refreshTokenExpiration,
    );

    await this.tokenRepository.save(refreshTokenEntity);

    return { user, tokens };
  }

  private calculateRefreshTokenExpiration(): Date {
    // Default to 7 days if not configured
    const expirationDays = 7;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return expirationDate;
  }
}
