# Auth Module Business Rules

## Overview

The Auth module handles Google OAuth 2.0 authentication and JWT token management for the OpenTCG Backend.

## Authentication Flow

1. User initiates Google OAuth by accessing `/api/v1/auth/google`
2. User is redirected to Google for authentication
3. Google redirects back to `/api/v1/auth/google/callback` with authorization code
4. System validates the code and retrieves user profile
5. System finds or creates user account
6. System generates JWT access token and refresh token
7. Tokens are returned to the client

## Token Management

### Access Tokens
- Short-lived (default: 15 minutes)
- Contains user ID, email, and name
- Used for API authentication
- Sent in `Authorization: Bearer <token>` header

### Refresh Tokens
- Long-lived (default: 7 days)
- Stored in database
- Used to obtain new access tokens
- Can be revoked (deleted) on logout

## Business Rules

1. **User Creation**: Users are automatically created on first Google OAuth login
2. **Token Expiration**: Access tokens expire after configured time (default 15 minutes)
3. **Refresh Token Rotation**: New refresh token is issued on each refresh
4. **Token Revocation**: Refresh tokens can be revoked by deleting them from database
5. **User Profile Updates**: User profile (name, email, picture) is updated on each login if changed
6. **Single Refresh Token**: Only one active refresh token per user (new token replaces old)

## Security Rules

1. JWT secret must be strong and kept secure
2. Tokens must be transmitted over HTTPS in production
3. Refresh tokens must be stored securely on client side
4. Expired tokens are automatically rejected
5. Invalid tokens result in 401 Unauthorized response

## Error Handling

- Invalid or expired tokens: 401 Unauthorized
- Missing authentication: 401 Unauthorized
- Invalid refresh token: 401 Unauthorized
- User not found: 401 Unauthorized
