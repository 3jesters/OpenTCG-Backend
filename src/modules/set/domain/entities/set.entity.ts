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

  constructor(
    id: string,
    name: string,
    series: string,
    releaseDate: string,
    totalCards: number,
  ) {
    this._id = id;
    this._name = name;
    this._series = series;
    this._releaseDate = releaseDate;
    this._totalCards = totalCards;
    this._official = false;

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
  }
}

