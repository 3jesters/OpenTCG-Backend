# Authentication Setup Guide

## Overview

The OpenTCG Backend now supports Google OAuth 2.0 authentication with JWT access tokens and refresh tokens.

> **For Client Developers**: See the [Client-Side Authentication Guide](docs/client-api/authentication-client-guide.md) for implementation examples, code snippets, and best practices for integrating authentication into your frontend application.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3001

# JWT Configuration
JWT_SECRET=your-strong-random-secret-key-here
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/v1/auth/google/callback` (or your production URL)
7. Copy the Client ID and Client Secret to your `.env` file

### Generating JWT Secret

Generate a strong random secret for JWT:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Authentication Flow

### 1. Login with Google

```
GET /api/v1/auth/google
```

This redirects to Google's OAuth consent screen. After authorization, Google redirects back to the callback URL.

### 2. OAuth Callback

```
GET /api/v1/auth/google/callback
```

This endpoint handles the OAuth callback from Google and redirects to the frontend with authentication tokens in the URL hash fragment. The redirect URL format is:

```
{FRONTEND_URL}/auth/callback#accessToken={encoded-token}&refreshToken={encoded-token}&user={encoded-user-data}
```

**Security Note**: Tokens are passed in the URL hash (fragment) rather than query parameters. Hash fragments are not sent to the server, making this approach more secure. The frontend extracts the tokens from the hash and stores them securely.

The frontend callback page (`/auth/callback`) should:
1. Extract tokens from the URL hash
2. Store tokens securely (localStorage or httpOnly cookies)
3. Store user data for UI display
4. Clear the hash from the URL
5. Redirect to the home page or intended destination

### 3. Using Access Token

Include the access token in the Authorization header for protected endpoints:

```
Authorization: Bearer <access-token>
```

### 4. Refresh Access Token

When the access token expires, use the refresh token to get a new one:

```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

Response:

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 5. Logout

Invalidate the refresh token:

```
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## Protected Endpoints

The following endpoints require authentication (JWT token):

- `POST /api/v1/sets` - Create set
- `PUT /api/v1/sets/:id` - Update set
- `DELETE /api/v1/sets/:id` - Delete set
- `POST /api/v1/cards/editor/create` - Create card
- `POST /api/v1/cards/duplicate` - Duplicate card

### Example: Creating a Set

```bash
curl -X POST http://localhost:3000/api/v1/sets \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-set",
    "name": "My Set",
    "series": "Series 1",
    "releaseDate": "2024-01-01",
    "totalCards": 100
  }'
```

## Backward Compatibility

For backward compatibility, the following endpoints still accept `userId` as a query parameter:

- `GET /api/v1/sets` - Get sets (optional auth)
- `GET /api/v1/sets/:id` - Get set by ID (optional auth)
- `POST /api/v1/sets` - Create set (auth required, but accepts userId fallback)
- `PUT /api/v1/sets/:id` - Update set (auth required, but accepts userId fallback)
- `DELETE /api/v1/sets/:id` - Delete set (auth required, but accepts userId fallback)

**Note**: The `userId` query parameter support is temporary and will be removed in a future version. Please migrate to JWT authentication.

## Token Storage Recommendations

### Web Applications
- Store tokens in `httpOnly` cookies (most secure)
- Or use secure localStorage with XSS protection

### Mobile Applications
- Use secure storage (Keychain on iOS, Keystore on Android)
- Never store tokens in plain text

## Security Best Practices

1. **Always use HTTPS in production** - OAuth callbacks and token transmission must be over HTTPS
2. **Keep JWT_SECRET secure** - Never commit secrets to version control
3. **Use strong JWT secret** - At least 32 characters, randomly generated
4. **Rotate secrets periodically** - Change JWT_SECRET and invalidate all tokens
5. **Set appropriate token expiration** - Access tokens should be short-lived (15 minutes default)
6. **Validate tokens on every request** - Never trust client-provided user IDs

## Troubleshooting

### "Invalid or expired access token"
- Check if token has expired (default: 15 minutes)
- Use refresh token to get a new access token
- Verify JWT_SECRET matches between token generation and validation

### "Unauthorized" errors
- Verify Authorization header format: `Bearer <token>`
- Check if token is expired
- Ensure JWT_SECRET is set correctly

### Google OAuth errors
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check GOOGLE_CALLBACK_URL matches the redirect URI in Google Console
- Ensure Google+ API is enabled in Google Cloud Console
