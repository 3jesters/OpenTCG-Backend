import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './presentation/controllers/auth.controller';
import { GoogleLoginUseCase } from './application/use-cases/google-login.use-case';
import { UsernameLoginUseCase } from './application/use-cases/username-login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtService } from './infrastructure/services/jwt.service';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { GoogleAuthGuard } from './infrastructure/guards/google-auth.guard';
import { ITokenRepository } from './domain/repositories/token.repository.interface';
import { TypeOrmTokenRepository } from './infrastructure/persistence/repositories/token.repository';
import { FileSystemTokenRepository } from './infrastructure/persistence/filesystem-token.repository';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/entities/token.orm-entity';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import { UserModule } from '../user/user.module';
import { IAuthService } from './domain/services/auth.service.interface';
import { GoogleOAuthAuthService } from './infrastructure/services/google-oauth-auth.service';
import { UsernameAuthService } from './infrastructure/services/username-auth.service';
import { FindOrCreateUserUseCase } from '../user/application/use-cases/find-or-create-user.use-case';

const nodeEnv = process.env.NODE_ENV || 'dev';
// TEMPORARY: Force file system mode for all environments (including production)
const shouldInitializeDb = false; // nodeEnv !== 'dev' && nodeEnv !== 'test';
// Select auth method based on environment or config
// Use username auth for dev/test, Google OAuth for staging/production
const useUsernameAuth = nodeEnv === 'dev' || nodeEnv === 'test' || process.env.AUTH_METHOD === 'username';

/**
 * Auth Module
 * Handles authentication and authorization
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }
        const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m');
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any, // StringValue type from 'ms' package - valid time strings like "15m", "7d"
          },
        };
      },
    }),
    UserModule,
    ...(shouldInitializeDb
      ? [TypeOrmModule.forFeature([RefreshTokenOrmEntity]), DatabaseModule]
      : []),
  ],
  controllers: [AuthController],
  providers: [
    // Auth Service - dependency injection based on environment
    {
      provide: IAuthService,
      useClass: useUsernameAuth ? UsernameAuthService : GoogleOAuthAuthService,
    },
    // Both auth service implementations (for dependency injection)
    GoogleOAuthAuthService,
    UsernameAuthService,
    // Strategies
    GoogleStrategy,
    JwtStrategy,
    // Services
    JwtService,
    // Guards
    JwtAuthGuard,
    GoogleAuthGuard,
    // Repository
    {
      provide: ITokenRepository,
      useClass:
        // TEMPORARY: Always use file system
        FileSystemTokenRepository, // nodeEnv === 'dev' || nodeEnv === 'test' ? FileSystemTokenRepository : TypeOrmTokenRepository,
    },
    // Use cases
    GoogleLoginUseCase,
    UsernameLoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
  exports: [JwtAuthGuard, JwtService, PassportModule],
})
export class AuthModule {}
