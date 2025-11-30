import { TournamentStatus } from '../enums';
import { DeckRules, RestrictedCard, StartGameRules } from '../value-objects';

/**
 * Tournament Domain Entity
 * Represents a tournament with rules, allowed sets, and deck configurations
 * Framework-agnostic with business logic
 */
export class Tournament {
  // Identity
  private readonly _id: string;
  private _name: string;
  private _version: string;

  // Metadata
  private _description: string;
  private _author: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _official: boolean;
  private _status: TournamentStatus;

  // Set Management
  private _bannedSets: string[]; // Empty = all sets allowed
  private _setBannedCards: Record<string, string[]>; // setName -> cardIds[]

  // Deck Rules
  private _deckRules: DeckRules;

  // Start Game Rules
  private _startGameRules: StartGameRules;

  // Deck Configuration
  private _savedDecks: string[]; // Array of deck IDs

  // Additional Fields
  private _startDate?: Date;
  private _endDate?: Date;
  private _maxParticipants?: number;
  private _format?: string;
  private _regulationMarks: string[];

  constructor(
    id: string,
    name: string,
    version: string,
    description: string,
    author: string,
    deckRules: DeckRules,
    createdAt?: Date,
  ) {
    this._id = id;
    this._name = name;
    this._version = version;
    this._description = description;
    this._author = author;
    this._deckRules = deckRules;
    this._startGameRules = StartGameRules.createDefault();
    this._createdAt = createdAt || new Date();
    this._updatedAt = new Date();
    this._official = false;
    this._status = TournamentStatus.DRAFT;
    this._bannedSets = [];
    this._setBannedCards = {};
    this._savedDecks = [];
    this._regulationMarks = [];

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

  get version(): string {
    return this._version;
  }

  get description(): string {
    return this._description;
  }

  get author(): string {
    return this._author;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get official(): boolean {
    return this._official;
  }

  get status(): TournamentStatus {
    return this._status;
  }

  get bannedSets(): string[] {
    return [...this._bannedSets];
  }

  get setBannedCards(): Record<string, string[]> {
    return { ...this._setBannedCards };
  }

  get deckRules(): DeckRules {
    return this._deckRules;
  }

  get startGameRules(): StartGameRules {
    return this._startGameRules;
  }

  get savedDecks(): string[] {
    return [...this._savedDecks];
  }

  get startDate(): Date | undefined {
    return this._startDate;
  }

  get endDate(): Date | undefined {
    return this._endDate;
  }

  get maxParticipants(): number | undefined {
    return this._maxParticipants;
  }

  get format(): string | undefined {
    return this._format;
  }

  get regulationMarks(): string[] {
    return [...this._regulationMarks];
  }

  // ========================================
  // Business Logic - Setters
  // ========================================

  setName(name: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Tournament name cannot be empty');
    }
    this._name = name;
    this.touch();
  }

  setVersion(version: string): void {
    if (!version || version.trim() === '') {
      throw new Error('Version cannot be empty');
    }
    this._version = version;
    this.touch();
  }

  setDescription(description: string): void {
    this._description = description;
    this.touch();
  }

  setAuthor(author: string): void {
    if (!author || author.trim() === '') {
      throw new Error('Author cannot be empty');
    }
    this._author = author;
    this.touch();
  }

  setOfficial(official: boolean): void {
    this._official = official;
    this.touch();
  }

  setStatus(status: TournamentStatus): void {
    this._status = status;
    this.touch();
  }

  setStartDate(date: Date): void {
    if (this._endDate && date > this._endDate) {
      throw new Error('Start date cannot be after end date');
    }
    this._startDate = date;
    this.touch();
  }

  setEndDate(date: Date): void {
    if (this._startDate && date < this._startDate) {
      throw new Error('End date cannot be before start date');
    }
    this._endDate = date;
    this.touch();
  }

  setMaxParticipants(max: number): void {
    if (max < 2) {
      throw new Error('Max participants must be at least 2');
    }
    this._maxParticipants = max;
    this.touch();
  }

  setFormat(format: string): void {
    this._format = format;
    this.touch();
  }

  addRegulationMark(mark: string): void {
    if (!mark || mark.trim() === '') {
      throw new Error('Regulation mark cannot be empty');
    }
    if (!this._regulationMarks.includes(mark)) {
      this._regulationMarks.push(mark);
      this.touch();
    }
  }

  removeRegulationMark(mark: string): void {
    this._regulationMarks = this._regulationMarks.filter((m) => m !== mark);
    this.touch();
  }

  // ========================================
  // Business Logic - Set Management
  // ========================================

  /**
   * Check if a set is allowed in this tournament
   * Empty bannedSets = all sets allowed
   */
  isSetAllowed(setName: string): boolean {
    if (this._bannedSets.length === 0) {
      return true; // All sets allowed by default
    }
    return !this._bannedSets.includes(setName);
  }

  /**
   * Ban a set from the tournament
   */
  banSet(setName: string): void {
    if (!setName || setName.trim() === '') {
      throw new Error('Set name cannot be empty');
    }
    if (!this._bannedSets.includes(setName)) {
      this._bannedSets.push(setName);
      this.touch();
    }
  }

  /**
   * Unban a set from the tournament
   */
  unbanSet(setName: string): void {
    this._bannedSets = this._bannedSets.filter((s) => s !== setName);
    this.touch();
  }

  /**
   * Ban a specific card in a set
   */
  banCardInSet(setName: string, cardId: string): void {
    if (!setName || setName.trim() === '') {
      throw new Error('Set name cannot be empty');
    }
    if (!cardId || cardId.trim() === '') {
      throw new Error('Card ID cannot be empty');
    }

    if (!this._setBannedCards[setName]) {
      this._setBannedCards[setName] = [];
    }

    if (!this._setBannedCards[setName].includes(cardId)) {
      this._setBannedCards[setName].push(cardId);
      this.touch();
    }
  }

  /**
   * Unban a specific card in a set
   */
  unbanCardInSet(setName: string, cardId: string): void {
    if (this._setBannedCards[setName]) {
      this._setBannedCards[setName] = this._setBannedCards[setName].filter(
        (id) => id !== cardId,
      );
      if (this._setBannedCards[setName].length === 0) {
        delete this._setBannedCards[setName];
      }
      this.touch();
    }
  }

  /**
   * Check if a card is banned
   */
  isCardBanned(setName: string, cardId: string): boolean {
    // Check if entire set is banned first
    if (!this.isSetAllowed(setName)) {
      return true;
    }

    // Check if specific card is banned
    if (this._setBannedCards[setName]) {
      return this._setBannedCards[setName].includes(cardId);
    }

    return false;
  }

  /**
   * Check if a card is restricted
   */
  isCardRestricted(setName: string, cardId: string): boolean {
    return this._deckRules.isCardRestricted(setName, cardId);
  }

  /**
   * Get max copies allowed for a card
   */
  getMaxCopiesForCard(setName: string, cardId: string): number {
    if (this.isCardBanned(setName, cardId)) {
      return 0;
    }
    return this._deckRules.getMaxCopiesForCard(setName, cardId);
  }

  // ========================================
  // Business Logic - Deck Rules
  // ========================================

  updateDeckRules(deckRules: DeckRules): void {
    this._deckRules = deckRules;
    this.touch();
  }

  setStartGameRules(rules: StartGameRules): void {
    this._startGameRules = rules;
    this.touch();
  }

  restrictCard(setName: string, cardId: string, maxCopies: number): void {
    const restrictedCard = new RestrictedCard(setName, cardId, maxCopies);
    const existing = this._deckRules.restrictedCards.filter(
      (rc) => !(rc.setName === setName && rc.cardId === cardId),
    );
    existing.push(restrictedCard);

    this._deckRules = new DeckRules(
      this._deckRules.minDeckSize,
      this._deckRules.maxDeckSize,
      this._deckRules.exactDeckSize,
      this._deckRules.maxCopiesPerCard,
      this._deckRules.minBasicPokemon,
      existing,
    );
    this.touch();
  }

  unrestrictCard(setName: string, cardId: string): void {
    const filtered = this._deckRules.restrictedCards.filter(
      (rc) => !(rc.setName === setName && rc.cardId === cardId),
    );

    this._deckRules = new DeckRules(
      this._deckRules.minDeckSize,
      this._deckRules.maxDeckSize,
      this._deckRules.exactDeckSize,
      this._deckRules.maxCopiesPerCard,
      this._deckRules.minBasicPokemon,
      filtered,
    );
    this.touch();
  }

  // ========================================
  // Business Logic - Saved Decks
  // ========================================

  addSavedDeck(deckId: string): void {
    if (!deckId || deckId.trim() === '') {
      throw new Error('Deck ID cannot be empty');
    }
    if (!this._savedDecks.includes(deckId)) {
      this._savedDecks.push(deckId);
      this.touch();
    }
  }

  removeSavedDeck(deckId: string): void {
    this._savedDecks = this._savedDecks.filter((id) => id !== deckId);
    this.touch();
  }

  // ========================================
  // Validation
  // ========================================

  private validate(): void {
    if (!this._id || this._id.trim() === '') {
      throw new Error('Tournament ID is required');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('Tournament name is required');
    }
    if (!this._version || this._version.trim() === '') {
      throw new Error('Version is required');
    }
    if (!this._author || this._author.trim() === '') {
      throw new Error('Author is required');
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  // ========================================
  // Factory Methods
  // ========================================

  static create(
    id: string,
    name: string,
    version: string,
    description: string,
    author: string,
    deckRules?: DeckRules,
  ): Tournament {
    return new Tournament(
      id,
      name,
      version,
      description,
      author,
      deckRules || DeckRules.createStandard(),
    );
  }

  /**
   * Create a default tournament with standard rules
   */
  static createDefault(): Tournament {
    const tournament = Tournament.create(
      'default-tournament',
      'Default Tournament',
      '1.0',
      'Default tournament configuration with standard Pokemon TCG rules',
      'system',
      DeckRules.createStandard(),
    );
    tournament.setOfficial(true);
    tournament.setFormat('Standard');
    tournament.setStartGameRules(StartGameRules.createDefault());
    return tournament;
  }
}

