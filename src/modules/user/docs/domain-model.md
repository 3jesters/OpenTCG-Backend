# User Module Domain Model

## Entities

### User

Represents a user account in the system.

**Properties**:
- `id`: Unique identifier (UUID)
- `googleId`: Google OAuth ID (unique)
- `email`: User email address (unique)
- `name`: User display name
- `picture`: User profile picture URL (optional)
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

**Business Logic**:
- `updateProfile(name, picture?)`: Updates user name and picture
- `updateEmail(email)`: Updates user email address

**Validation**:
- Email must be valid format and not empty
- Name must be 2-100 characters
- Google ID is required and unique

**Factory Methods**:
- `createFromGoogleProfile(id, googleId, email, name, picture?)`: Creates new user from Google profile

## Repositories

### IUserRepository

Interface for user persistence.

**Methods**:
- `findById(id)`: Find user by ID
- `findByGoogleId(googleId)`: Find user by Google ID
- `findByEmail(email)`: Find user by email address
- `save(user)`: Save or update user
- `delete(id)`: Delete user by ID
- `exists(id)`: Check if user exists

## Use Cases

### FindOrCreateUserUseCase

Finds existing user or creates new one from Google profile.

**Input**: GoogleProfile (id, emails, displayName, photos)  
**Output**: User entity  
**Side Effects**: Creates new user in database if not found

### GetUserByIdUseCase

Retrieves user profile by ID.

**Input**: User ID (string)  
**Output**: User entity or null  
**Side Effects**: None

## DTOs

### UserResponseDto

Response format for user data.

**Properties**:
- `id`: User ID
- `email`: Email address
- `name`: Display name
- `picture`: Profile picture URL (optional)
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

**Static Methods**:
- `fromDomain(user)`: Converts User entity to DTO
