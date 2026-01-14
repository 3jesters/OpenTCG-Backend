/**
 * User Domain Entity
 * Represents a user in the system
 * Framework-agnostic with business logic
 */
export class User {
  private readonly _id: string;
  private readonly _googleId: string;
  private _email: string;
  private _name: string;
  private _picture?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    googleId: string,
    email: string,
    name: string,
    createdAt: Date,
    updatedAt: Date,
    picture?: string,
  ) {
    this._id = id;
    this._googleId = googleId;
    this._email = email;
    this._name = name;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._picture = picture;

    this.validate();
  }

  // ========================================
  // Getters
  // ========================================

  get id(): string {
    return this._id;
  }

  get googleId(): string {
    return this._googleId;
  }

  get email(): string {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  get picture(): string | undefined {
    return this._picture;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ========================================
  // Business Logic
  // ========================================

  /**
   * Update user profile information
   */
  updateProfile(name: string, picture?: string): void {
    this.validateName(name);
    this._name = name;
    if (picture !== undefined) {
      this._picture = picture;
    }
    this._updatedAt = new Date();
  }

  /**
   * Update email address
   */
  updateEmail(email: string): void {
    this.validateEmail(email);
    this._email = email;
    this._updatedAt = new Date();
  }

  // ========================================
  // Validation
  // ========================================

  private validate(): void {
    this.validateEmail(this._email);
    this.validateName(this._name);
    this.validateGoogleId(this._googleId);
  }

  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email is required');
    }
    if (!email.includes('@')) {
      throw new Error('Email must be a valid email address');
    }
    if (email.length > 255) {
      throw new Error('Email must be less than 255 characters');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (name.length > 100) {
      throw new Error('Name must be less than 100 characters');
    }
  }

  private validateGoogleId(googleId: string): void {
    if (!googleId || googleId.trim().length === 0) {
      throw new Error('Google ID is required');
    }
  }

  // ========================================
  // Factory Methods
  // ========================================

  /**
   * Create a new user from Google profile
   */
  static createFromGoogleProfile(
    id: string,
    googleId: string,
    email: string,
    name: string,
    picture?: string,
  ): User {
    const now = new Date();
    return new User(id, googleId, email, name, now, now, picture);
  }
}
