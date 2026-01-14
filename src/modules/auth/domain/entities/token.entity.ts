/**
 * Refresh Token Domain Entity
 * Represents a refresh token in the system
 * Framework-agnostic with business logic
 */
export class RefreshToken {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _token: string;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;

  constructor(
    id: string,
    userId: string,
    token: string,
    expiresAt: Date,
    createdAt: Date,
  ) {
    this._id = id;
    this._userId = userId;
    this._token = token;
    this._expiresAt = expiresAt;
    this._createdAt = createdAt;

    this.validate();
  }

  // ========================================
  // Getters
  // ========================================

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get token(): string {
    return this._token;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // ========================================
  // Business Logic
  // ========================================

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() >= this._expiresAt;
  }

  /**
   * Check if token is valid (not expired)
   */
  isValid(): boolean {
    return !this.isExpired();
  }

  // ========================================
  // Validation
  // ========================================

  private validate(): void {
    if (!this._userId || this._userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!this._token || this._token.trim().length === 0) {
      throw new Error('Token is required');
    }
    if (!this._expiresAt) {
      throw new Error('Expiration date is required');
    }
    if (this._expiresAt <= this._createdAt) {
      throw new Error('Expiration date must be after creation date');
    }
  }

  // ========================================
  // Factory Methods
  // ========================================

  /**
   * Create a new refresh token
   */
  static create(
    id: string,
    userId: string,
    token: string,
    expiresAt: Date,
  ): RefreshToken {
    const now = new Date();
    return new RefreshToken(id, userId, token, expiresAt, now);
  }
}
