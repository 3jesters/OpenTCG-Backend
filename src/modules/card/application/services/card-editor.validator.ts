import { Injectable, Inject, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ICardRepository } from '../../domain/repositories';
import { CreateCardRequestDto } from '../dto/create-card-request.dto';
import { EnergyType, PokemonType, EvolutionStage, AttackEffectType, AbilityActivationType, AbilityEffectType } from '../../domain/enums';
import { Weakness } from '../../domain/value-objects/weakness.value-object';
import { Resistance } from '../../domain/value-objects/resistance.value-object';
import { StatusCondition } from '../../domain/enums/status-condition.enum';

/**
 * Pokemon info for validation
 */
interface PokemonInfo {
  name: string;
  pokemonNumber: string;
}

/**
 * Card Editor Validator
 * Validates card creation/editing requests
 */
@Injectable()
export class CardEditorValidator {
  private pokemonCache: Map<string, PokemonInfo> | null = null;

  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  /**
   * Validate a card creation request
   */
  async validateCard(dto: CreateCardRequestDto): Promise<void> {
    // Load Pokemon list if not cached
    if (!this.pokemonCache) {
      await this.loadPokemonList();
    }

    // Validate Pokemon selection
    await this.validatePokemonSelection(dto.pokemonName, dto.pokemonNumber);

    // Validate attacks
    if (dto.attacks) {
      this.validateAttacks(dto.attacks);
    }

    // Validate ability
    if (dto.ability) {
      this.validateAbility(dto.ability);
    }

    // Validate weakness
    if (dto.weakness) {
      this.validateWeakness(dto.weakness);
    }

    // Validate resistance
    if (dto.resistance) {
      this.validateResistance(dto.resistance);
    }

    // Validate stage
    this.validateStage(dto.stage);

    // Validate pokemonType
    this.validatePokemonType(dto.pokemonType);
  }

  /**
   * Load Pokemon list from repository
   */
  private async loadPokemonList(): Promise<void> {
    const allCards = await this.cardRepository.findAll();
    const pokemonMap = new Map<string, PokemonInfo>();

    for (const card of allCards) {
      if (card.cardType === 'POKEMON' && card.pokemonNumber && card.name) {
        const key = `${card.name.toLowerCase()}-${card.pokemonNumber}`;
        if (!pokemonMap.has(key)) {
          pokemonMap.set(key, {
            name: card.name,
            pokemonNumber: card.pokemonNumber,
          });
        }
      }
    }

    this.pokemonCache = pokemonMap;
  }

  /**
   * Validate Pokemon selection
   */
  private async validatePokemonSelection(pokemonName: string, pokemonNumber: string): Promise<void> {
    if (!this.pokemonCache) {
      await this.loadPokemonList();
    }

    // Check if Pokemon exists in the list
    const key = `${pokemonName.toLowerCase()}-${pokemonNumber}`;
    const pokemon = this.pokemonCache!.get(key);

    if (!pokemon) {
      throw new UnprocessableEntityException(
        `Pokemon "${pokemonName}" with number "${pokemonNumber}" is not in the supported list. Please select a Pokemon from existing cards.`,
      );
    }

    // Verify name and number match
    if (pokemon.name !== pokemonName || pokemon.pokemonNumber !== pokemonNumber) {
      throw new UnprocessableEntityException(
        `Pokemon name "${pokemonName}" does not match Pokemon number "${pokemonNumber}".`,
      );
    }
  }

  /**
   * Validate attacks
   */
  private validateAttacks(attacks: CreateCardRequestDto['attacks']): void {
    if (!attacks || attacks.length === 0) {
      return; // Attacks are optional
    }

    if (attacks.length > 2) {
      throw new BadRequestException('Maximum 2 attacks allowed per Pokemon card.');
    }

    for (const attack of attacks) {
      // Validate energy types
      for (const energyType of attack.energyCost) {
        if (!Object.values(EnergyType).includes(energyType)) {
          throw new UnprocessableEntityException(`Invalid energy type: ${energyType}`);
        }
      }

      // Validate effects if present
      if (attack.effects) {
        for (const effect of attack.effects) {
          if (!Object.values(AttackEffectType).includes(effect.effectType)) {
            throw new UnprocessableEntityException(`Invalid attack effect type: ${effect.effectType}`);
          }

          // Validate status condition if present
          if (effect.effectType === AttackEffectType.STATUS_CONDITION) {
            if (effect.statusCondition && !Object.values(StatusCondition).includes(effect.statusCondition as StatusCondition)) {
              throw new UnprocessableEntityException(`Invalid status condition: ${effect.statusCondition}`);
            }
          }
        }
      }
    }
  }

  /**
   * Validate ability
   */
  private validateAbility(ability: CreateCardRequestDto['ability']): void {
    if (!ability) {
      return;
    }

    // Validate activation type
    if (!Object.values(AbilityActivationType).includes(ability.activationType)) {
      throw new UnprocessableEntityException(`Invalid ability activation type: ${ability.activationType}`);
    }

    // Validate effects if present
    if (ability.effects) {
      for (const effect of ability.effects) {
        if (!Object.values(AbilityEffectType).includes(effect.effectType)) {
          throw new UnprocessableEntityException(`Invalid ability effect type: ${effect.effectType}`);
        }
      }
    }
  }

  /**
   * Validate weakness
   */
  private validateWeakness(weakness: CreateCardRequestDto['weakness']): void {
    if (!weakness) {
      return;
    }

    // Weakness uses EnergyType, but DTO uses PokemonType (they're the same enum values)
    // We'll validate by trying to create a Weakness value object
    try {
      new Weakness(weakness.type as unknown as EnergyType, weakness.modifier);
    } catch (error) {
      throw new UnprocessableEntityException(`Invalid weakness: ${error.message}`);
    }
  }

  /**
   * Validate resistance
   */
  private validateResistance(resistance: CreateCardRequestDto['resistance']): void {
    if (!resistance) {
      return;
    }

    // Resistance uses EnergyType, but DTO uses PokemonType (they're the same enum values)
    // We'll validate by trying to create a Resistance value object
    try {
      new Resistance(resistance.type as unknown as EnergyType, resistance.modifier);
    } catch (error) {
      throw new UnprocessableEntityException(`Invalid resistance: ${error.message}`);
    }
  }

  /**
   * Validate stage
   */
  private validateStage(stage: EvolutionStage): void {
    if (!Object.values(EvolutionStage).includes(stage)) {
      throw new UnprocessableEntityException(`Invalid evolution stage: ${stage}`);
    }
  }

  /**
   * Validate pokemon type
   */
  private validatePokemonType(pokemonType: PokemonType): void {
    if (!Object.values(PokemonType).includes(pokemonType)) {
      throw new UnprocessableEntityException(`Invalid Pokemon type: ${pokemonType}`);
    }
  }
}

