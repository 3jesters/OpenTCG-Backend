import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  TrainerType,
  EnergyType,
  CardRuleType,
  RulePriority,
} from '../enums';
import {
  Weakness,
  Resistance,
  Evolution,
  Attack,
  Ability,
  CardRule,
  TrainerEffect,
  EnergyProvision,
} from '../value-objects';
import { CardRuleValidator } from '../services/card-rule.validator';

/**
 * Card Domain Entity
 * Represents a trading card in the TCG system
 * Framework-agnostic with business logic
 */
export class Card {
  // ========================================
  // Identity & Cataloging
  // ========================================
  private readonly _instanceId: string; // UUID - unique instance
  private readonly _cardId: string; // Variant identifier
  private readonly _pokemonNumber?: string; // Pokédex number (only for Pokemon cards)
  private _name: string;
  private _setName: string;
  private _cardNumber: string;
  private _rarity: Rarity;

  // ========================================
  // Card Type & Classification
  // ========================================
  private readonly _cardType: CardType;
  private _pokemonType?: PokemonType; // For Pokémon cards
  private _stage?: EvolutionStage; // Evolution stage
  private _level?: number; // Numeric level (used in older sets, e.g., 12, 45)
  private _subtypes: string[]; // e.g., ["Pokémon V", "Rapid Strike"]

  // ========================================
  // Evolution Chain
  // ========================================
  private _evolvesFrom?: Evolution; // Previous evolution
  private _evolvesTo: Evolution[]; // Possible next evolutions

  // ========================================
  // Battle Stats (Pokémon cards)
  // ========================================
  private _hp?: number;
  private _retreatCost?: number;

  // ========================================
  // Combat Modifiers
  // ========================================
  private _weakness?: Weakness;
  private _resistance?: Resistance;

  // ========================================
  // Actions & Abilities (Placeholders)
  // ========================================
  private _attacks: Attack[];
  private _ability?: Ability;

  // ========================================
  // Rules & Effects
  // ========================================
  private _rulesText?: string; // Human-readable
  private _cardRules?: CardRule[]; // Programmatic

  // ========================================
  // Trainer Card Specific
  // ========================================
  private _trainerType?: TrainerType;
  private _trainerEffects: TrainerEffect[]; // Structured effects for Trainer cards

  // ========================================
  // Energy Card Specific
  // ========================================
  private _energyType?: EnergyType;
  private _energyProvision?: EnergyProvision; // Structured energy provision

  // ========================================
  // Metadata
  // ========================================
  private _description: string;
  private _artist: string;
  private _imageUrl: string;
  private _regulationMark?: string;

  // ========================================
  // Editor Metadata
  // ========================================
  private _createdBy?: string;
  private _createdAt?: Date;
  private _isEditorCreated: boolean;

  constructor(
    instanceId: string,
    cardId: string,
    pokemonNumber: string | undefined,
    name: string,
    setName: string,
    cardNumber: string,
    rarity: Rarity,
    cardType: CardType,
    description: string,
    artist: string,
    imageUrl: string,
  ) {
    this._instanceId = instanceId;
    this._cardId = cardId;
    this._pokemonNumber = pokemonNumber;
    this._name = name;
    this._setName = setName;
    this._cardNumber = cardNumber;
    this._rarity = rarity;
    this._cardType = cardType;
    this._description = description;
    this._artist = artist;
    this._imageUrl = imageUrl;

    // Initialize arrays
    this._subtypes = [];
    this._evolvesTo = [];
    this._attacks = [];
    this._trainerEffects = [];

    // Initialize editor metadata
    this._isEditorCreated = false;

    this.validate();
  }

  // ========================================
  // Getters
  // ========================================

  get instanceId(): string {
    return this._instanceId;
  }

  get cardId(): string {
    return this._cardId;
  }

  get pokemonNumber(): string | undefined {
    return this._pokemonNumber;
  }

  get name(): string {
    return this._name;
  }

  get setName(): string {
    return this._setName;
  }

  get cardNumber(): string {
    return this._cardNumber;
  }

  get rarity(): Rarity {
    return this._rarity;
  }

  get cardType(): CardType {
    return this._cardType;
  }

  get pokemonType(): PokemonType | undefined {
    return this._pokemonType;
  }

  get stage(): EvolutionStage | undefined {
    return this._stage;
  }

  get level(): number | undefined {
    return this._level;
  }

  get subtypes(): string[] {
    return [...this._subtypes]; // Return copy
  }

  get evolvesFrom(): Evolution | undefined {
    return this._evolvesFrom;
  }

  get evolvesTo(): Evolution[] {
    return [...this._evolvesTo]; // Return copy
  }

  get hp(): number | undefined {
    return this._hp;
  }

  get retreatCost(): number | undefined {
    return this._retreatCost;
  }

  get weakness(): Weakness | undefined {
    return this._weakness;
  }

  get resistance(): Resistance | undefined {
    return this._resistance;
  }

  get attacks(): Attack[] {
    return [...this._attacks]; // Return copy
  }

  get ability(): Ability | undefined {
    return this._ability;
  }

  get rulesText(): string | undefined {
    return this._rulesText;
  }

  get cardRules(): CardRule[] | undefined {
    return this._cardRules ? [...this._cardRules] : undefined;
  }

  get trainerType(): TrainerType | undefined {
    return this._trainerType;
  }

  get trainerEffects(): TrainerEffect[] {
    return this._trainerEffects;
  }

  get energyType(): EnergyType | undefined {
    return this._energyType;
  }

  get energyProvision(): EnergyProvision | undefined {
    return this._energyProvision;
  }

  get isSpecialEnergy(): boolean {
    return this._energyProvision?.isSpecial ?? false;
  }

  get description(): string {
    return this._description;
  }

  get artist(): string {
    return this._artist;
  }

  get imageUrl(): string {
    return this._imageUrl;
  }

  get regulationMark(): string | undefined {
    return this._regulationMark;
  }

  get createdBy(): string | undefined {
    return this._createdBy;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get isEditorCreated(): boolean {
    return this._isEditorCreated;
  }

  // ========================================
  // Business Logic - Setters with Validation
  // ========================================

  setPokemonType(type: PokemonType): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Pokemon type can only be set on Pokemon cards');
    }
    this._pokemonType = type;
  }

  setStage(stage: EvolutionStage): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Evolution stage can only be set on Pokemon cards');
    }
    this._stage = stage;
  }

  setLevel(level: number): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Level can only be set on Pokemon cards');
    }
    if (level <= 0 || !Number.isInteger(level)) {
      throw new Error('Level must be a positive integer');
    }
    this._level = level;
  }

  addSubtype(subtype: string): void {
    if (!subtype || subtype.trim() === '') {
      throw new Error('Subtype cannot be empty');
    }
    if (!this._subtypes.includes(subtype)) {
      this._subtypes.push(subtype);
    }
  }

  removeSubtype(subtype: string): void {
    this._subtypes = this._subtypes.filter((s) => s !== subtype);
  }

  setEvolvesFrom(evolution: Evolution): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Evolution can only be set on Pokemon cards');
    }
    if (this._stage === EvolutionStage.BASIC) {
      throw new Error('Basic Pokemon cannot have evolvesFrom');
    }
    this._evolvesFrom = evolution;
  }

  addEvolvesTo(evolution: Evolution): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Evolution can only be set on Pokemon cards');
    }
    // Check if evolution already exists
    const exists = this._evolvesTo.some((e) => e.equals(evolution));
    if (!exists) {
      this._evolvesTo.push(evolution);
    }
  }

  setHp(hp: number): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('HP can only be set on Pokemon cards');
    }
    if (hp <= 0) {
      throw new Error('HP must be greater than 0');
    }
    this._hp = hp;
  }

  setRetreatCost(cost: number): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Retreat cost can only be set on Pokemon cards');
    }
    if (cost < 0) {
      throw new Error('Retreat cost cannot be negative');
    }
    this._retreatCost = cost;
  }

  setWeakness(weakness: Weakness): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Weakness can only be set on Pokemon cards');
    }
    this._weakness = weakness;
  }

  setResistance(resistance: Resistance): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Resistance can only be set on Pokemon cards');
    }
    this._resistance = resistance;
  }

  setEditorMetadata(createdBy: string, createdAt: Date): void {
    this._createdBy = createdBy;
    this._createdAt = createdAt;
    this._isEditorCreated = true;
  }

  addAttack(attack: Attack): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Attacks can only be added to Pokemon cards');
    }
    this._attacks.push(attack);
  }

  removeAttack(attackName: string): void {
    this._attacks = this._attacks.filter((a) => a.name !== attackName);
  }

  setAbility(ability: Ability): void {
    if (this._cardType !== CardType.POKEMON) {
      throw new Error('Ability can only be set on Pokemon cards');
    }
    this._ability = ability;
  }

  setRulesText(text: string): void {
    this._rulesText = text;
  }

  setCardRules(rules: CardRule[]): void {
    // Validate all rules
    CardRuleValidator.validateAll(rules);
    this._cardRules = rules;
  }

  setTrainerType(type: TrainerType): void {
    if (this._cardType !== CardType.TRAINER) {
      throw new Error('Trainer type can only be set on Trainer cards');
    }
    this._trainerType = type;
  }

  addTrainerEffect(effect: TrainerEffect): void {
    if (this._cardType !== CardType.TRAINER) {
      throw new Error('Trainer effects can only be added to Trainer cards');
    }
    this._trainerEffects.push(effect);
  }

  setTrainerEffects(effects: TrainerEffect[]): void {
    if (this._cardType !== CardType.TRAINER) {
      throw new Error('Trainer effects can only be set on Trainer cards');
    }
    this._trainerEffects = effects;
  }

  setEnergyType(type: EnergyType): void {
    if (this._cardType !== CardType.ENERGY) {
      throw new Error('Energy type can only be set on Energy cards');
    }
    this._energyType = type;
  }

  setEnergyProvision(provision: EnergyProvision): void {
    if (this._cardType !== CardType.ENERGY) {
      throw new Error('Energy provision can only be set on Energy cards');
    }
    this._energyProvision = provision;
  }

  setRegulationMark(mark: string): void {
    this._regulationMark = mark;
  }

  // ========================================
  // Business Logic - Query Methods
  // ========================================

  isPokemonCard(): boolean {
    return this._cardType === CardType.POKEMON;
  }

  isTrainerCard(): boolean {
    return this._cardType === CardType.TRAINER;
  }

  isEnergyCard(): boolean {
    return this._cardType === CardType.ENERGY;
  }

  isBasicPokemon(): boolean {
    return this.isPokemonCard() && this._stage === EvolutionStage.BASIC;
  }

  isEvolutionPokemon(): boolean {
    return (
      this.isPokemonCard() &&
      this._stage !== EvolutionStage.BASIC &&
      this._stage !== undefined
    );
  }

  canRetreat(): boolean {
    if (!this.isPokemonCard()) {
      return false;
    }
    // Check if card has a rule preventing retreat
    if (this._cardRules) {
      const hasRetreatBlock = this._cardRules.some(
        (rule) => rule.ruleType === CardRuleType.CANNOT_RETREAT,
      );
      if (hasRetreatBlock) {
        return false;
      }
    }
    return true;
  }

  hasAbility(): boolean {
    return this._ability !== undefined;
  }

  getAttackCount(): number {
    return this._attacks.length;
  }

  hasWeakness(): boolean {
    return this._weakness !== undefined;
  }

  hasResistance(): boolean {
    return this._resistance !== undefined;
  }

  // ========================================
  // Card Rules Methods
  // ========================================

  /**
   * Check if card has any rules
   */
  hasRules(): boolean {
    return !!this._cardRules && this._cardRules.length > 0;
  }

  /**
   * Get rules of a specific type
   */
  getRulesByType(ruleType: CardRuleType): CardRule[] {
    if (!this._cardRules) {
      return [];
    }
    return this._cardRules.filter((rule) => rule.ruleType === ruleType);
  }

  /**
   * Get rules sorted by priority (highest first)
   */
  getRulesByPriority(): CardRule[] {
    if (!this._cardRules) {
      return [];
    }
    return [...this._cardRules].sort(
      (a, b) => b.getPriorityValue() - a.getPriorityValue(),
    );
  }

  /**
   * Check if a specific rule type applies to this card
   */
  hasRuleType(ruleType: CardRuleType): boolean {
    if (!this._cardRules) {
      return false;
    }
    return this._cardRules.some((rule) => rule.ruleType === ruleType);
  }

  // ========================================
  // Validation
  // ========================================

  private validate(): void {
    if (!this._instanceId || this._instanceId.trim() === '') {
      throw new Error('Instance ID is required');
    }
    if (!this._cardId || this._cardId.trim() === '') {
      throw new Error('Card ID is required');
    }
    // Pokemon number is only required for Pokemon cards
    if (
      this._cardType === CardType.POKEMON &&
      (!this._pokemonNumber || this._pokemonNumber.trim() === '')
    ) {
      throw new Error('Pokemon number is required for Pokemon cards');
    }
    if (!this._name || this._name.trim() === '') {
      throw new Error('Card name is required');
    }
    if (!this._setName || this._setName.trim() === '') {
      throw new Error('Set name is required');
    }
    if (!this._cardNumber || this._cardNumber.trim() === '') {
      throw new Error('Card number is required');
    }
  }

  // ========================================
  // Factory Methods
  // ========================================

  static createPokemonCard(
    instanceId: string,
    cardId: string,
    pokemonNumber: string,
    name: string,
    setName: string,
    cardNumber: string,
    rarity: Rarity,
    description: string,
    artist: string,
    imageUrl: string,
  ): Card {
    return new Card(
      instanceId,
      cardId,
      pokemonNumber,
      name,
      setName,
      cardNumber,
      rarity,
      CardType.POKEMON,
      description,
      artist,
      imageUrl,
    );
  }

  static createTrainerCard(
    instanceId: string,
    cardId: string,
    pokemonNumber: string,
    name: string,
    setName: string,
    cardNumber: string,
    rarity: Rarity,
    description: string,
    artist: string,
    imageUrl: string,
  ): Card {
    return new Card(
      instanceId,
      cardId,
      pokemonNumber,
      name,
      setName,
      cardNumber,
      rarity,
      CardType.TRAINER,
      description,
      artist,
      imageUrl,
    );
  }

  static createEnergyCard(
    instanceId: string,
    cardId: string,
    pokemonNumber: string,
    name: string,
    setName: string,
    cardNumber: string,
    rarity: Rarity,
    description: string,
    artist: string,
    imageUrl: string,
  ): Card {
    return new Card(
      instanceId,
      cardId,
      pokemonNumber,
      name,
      setName,
      cardNumber,
      rarity,
      CardType.ENERGY,
      description,
      artist,
      imageUrl,
    );
  }

  /**
   * Create a Pokemon card from editor
   * Sets editor metadata (createdBy, createdAt, isEditorCreated)
   */
  static createFromEditor(
    instanceId: string,
    cardId: string,
    pokemonNumber: string,
    name: string,
    setName: string,
    cardNumber: string,
    rarity: Rarity,
    description: string,
    artist: string,
    imageUrl: string,
    createdBy: string,
    createdAt: Date = new Date(),
  ): Card {
    const card = new Card(
      instanceId,
      cardId,
      pokemonNumber,
      name,
      setName,
      cardNumber,
      rarity,
      CardType.POKEMON,
      description,
      artist,
      imageUrl,
    );
    card._createdBy = createdBy;
    card._createdAt = createdAt;
    card._isEditorCreated = true;
    return card;
  }
}
