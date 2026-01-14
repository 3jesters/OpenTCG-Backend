import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService, TokenPair } from '../../infrastructure/services/jwt.service';
import { ITokenRepository } from '../../domain/repositories/token.repository.interface';
import { IUserRepository } from '../../../user/domain/repositories/user.repository.interface';
import { RefreshToken } from '../../domain/entities/token.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Refresh Token Use Case
 * Validates refresh token and issues new access token
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(ITokenRepository)
    private readonly tokenRepository: ITokenRepository,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(refreshTokenString: string): Promise<TokenPair> {
    // Verify refresh token
    let payload;
    try {
      payload = this.jwtService.verifyRefreshToken(refreshTokenString);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find refresh token in database
    const refreshToken = await this.tokenRepository.findByToken(refreshTokenString);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Check if token is expired
    if (refreshToken.isExpired()) {
      await this.tokenRepository.deleteByToken(refreshTokenString);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Verify user still exists
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      await this.tokenRepository.deleteByToken(refreshTokenString);
      throw new UnauthorizedException('User not found');
    }

    // Generate new token pair
    const tokens = this.jwtService.generateTokenPair({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Delete old refresh token
    await this.tokenRepository.deleteByToken(refreshTokenString);

    // Save new refresh token
    const refreshTokenExpiration = this.calculateRefreshTokenExpiration();
    const newRefreshToken = RefreshToken.create(
      uuidv4(),
      user.id,
      tokens.refreshToken,
      refreshTokenExpiration,
    );

    await this.tokenRepository.save(newRefreshToken);

    return tokens;
  }

  private calculateRefreshTokenExpiration(): Date {
    const expirationDays = 7;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return expirationDate;
  }
}
