# Authentication Methods

## Overview

The Auth module supports multiple authentication methods through dependency injection. The system automatically selects the appropriate method based on the environment configuration.

## Supported Methods

### 1. Google OAuth (Production/Staging)

**When used**: `NODE_ENV` is `staging` or `production`, or `AUTH_METHOD` is not set to `username`

**Implementation**: `GoogleOAuthAuthService`

**Flow**:
1. User initiates OAuth via `/api/v1/auth/google`
2. Redirects to Google for authentication
3. Google redirects back with authorization code
4. System exchanges code for user profile
5. User is created or found in database
6. JWT tokens are issued

### 2. Username Authentication (Development)

**When used**: `NODE_ENV` is `dev` or `test`, OR `AUTH_METHOD=username`

**Implementation**: `UsernameAuthService`

**Flow**:
1. User sends username to `/api/v1/auth/login/username`
2. System finds or creates user with that username
3. JWT tokens are issued

**Note**: This is for development/testing only. Users are created automatically with:
- `googleId`: `dev-{username}` (normalized to lowercase)
- `email`: `{username}` (normalized to lowercase)
- `name`: `{username}` (original case preserved)

## Configuration

### Environment Variables

```env
# Select authentication method
# Options: 'username' or 'google-oauth' (default based on NODE_ENV)
AUTH_METHOD=username

# Or rely on NODE_ENV
NODE_ENV=dev  # Uses username auth
NODE_ENV=staging  # Uses Google OAuth
NODE_ENV=production  # Uses Google OAuth
```

### Dependency Injection

The `AuthModule` uses dependency injection to select the authentication service:

```typescript
{
  provide: IAuthService,
  useClass: useUsernameAuth ? UsernameAuthService : GoogleOAuthAuthService,
}
```

## API Endpoints

### Username Login (Development)

```
POST /api/v1/auth/login/username
Content-Type: application/json

{
  "username": "testuser"
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "testuser",
    "name": "testuser",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Google OAuth Login (Production)

```
GET /api/v1/auth/google
```

See `AUTHENTICATION.md` for full Google OAuth flow.

## Architecture

### Interface

```typescript
interface IAuthService {
  authenticate(credentials: any): Promise<User>;
  getAuthMethod(): string;
}
```

### Implementations

- **GoogleOAuthAuthService**: Uses `FindOrCreateUserUseCase` with Google profile
- **UsernameAuthService**: Uses `IUserRepository` directly to create/find users by username

### Strategy Pattern

The authentication method is selected at module initialization time based on environment configuration. All authentication flows (Google OAuth strategy, username login use case) use the same `IAuthService` interface, ensuring consistent behavior regardless of the implementation.

## Migration

To switch from username auth to Google OAuth:

1. Set `NODE_ENV=staging` or `NODE_ENV=production`
2. OR set `AUTH_METHOD=google-oauth`
3. Configure Google OAuth credentials in `.env`
4. Restart the application

The system will automatically use Google OAuth authentication.
