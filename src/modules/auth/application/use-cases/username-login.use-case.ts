import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../../user/domain/entities/user.entity';
import { JwtService, TokenPair } from '../../infrastructure/services/jwt.service';
import { ITokenRepository } from '../../domain/repositories/token.repository.interface';
import { ITokenRepository as ITokenRepositorySymbol } from '../../domain/repositories/token.repository.interface';
import { IAuthService } from '../../domain/services/auth.service.interface';
import { IAuthService as IAuthServiceSymbol } from '../../domain/services/auth.service.interface';
import { RefreshToken } from '../../domain/entities/token.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Username Login Use Case
 * Handles username-based authentication for development
 */
@Injectable()
export class UsernameLoginUseCase {
  constructor(
    @Inject(IAuthServiceSymbol)
    private readonly authService: IAuthService,
    private readonly jwtService: JwtService,
    @Inject(ITokenRepositorySymbol)
    private readonly tokenRepository: ITokenRepository,
  ) {}

  async execute(username: string): Promise<{ user: User; tokens: TokenPair }> {
    // Authenticate user
    const user = await this.authService.authenticate({ username });

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
    const expirationDays = 7;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return expirationDate;
  }
}
