# Client-Side Authentication Guide

## Overview

The OpenTCG Backend now supports two authentication methods:
- **Username Authentication** (Development): Simple username-based login for local development
- **Google OAuth** (Production): Full OAuth 2.0 flow with Google for production use

Both methods return JWT access tokens and refresh tokens that can be used to authenticate API requests.

## Authentication Methods

### Development Mode (Username Auth)

**When to use**: Local development, testing, or when `AUTH_METHOD=username` is set

**Endpoint**: `POST /api/v1/auth/login/username`

**Request**:
```json
{
  "username": "testuser"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "testuser",
    "name": "testuser",
    "picture": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Production Mode (Google OAuth)

**When to use**: Production, staging, or when Google OAuth credentials are configured

**Flow**:
1. Redirect user to: `GET /api/v1/auth/google`
2. User authenticates with Google
3. Google redirects to: `GET /api/v1/auth/google/callback`
4. Backend returns tokens (see response format below)

**Response** (from callback):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "picture": "https://lh3.googleusercontent.com/...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Token Management

### Access Tokens
- **Lifetime**: 15 minutes (default)
- **Usage**: Include in `Authorization` header for all protected API requests
- **Format**: `Authorization: Bearer <access-token>`

### Refresh Tokens
- **Lifetime**: 7 days (default)
- **Usage**: Exchange for new access tokens when current one expires
- **Storage**: Store securely (see recommendations below)

## Client Implementation Examples

### JavaScript/TypeScript (React/Next.js/Vue)

```typescript
// auth.service.ts
class AuthService {
  private baseUrl = 'http://localhost:3000/api/v1';
  private accessTokenKey = 'opentcg_access_token';
  private refreshTokenKey = 'opentcg_refresh_token';

  /**
   * Username login (development)
   */
  async loginWithUsername(username: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login/username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data: AuthResponse = await response.json();
    this.storeTokens(data.accessToken, data.refreshToken);
    return data;
  }

  /**
   * Google OAuth login (production)
   */
  loginWithGoogle(): void {
    // Redirect to Google OAuth endpoint
    window.location.href = `${this.baseUrl}/auth/google`;
  }

  /**
   * Handle OAuth callback
   * This should be called on your callback page after Google redirects
   */
  async handleOAuthCallback(): Promise<AuthResponse> {
    // The backend returns JSON, but you might want to handle redirects
    // For now, assuming the callback endpoint returns JSON directly
    const response = await fetch(`${this.baseUrl}/auth/google/callback`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('OAuth callback failed');
    }

    const data: AuthResponse = await response.json();
    this.storeTokens(data.accessToken, data.refreshToken);
    return data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<TokenRefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data: TokenRefreshResponse = await response.json();
    this.storeTokens(data.accessToken, data.refreshToken);
    return data;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }
    this.clearTokens();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    // For web: localStorage or httpOnly cookie
    return localStorage.getItem(this.accessTokenKey);
    // For mobile: secure storage (Keychain/Keystore)
  }

  /**
   * Make authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getAccessToken();

    // If no token, try to refresh
    if (!token) {
      try {
        await this.refreshToken();
        token = this.getAccessToken();
      } catch (error) {
        // Redirect to login
        throw new Error('Authentication required');
      }
    }

    // Make request with token
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired, try refresh once
    if (response.status === 401) {
      try {
        await this.refreshToken();
        token = this.getAccessToken();
        
        // Retry request
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Refresh failed, redirect to login
        throw new Error('Session expired');
      }
    }

    return response;
  }

  /**
   * Store tokens securely
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    // Web: localStorage (or httpOnly cookies via backend)
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    
    // Mobile: Use secure storage
    // - iOS: Keychain
    // - Android: Keystore
  }

  /**
   * Get refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Clear tokens
   */
  private clearTokens(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}

// Types
interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = new AuthService();
```

### React Hook Example

```typescript
// useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { authService, AuthResponse } from './auth.service';

export function useAuth() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = authService.getAccessToken();
    if (token) {
      // Optionally: fetch user profile to verify token
      // For now, just check if token exists
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithUsername = useCallback(async (username: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.loginWithUsername(username);
      setUser(response.user);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    authService.loginWithGoogle();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  return {
    user,
    loading,
    error,
    loginWithUsername,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
  };
}
```

### React Component Example

```tsx
// LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from './useAuth';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const { loginWithUsername, loginWithGoogle, loading, error } = useAuth();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithUsername(username);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div>
      <h2>Login</h2>
      
      {isDevelopment && (
        <form onSubmit={handleUsernameLogin}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login with Username'}
          </button>
        </form>
      )}

      <button onClick={handleGoogleLogin} disabled={loading}>
        {loading ? 'Redirecting...' : 'Login with Google'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Axios Interceptor Example

```typescript
// axios.config.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authService } from './auth.service';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        await authService.refreshToken();
        const newToken = authService.getAccessToken();
        
        // Retry original request with new token
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

## Protected API Requests

### Example: Creating a Set

```typescript
// Using fetch
const createSet = async (setData: CreateSetDto) => {
  const response = await authService.authenticatedFetch(
    'http://localhost:3000/api/v1/sets',
    {
      method: 'POST',
      body: JSON.stringify(setData),
    }
  );
  return response.json();
};

// Using Axios
const createSet = async (setData: CreateSetDto) => {
  const response = await apiClient.post('/sets', setData);
  return response.data;
};
```

## Token Storage Recommendations

### Web Applications

**Option 1: httpOnly Cookies (Most Secure)**
- Backend sets cookies via `Set-Cookie` header
- Client cannot access via JavaScript (XSS protection)
- Automatically sent with requests
- Requires CORS configuration

**Option 2: localStorage (Current Implementation)**
- Easy to implement
- Accessible via JavaScript
- Vulnerable to XSS attacks
- Use only if you have XSS protection measures

**Option 3: sessionStorage**
- Similar to localStorage but cleared on tab close
- Good for single-session applications

### Mobile Applications

**iOS (React Native)**
```typescript
import * as Keychain from 'react-native-keychain';

// Store
await Keychain.setGenericPassword('accessToken', accessToken);

// Retrieve
const credentials = await Keychain.getGenericPassword();
const accessToken = credentials?.password;
```

**Android (React Native)**
```typescript
import EncryptedStorage from 'react-native-encrypted-storage';

// Store
await EncryptedStorage.setItem('accessToken', accessToken);

// Retrieve
const accessToken = await EncryptedStorage.getItem('accessToken');
```

## Error Handling

### Common Error Scenarios

**1. Token Expired (401 Unauthorized)**
```typescript
if (response.status === 401) {
  try {
    await authService.refreshToken();
    // Retry request
  } catch (error) {
    // Redirect to login
    authService.logout();
    navigate('/login');
  }
}
```

**2. Invalid Token (401 Unauthorized)**
- Clear tokens and redirect to login
- User must re-authenticate

**3. Network Errors**
- Implement retry logic with exponential backoff
- Show user-friendly error messages

**4. OAuth Callback Errors**
- Handle `error` query parameter from Google
- Show appropriate error message to user

## Migration Guide

### If You Had Previous Authentication

**Before (userId query parameter)**:
```typescript
fetch(`/api/v1/sets?userId=user-123`, {
  method: 'POST',
  body: JSON.stringify(setData),
});
```

**After (JWT Authentication)**:
```typescript
fetch('/api/v1/sets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(setData),
});
```

### Backward Compatibility

The backend still supports `userId` query parameter for backward compatibility, but it's **deprecated**. Migrate to JWT authentication as soon as possible.

## Environment Detection

```typescript
// Detect which auth method to use
const getAuthMethod = (): 'username' | 'google' => {
  // Check environment variable or API endpoint
  const env = process.env.NODE_ENV;
  const authMethod = process.env.REACT_APP_AUTH_METHOD;
  
  if (authMethod === 'username') return 'username';
  if (authMethod === 'google-oauth') return 'google';
  
  // Default: username for dev, google for prod
  return env === 'development' ? 'username' : 'google';
};
```

## Complete Example: React App

```tsx
// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

## Testing

### Mock Authentication for Tests

```typescript
// test-utils.ts
export const mockAuthResponse = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

// Mock localStorage
beforeEach(() => {
  localStorage.setItem('opentcg_access_token', mockAuthResponse.accessToken);
  localStorage.setItem('opentcg_refresh_token', mockAuthResponse.refreshToken);
});

afterEach(() => {
  localStorage.clear();
});
```

## Security Best Practices

1. **Never commit tokens to version control**
2. **Use HTTPS in production** - Always transmit tokens over encrypted connections
3. **Implement token rotation** - Refresh tokens regularly
4. **Handle token expiration gracefully** - Auto-refresh before expiration
5. **Clear tokens on logout** - Always clear tokens when user logs out
6. **Validate tokens client-side** - Check expiration before making requests
7. **Implement CSRF protection** - If using cookies, implement CSRF tokens
8. **Sanitize user input** - Prevent XSS attacks that could steal tokens

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|--------------|-------------|
| `/auth/login/username` | POST | No | Username login (dev) |
| `/auth/google` | GET | No | Initiate Google OAuth |
| `/auth/google/callback` | GET | No | Google OAuth callback |
| `/auth/refresh` | POST | No | Refresh access token |
| `/auth/logout` | POST | No | Logout (invalidate token) |
| `/sets` | POST | Yes | Create set |
| `/sets/:id` | PUT | Yes | Update set |
| `/sets/:id` | DELETE | Yes | Delete set |
| `/cards/editor/create` | POST | Yes | Create card |
| `/cards/duplicate` | POST | Yes | Duplicate card |

## Support

For issues or questions:
- Check the [Authentication Setup Guide](../../AUTHENTICATION.md)
- Review [API Documentation](../API-CONTRACT.md)
- Open an issue on GitHub
