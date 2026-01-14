# User Module Business Rules

## Overview

The User module manages user accounts created through Google OAuth authentication.

## User Creation

1. Users are automatically created on first Google OAuth login
2. User ID is generated as UUID
3. Google ID is stored for future lookups
4. Email, name, and profile picture are stored from Google profile

## User Identification

1. Users are identified by their Google ID (primary lookup)
2. Users can also be found by email address
3. User ID (UUID) is used for internal references

## Profile Updates

1. User profile is updated on each Google OAuth login if information has changed
2. Email, name, and picture can be updated
3. Google ID cannot be changed after creation
4. Updated timestamp is automatically maintained

## Validation Rules

### Email
- Must be a valid email address (contains @)
- Must not be empty
- Maximum length: 255 characters

### Name
- Must not be empty
- Minimum length: 2 characters
- Maximum length: 100 characters

### Google ID
- Must not be empty
- Unique across all users

## Business Rules

1. **Uniqueness**: Each Google ID maps to exactly one user account
2. **Email Uniqueness**: Each email address should map to one user (handled gracefully if duplicate)
3. **Profile Synchronization**: User profile is synchronized with Google profile on each login
4. **Immutable ID**: User ID (UUID) cannot be changed after creation
5. **Google ID Immutability**: Google ID cannot be changed after user creation

## Error Handling

- Invalid email format: Validation error
- Empty name: Validation error
- Duplicate Google ID: User lookup returns existing user
- User not found: 404 Not Found
