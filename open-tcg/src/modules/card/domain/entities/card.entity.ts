import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  TrainerType,
  EnergyType,
} from '../enums';
import {
  Weakness,
  Resistance,
  Evolution,
  Attack,
  Ability,
  CardRule,
} from '../value-objects';

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
  private readonly _pokemonNumber: string; // Pokédex number
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
  private _level?: number; // Numeric level (optional)
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
  private _trainerEffect?: string;

  // ========================================
  // Energy Card Specific
  // ========================================
  private _energyType?: EnergyType;
  private _isSpecialEnergy: boolean;
  private _specialEnergyEffect?: string;

  // ========================================
  // Metadata
  // ========================================
  private _description: string;
  private _artist: string;
  private _imageUrl: string;
  private _regulationMark?: string;

  constructor(
    instanceId: string,
    cardId: string,
    pokemonNumber: string,
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
    this._isSpecialEnergy = false;

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

  get pokemonNumber(): string {
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

  get trainerEffect(): string | undefined {
    return this._trainerEffect;
  }

  get energyType(): EnergyType | undefined {
    return this._energyType;
  }

  get isSpecialEnergy(): boolean {
    return this._isSpecialEnergy;
  }

  get specialEnergyEffect(): string | undefined {
    return this._specialEnergyEffect;
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
    if (level < 0) {
      throw new Error('Level cannot be negative');
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
    this._cardRules = rules;
  }

  setTrainerType(type: TrainerType): void {
    if (this._cardType !== CardType.TRAINER) {
      throw new Error('Trainer type can only be set on Trainer cards');
    }
    this._trainerType = type;
  }

  setTrainerEffect(effect: string): void {
    if (this._cardType !== CardType.TRAINER) {
      throw new Error('Trainer effect can only be set on Trainer cards');
    }
    this._trainerEffect = effect;
  }

  setEnergyType(type: EnergyType): void {
    if (this._cardType !== CardType.ENERGY) {
      throw new Error('Energy type can only be set on Energy cards');
    }
    this._energyType = type;
  }

  setIsSpecialEnergy(isSpecial: boolean): void {
    if (this._cardType !== CardType.ENERGY) {
      throw new Error('Special energy flag can only be set on Energy cards');
    }
    this._isSpecialEnergy = isSpecial;
  }

  setSpecialEnergyEffect(effect: string): void {
    if (this._cardType !== CardType.ENERGY) {
      throw new Error('Special energy effect can only be set on Energy cards');
    }
    if (!this._isSpecialEnergy) {
      throw new Error('Can only set special effect on special energy cards');
    }
    this._specialEnergyEffect = effect;
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
        (rule) => rule.ruleType === 'CANNOT_RETREAT',
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
  // Validation
  // ========================================

  private validate(): void {
    if (!this._instanceId || this._instanceId.trim() === '') {
      throw new Error('Instance ID is required');
    }
    if (!this._cardId || this._cardId.trim() === '') {
      throw new Error('Card ID is required');
    }
    if (!this._pokemonNumber || this._pokemonNumber.trim() === '') {
      throw new Error('Pokemon number is required');
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
}

