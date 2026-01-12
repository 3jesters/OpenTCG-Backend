/**
 * Set Domain Entity
 * Represents a TCG card set with metadata
 * Framework-agnostic with business logic
 */
export class Set {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _series: string;
  private readonly _releaseDate: string;
  private _totalCards: number;
  private _description?: string;
  private _official: boolean;
  private _symbolUrl?: string;
  private _logoUrl?: string;
  private readonly _ownerId: string;

  constructor(
    id: string,
    name: string,
    series: string,
    releaseDate: string,
    totalCards: number,
    ownerId: string,
  ) {
    this._id = id;
    this._name = name;
    this._series = series;
    this._releaseDate = releaseDate;
    this._totalCards = totalCards;
    this._official = false;
    this._ownerId = ownerId;

    this.validate();
  }

  // ========================================
  // Getters
  // ========================================

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get series(): string {
    return this._series;
  }

  get releaseDate(): string {
    return this._releaseDate;
  }

  get totalCards(): number {
    return this._totalCards;
  }

  get description(): string | undefined {
    return this._description;
  }

  get official(): boolean {
    return this._official;
  }

  get symbolUrl(): string | undefined {
    return this._symbolUrl;
  }

  get logoUrl(): string | undefined {
    return this._logoUrl;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  // ========================================
  // Business Logic - Setters with Validation
  // ========================================

  setDescription(description: string): void {
    this._description = description;
  }

  setOfficial(official: boolean): void {
    this._official = official;
  }

  setSymbolUrl(url: string): void {
    this._symbolUrl = url;
  }

  setLogoUrl(url: string): void {
    this._logoUrl = url;
  }

  updateTotalCards(total: number): void {
    if (total < 0) {
      throw new Error('Total cards must be greater than or equal to 0');
    }
    this._totalCards = total;
  }

  // ========================================
  // Business Logic - Query Methods
  // ========================================

  isOfficial(): boolean {
    return this._official;
  }

  /**
   * Check if this set is global (owned by system)
   */
  isGlobal(): boolean {
    return this._ownerId === 'system';
  }

  /**
   * Check if this set is owned by a specific user
   */
  isOwnedBy(userId: string): boolean {
    return this._ownerId === userId;
  }

  /**
   * Check if a user can edit this set
   * Global sets cannot be edited by anyone
   * Private sets can only be edited by their owner
   */
  canEdit(userId: string): boolean {
    if (this.isGlobal()) {
      return false; // Global sets cannot be edited
    }
    return this.isOwnedBy(userId);
  }

  /**
   * Check if a user can view this set
   * All sets are visible to everyone
   */
  canView(userId: string): boolean {
    return true; // All sets are visible
  }

  // ========================================
  // Validation
  // ========================================

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('Set ID is required');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('Set name is required');
    }
    if (!this._series || this._series.trim() === '') {
      throw new Error('Series is required');
    }
    if (this._totalCards < 0) {
      throw new Error('Total cards must be greater than or equal to 0');
    }
    if (!this._ownerId || this._ownerId.trim() === '') {
      throw new Error('Owner ID is required');
    }
  }
}
