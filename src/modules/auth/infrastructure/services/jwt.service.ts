import { Injectable, Inject } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Token Pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT Service
 * Handles JWT token generation and validation
 */
@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(payload: { sub: string; email: string; name: string }): string {
    const expiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m');
    // StringValue type from 'ms' package - valid time strings like "15m", "7d"
    return this.jwtService.sign(payload, { expiresIn: expiresIn as any });
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(payload: { sub: string }): string {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d');
    // StringValue type from 'ms' package - valid time strings like "15m", "7d"
    return this.jwtService.sign(payload, { expiresIn: expiresIn as any });
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(user: { id: string; email: string; name: string }): TokenPair {
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    const refreshToken = this.generateRefreshToken({
      sub: user.id,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }
}
