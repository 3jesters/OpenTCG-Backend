# User Module Use Cases

## Use Cases

### 1. Find or Create User

**Actor**: Auth Module  
**Preconditions**: Valid Google OAuth profile  
**Flow**:
1. System receives Google profile from OAuth
2. System searches for user by Google ID
3. If found:
   - System checks if profile information has changed
   - System updates profile if needed
   - System returns existing user
4. If not found:
   - System searches by email address
   - If found, returns existing user
   - If not found:
     - System generates new user ID (UUID)
     - System creates new user entity
     - System saves user to database
     - System returns new user

**Postconditions**: User exists in system, profile is up-to-date

### 2. Get User by ID

**Actor**: Client Application  
**Preconditions**: Valid user ID  
**Flow**:
1. Client requests user profile by ID
2. System searches for user by ID
3. If found:
   - System returns user profile
4. If not found:
   - System returns 404 Not Found

**Postconditions**: User profile is returned (if exists)

### 3. Update User Profile

**Actor**: System (automatic on login)  
**Preconditions**: User exists, profile information changed  
**Flow**:
1. System compares current profile with Google profile
2. If email changed:
   - System validates new email
   - System updates email
3. If name changed:
   - System validates new name
   - System updates name
4. If picture changed:
   - System updates picture
5. System updates updatedAt timestamp
6. System saves user to database

**Postconditions**: User profile is synchronized with Google
