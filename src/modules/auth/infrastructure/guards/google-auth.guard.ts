import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google Auth Guard
 * Protects Google OAuth routes
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
