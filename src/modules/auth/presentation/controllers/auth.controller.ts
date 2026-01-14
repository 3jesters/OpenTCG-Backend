import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from '../../infrastructure/guards/google-auth.guard';
import { CurrentUser } from '../../infrastructure/decorators/current-user.decorator';
import { User } from '../../../user/domain/entities/user.entity';
import { GoogleLoginUseCase } from '../../application/use-cases/google-login.use-case';
import { UsernameLoginUseCase } from '../../application/use-cases/username-login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { AuthResponseDto, TokenRefreshResponseDto } from '../dto/auth-response.dto';
import { UserResponseDto } from '../../../user/presentation/dto/user-response.dto';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Refresh Token Request DTO
 */
class RefreshTokenDto {
  refreshToken: string;
}

/**
 * Username Login Request DTO
 */
class UsernameLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;
}

/**
 * Auth Controller
 * Handles authentication endpoints
 */
@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly googleLoginUseCase: GoogleLoginUseCase,
    private readonly usernameLoginUseCase: UsernameLoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate Google OAuth flow
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * Handle Google OAuth callback
   * Redirects to frontend with tokens in URL hash for secure client-side handling
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.googleLoginUseCase.execute(user);

    // Get frontend URL from environment variable (defaults to localhost:3001)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    
    // Convert user to DTO
    const userDto = UserResponseDto.fromDomain(result.user);
    
    // Encode tokens and user data for URL
    const accessToken = encodeURIComponent(result.tokens.accessToken);
    const refreshToken = encodeURIComponent(result.tokens.refreshToken);
    const userData = encodeURIComponent(JSON.stringify(userDto));

    // Redirect to frontend with tokens in hash fragment
    // Hash fragments are not sent to server, only accessible client-side (more secure)
    const redirectUrl = `${frontendUrl}/auth/callback#accessToken=${accessToken}&refreshToken=${refreshToken}&user=${userData}`;
    
    res.redirect(redirectUrl);
  }

  /**
   * Username login (development only)
   * Simple authentication using just username for local development
   */
  @Post('login/username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username (development only)' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid username' })
  async usernameLogin(@Body() dto: UsernameLoginDto): Promise<AuthResponseDto> {
    const result = await this.usernameLoginUseCase.execute(dto.username);
    return {
      user: UserResponseDto.fromDomain(result.user),
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenRefreshResponseDto> {
    const tokens = await this.refreshTokenUseCase.execute(dto.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout (invalidate refresh token)
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }
}
