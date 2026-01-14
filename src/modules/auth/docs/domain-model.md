# Auth Module Domain Model

## Entities

### RefreshToken

Represents a refresh token stored in the database.

**Properties**:
- `id`: Unique identifier (UUID)
- `userId`: ID of the user who owns the token
- `token`: The refresh token string
- `expiresAt`: Token expiration date
- `createdAt`: Token creation timestamp

**Business Logic**:
- `isExpired()`: Checks if token has expired
- `isValid()`: Checks if token is still valid (not expired)

**Validation**:
- User ID is required
- Token string is required
- Expiration date must be after creation date

## Value Objects

### JwtPayload

Represents the payload of a JWT token.

**Properties**:
- `sub`: User ID (subject)
- `email`: User email address
- `name`: User display name
- `iat`: Issued at timestamp (optional)
- `exp`: Expiration timestamp (optional)

## Services

### JwtService

Handles JWT token generation and validation.

**Methods**:
- `generateAccessToken(payload)`: Generates short-lived access token
- `generateRefreshToken(payload)`: Generates long-lived refresh token
- `generateTokenPair(user)`: Generates both tokens for a user
- `verifyAccessToken(token)`: Validates and decodes access token
- `verifyRefreshToken(token)`: Validates and decodes refresh token

## Repositories

### ITokenRepository

Interface for refresh token persistence.

**Methods**:
- `findByToken(token)`: Find token by token string
- `findByUserId(userId)`: Find token by user ID
- `save(token)`: Save or update token
- `deleteByToken(token)`: Delete token by token string
- `deleteByUserId(userId)`: Delete all tokens for a user
- `deleteExpired()`: Delete all expired tokens

## Strategies

### GoogleStrategy

Passport strategy for Google OAuth 2.0.

**Responsibilities**:
- Configure Google OAuth client
- Handle OAuth callback
- Extract user profile from Google
- Call FindOrCreateUserUseCase
- Return user to Passport

### JwtStrategy

Passport strategy for JWT token validation.

**Responsibilities**:
- Extract JWT from Authorization header
- Validate token signature
- Check token expiration
- Extract and return user payload

## Guards

### JwtAuthGuard

Protects routes requiring JWT authentication.

**Behavior**:
- Extracts JWT from Authorization header
- Validates token using JwtStrategy
- Attaches user payload to request
- Rejects requests with invalid/missing tokens

### GoogleAuthGuard

Protects Google OAuth routes.

**Behavior**:
- Initiates Google OAuth flow
- Handles OAuth callback
- Validates Google profile
