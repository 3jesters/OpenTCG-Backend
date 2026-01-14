import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { IAuthService } from '../../domain/services/auth.service.interface';
import { IAuthService as IAuthServiceSymbol } from '../../domain/services/auth.service.interface';
import { GoogleProfile } from '../../../user/application/use-cases/find-or-create-user.use-case';

/**
 * Google OAuth Strategy
 * Handles Google OAuth 2.0 authentication flow
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(IAuthServiceSymbol)
    private readonly authService: IAuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Google OAuth credentials are required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Transform Google profile to our format
      const googleProfile: GoogleProfile = {
        id: profile.id,
        emails: profile.emails || [],
        displayName: profile.displayName || profile.name?.givenName || 'User',
        photos: profile.photos || [],
      };

      // Authenticate using auth service
      const user = await this.authService.authenticate({ profile: googleProfile });

      // Return user to be attached to request
      done(null, user);
    } catch (error) {
      done(error as Error, false);
    }
  }
}
