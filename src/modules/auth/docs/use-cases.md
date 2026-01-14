# Auth Module Use Cases

## Use Cases

### 1. Google OAuth Login

**Actor**: User  
**Preconditions**: None  
**Flow**:
1. User navigates to `/api/v1/auth/google`
2. System redirects to Google OAuth consent screen
3. User authorizes application
4. Google redirects to callback URL with authorization code
5. System exchanges code for user profile
6. System finds or creates user account
7. System generates access and refresh tokens
8. System saves refresh token to database
9. System returns tokens to client

**Postconditions**: User is authenticated, tokens are issued

### 2. Refresh Access Token

**Actor**: Client Application  
**Preconditions**: User has valid refresh token  
**Flow**:
1. Client sends refresh token to `/api/v1/auth/refresh`
2. System validates refresh token signature
3. System checks if refresh token exists in database
4. System checks if refresh token is expired
5. System verifies user still exists
6. System generates new access and refresh tokens
7. System deletes old refresh token
8. System saves new refresh token
9. System returns new tokens to client

**Postconditions**: New tokens are issued, old refresh token is invalidated

### 3. Logout

**Actor**: Authenticated User  
**Preconditions**: User has valid refresh token  
**Flow**:
1. Client sends refresh token to `/api/v1/auth/logout`
2. System deletes refresh token from database
3. System returns success response

**Postconditions**: Refresh token is invalidated, user must re-authenticate

### 4. Validate JWT Token

**Actor**: Protected Endpoint  
**Preconditions**: Request includes JWT token in Authorization header  
**Flow**:
1. Guard extracts token from Authorization header
2. Guard validates token signature
3. Guard checks token expiration
4. Guard extracts user payload
5. Guard attaches user to request object

**Postconditions**: Request is authenticated, user info available via @CurrentUser() decorator
