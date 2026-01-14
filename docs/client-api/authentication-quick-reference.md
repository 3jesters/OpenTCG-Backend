# Authentication Quick Reference

## Quick Start

### 1. Username Login (Development)

```typescript
POST /api/v1/auth/login/username
Content-Type: application/json

{
  "username": "testuser"
}

Response:
{
  "user": { ... },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 2. Google OAuth Login (Production)

```typescript
// Step 1: Redirect user
window.location.href = 'http://localhost:3000/api/v1/auth/google';

// Step 2: Handle callback (backend returns tokens)
GET /api/v1/auth/google/callback

Response:
{
  "user": { ... },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 3. Using Access Token

```typescript
// Include in all protected requests
Authorization: Bearer <access-token>
```

### 4. Refresh Token

```typescript
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 5. Logout

```typescript
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## Token Storage

```typescript
// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Retrieve token
const token = localStorage.getItem('accessToken');

// Clear tokens
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

## Making Authenticated Requests

```typescript
// Using fetch
fetch('/api/v1/sets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

// Using Axios
axios.post('/api/v1/sets', data, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

## Error Handling

```typescript
// Handle 401 (token expired)
if (response.status === 401) {
  // Try refresh
  const newTokens = await refreshToken();
  // Retry request with new token
}
```

## Environment Detection

```typescript
const useUsernameAuth = 
  process.env.NODE_ENV === 'development' || 
  process.env.REACT_APP_AUTH_METHOD === 'username';
```

## Protected Endpoints

All these endpoints require `Authorization: Bearer <token>`:

- `POST /api/v1/sets`
- `PUT /api/v1/sets/:id`
- `DELETE /api/v1/sets/:id`
- `POST /api/v1/cards/editor/create`
- `POST /api/v1/cards/duplicate`

## See Also

- [Full Client Guide](./authentication-client-guide.md) - Complete implementation guide
- [Backend Setup Guide](../../AUTHENTICATION.md) - Server-side configuration
