# Client Migration Guide - Authentication Update

## Summary of Changes

The OpenTCG Backend has been updated with a new authentication system. This guide outlines what needs to change on the client side.

## Breaking Changes

### 1. Protected Endpoints Now Require Authentication

**Before:**
```typescript
// Could use userId query parameter
POST /api/v1/sets?userId=user-123
```

**After:**
```typescript
// Must use JWT token in Authorization header
POST /api/v1/sets
Headers: {
  'Authorization': 'Bearer <access-token>'
}
```

### 2. User ID No Longer Passed as Query Parameter

**Before:**
```typescript
fetch(`/api/v1/sets?userId=${userId}`, {
  method: 'POST',
  body: JSON.stringify(data),
});
```

**After:**
```typescript
fetch('/api/v1/sets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

## Required Client Updates

### 1. Implement Authentication Flow

You need to implement one of two authentication methods:

#### Option A: Username Authentication (Development)
```typescript
// Login
const response = await fetch('/api/v1/auth/login/username', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'testuser' }),
});
const { accessToken, refreshToken, user } = await response.json();

// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

#### Option B: Google OAuth (Production)
```typescript
// Step 1: Redirect to Google
window.location.href = '/api/v1/auth/google';

// Step 2: Handle callback (backend redirects with tokens)
// You'll need a callback page that extracts tokens from response
```

### 2. Add Token to All Protected Requests

**Update all API calls to include Authorization header:**

```typescript
// Before
fetch('/api/v1/sets', {
  method: 'POST',
  body: JSON.stringify(data),
});

// After
const token = localStorage.getItem('accessToken');
fetch('/api/v1/sets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

### 3. Implement Token Refresh Logic

```typescript
// When access token expires (401 error)
if (response.status === 401) {
  const refreshToken = localStorage.getItem('refreshToken');
  const refreshResponse = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  
  // Retry original request
}
```

### 4. Update Protected Endpoints

The following endpoints now require authentication:

- `POST /api/v1/sets` - Create set
- `PUT /api/v1/sets/:id` - Update set
- `DELETE /api/v1/sets/:id` - Delete set
- `POST /api/v1/cards/editor/create` - Create card
- `POST /api/v1/cards/duplicate` - Duplicate card

### 5. Remove userId Query Parameters

**Remove from:**
- `POST /api/v1/sets?userId=...`
- `PUT /api/v1/sets/:id?userId=...`
- `DELETE /api/v1/sets/:id?userId=...`
- `POST /api/v1/cards/duplicate?userId=...`

**Note:** The backend still accepts `userId` query parameter for backward compatibility, but it's deprecated. Remove it from your code.

## Migration Checklist

- [ ] Implement authentication service/utility
- [ ] Add login UI (username or Google OAuth button)
- [ ] Store tokens securely (localStorage, httpOnly cookies, or secure storage)
- [ ] Update all API calls to include `Authorization` header
- [ ] Implement token refresh logic
- [ ] Handle 401 errors (token expired)
- [ ] Add logout functionality
- [ ] Remove `userId` query parameters from requests
- [ ] Update error handling for authentication failures
- [ ] Test authentication flow end-to-end
- [ ] Test token refresh flow
- [ ] Test logout flow
- [ ] Update API client/axios interceptors if used

## Code Examples

See the [Full Client Guide](./authentication-client-guide.md) for complete implementation examples including:
- React hooks
- Axios interceptors
- Token management utilities
- Error handling
- Mobile app examples

## Backward Compatibility

The backend maintains backward compatibility by:
- Still accepting `userId` query parameter (deprecated)
- Allowing unauthenticated access to GET endpoints (optional auth)

However, you should migrate to JWT authentication as soon as possible as the query parameter support will be removed in a future version.

## Testing

After migration, test:
1. Login flow (username or Google OAuth)
2. Making authenticated requests
3. Token expiration and refresh
4. Logout
5. Protected endpoint access
6. Error handling (401, network errors)

## Support

- [Full Client Guide](./authentication-client-guide.md)
- [Quick Reference](./authentication-quick-reference.md)
- [Backend Setup Guide](../../AUTHENTICATION.md)
