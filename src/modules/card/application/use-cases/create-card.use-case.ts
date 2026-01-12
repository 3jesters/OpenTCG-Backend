import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ICardRepository } from '../../domain/repositories';
import { CardEditorValidator } from '../services/card-editor.validator';
import { CreateCardRequestDto } from '../dto/create-card-request.dto';
import { CardEditorResponseDto } from '../../presentation/dto/card-editor-response.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';
import { Card } from '../../domain/entities/card.entity';
import {
  Attack,
  Ability,
  Weakness,
  Resistance,
  Evolution,
} from '../../domain/value-objects';
import { AttackEffectFactory } from '../../domain/value-objects/attack-effect.value-object';
import { AbilityEffectFactory } from '../../domain/value-objects/ability-effect.value-object';
import { AttackEffectType } from '../../domain/enums/attack-effect-type.enum';
import { AbilityEffectType } from '../../domain/enums/ability-effect-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';
import { EnergyType, Rarity, EvolutionStage } from '../../domain/enums';
import { StatusCondition } from '../../domain/enums/status-condition.enum';
import { AttackEffectDto } from '../../presentation/dto/attack-effect.dto';
import { AbilityEffectDto } from '../../presentation/dto/ability-effect.dto';

/**
 * Create Card Use Case
 * Creates a new Pokemon card through the editor
 */
@Injectable()
export class CreateCardUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
    private readonly cardEditorValidator: CardEditorValidator,
  ) {}

  async execute(dto: CreateCardRequestDto): Promise<CardEditorResponseDto> {
    // Validate the card data
    await this.cardEditorValidator.validateCard(dto);

    // Generate IDs
    const instanceId = uuidv4();
    const cardId = this.generateCardId(dto.pokemonName, dto.pokemonNumber);
    const cardNumber = this.generateCardNumber();
    const createdAt = new Date();

    // Create the card entity using factory method
    const card = Card.createFromEditor(
      instanceId,
      cardId,
      dto.pokemonNumber,
      dto.pokemonName,
      'editor-created', // setName
      cardNumber,
      Rarity.COMMON, // Default rarity for editor-created cards
      '', // description
      'Editor', // artist
      '', // imageUrl
      dto.createdBy,
      createdAt,
    );

    // Set Pokemon type and stage
    card.setPokemonType(dto.pokemonType);
    card.setStage(dto.stage);

    // Set HP
    card.setHp(dto.hp);

    // Set retreat cost if provided
    if (dto.retreatCost !== undefined) {
      card.setRetreatCost(dto.retreatCost);
    }

    // Set weakness if provided
    if (dto.weakness) {
      const weakness = new Weakness(
        dto.weakness.type as unknown as EnergyType,
        dto.weakness.modifier,
      );
      card.setWeakness(weakness);
    }

    // Set resistance if provided
    if (dto.resistance) {
      const resistance = new Resistance(
        dto.resistance.type as unknown as EnergyType,
        dto.resistance.modifier,
      );
      card.setResistance(resistance);
    }

    // Add attacks if provided
    if (dto.attacks && dto.attacks.length > 0) {
      for (const attackDto of dto.attacks) {
        const attackEffects = attackDto.effects
          ? attackDto.effects.map((effectDto) =>
              this.convertAttackEffect(effectDto),
            )
          : undefined;

        const attack = new Attack(
          attackDto.name,
          attackDto.energyCost,
          attackDto.damage,
          attackDto.text,
          undefined, // preconditions
          attackEffects,
          attackDto.energyBonusCap,
        );
        card.addAttack(attack);
      }
    }

    // Set ability if provided
    if (dto.ability) {
      const abilityEffects = dto.ability.effects
        ? dto.ability.effects.map((effectDto) =>
            this.convertAbilityEffect(effectDto),
          )
        : [AbilityEffectFactory.drawCards(1)]; // Default effect if none provided

      const ability = new Ability(
        dto.ability.name,
        dto.ability.text,
        dto.ability.activationType,
        abilityEffects as any,
      );
      card.setAbility(ability);
    }

    // Set evolution if provided
    if (dto.evolvesFrom) {
      const evolution = new Evolution(
        dto.evolvesFrom.pokemonNumber,
        this.getEvolutionStageForPrevious(dto.stage),
        dto.evolvesFrom.name,
      );
      card.setEvolvesFrom(evolution);
    }

    // Save the card
    const savedCard = await this.cardRepository.save(card);

    // Convert to response DTO
    const detailDto = CardMapper.toCardDetailDto(savedCard);
    const responseDto = new CardEditorResponseDto();
    Object.assign(responseDto, detailDto);
    responseDto.createdBy = savedCard.createdBy!;
    responseDto.createdAt = savedCard.createdAt!;
    responseDto.isEditorCreated = savedCard.isEditorCreated;

    return responseDto;
  }

  /**
   * Generate cardId for editor-created cards
   * Format: editor-{pokemonName}-{pokemonNumber}
   */
  private generateCardId(pokemonName: string, pokemonNumber: string): string {
    const nameKebab = this.toKebabCase(pokemonName);
    return `editor-${nameKebab}-${pokemonNumber}`;
  }

  /**
   * Generate card number (timestamp-based for uniqueness)
   */
  private generateCardNumber(): string {
    return Date.now().toString();
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get evolution stage for previous evolution
   */
  private getEvolutionStageForPrevious(
    currentStage: EvolutionStage,
  ): EvolutionStage {
    switch (currentStage) {
      case EvolutionStage.STAGE_1:
        return EvolutionStage.BASIC;
      case EvolutionStage.STAGE_2:
        return EvolutionStage.STAGE_1;
      default:
        return EvolutionStage.BASIC;
    }
  }

  /**
   * Convert AttackEffectDto to AttackEffect domain object
   */
  private convertAttackEffect(effectDto: AttackEffectDto): any {
    switch (effectDto.effectType) {
      case AttackEffectType.DISCARD_ENERGY:
        return AttackEffectFactory.discardEnergy(
          (effectDto.target as TargetType.SELF | TargetType.DEFENDING) ||
            TargetType.SELF,
          effectDto.amount || 1,
          effectDto.energyType,
        );

      case AttackEffectType.STATUS_CONDITION:
        if (!effectDto.statusCondition) {
          throw new Error('STATUS_CONDITION effect requires statusCondition');
        }
        // STATUS_CONDITION always targets DEFENDING (opponent active Pokemon)
        return AttackEffectFactory.statusCondition(effectDto.statusCondition);

      case AttackEffectType.DAMAGE_MODIFIER:
        return AttackEffectFactory.damageModifier(effectDto.modifier || 0);

      case AttackEffectType.HEAL:
        return AttackEffectFactory.heal(
          (effectDto.target as TargetType.SELF | TargetType.DEFENDING) ||
            TargetType.SELF,
          effectDto.healAmount || 0,
        );

      case AttackEffectType.PREVENT_DAMAGE:
        return AttackEffectFactory.preventDamage(
          (effectDto.target as TargetType.SELF | TargetType.DEFENDING) ||
            TargetType.SELF,
          (effectDto.duration as 'next_turn' | 'this_turn') || 'next_turn',
          effectDto.amount,
        );

      case AttackEffectType.RECOIL_DAMAGE:
        return AttackEffectFactory.recoilDamage(effectDto.recoilAmount || 0);

      case AttackEffectType.ENERGY_ACCELERATION:
        return AttackEffectFactory.energyAcceleration(
          (effectDto.target as TargetType.SELF | TargetType.BENCHED_YOURS) ||
            TargetType.SELF,
          (effectDto.source as 'deck' | 'discard' | 'hand') || 'deck',
          effectDto.count || 1,
          effectDto.energyType,
          effectDto.selector as 'choice' | 'random',
        );

      case AttackEffectType.SWITCH_POKEMON:
        return AttackEffectFactory.switchPokemon(
          (effectDto.selector as 'choice' | 'random') || 'choice',
        );

      default:
        throw new Error(
          `Unsupported attack effect type: ${effectDto.effectType}`,
        );
    }
  }

  /**
   * Convert AbilityEffectDto to AbilityEffect domain object
   */
  private convertAbilityEffect(effectDto: AbilityEffectDto): any {
    // This is a simplified version - handles common ability effect types
    // Full implementation would handle all ability effect types
    switch (effectDto.effectType) {
      case AbilityEffectType.HEAL:
        return AbilityEffectFactory.heal(
          (effectDto.target as any) || TargetType.SELF,
          (effectDto.amount as number) || 0,
        );

      case AbilityEffectType.DRAW_CARDS:
        return AbilityEffectFactory.drawCards((effectDto.count as number) || 1);

      case AbilityEffectType.ENERGY_ACCELERATION:
        return AbilityEffectFactory.energyAcceleration(
          (effectDto.target as any) || TargetType.SELF,
          effectDto.source as any,
          (effectDto.count as number) || 1,
          effectDto.energyType,
          {
            targetPokemonType: effectDto.targetPokemonType,
            sourcePokemonType: effectDto.sourcePokemonType,
            sourcePokemonTarget: effectDto.sourcePokemonTarget,
            selector: effectDto.selector,
          },
        );

      case AbilityEffectType.SEARCH_DECK:
        return AbilityEffectFactory.searchDeck(
          (effectDto.count as number) || 1,
          effectDto.destination as any,
          {
            cardType: effectDto.cardType,
            pokemonType: effectDto.pokemonType,
            selector: effectDto.selector,
          },
        );

      case AbilityEffectType.BOOST_ATTACK:
        return AbilityEffectFactory.boostAttack(
          (effectDto.target as any) || TargetType.SELF,
          effectDto.modifier || 0,
          effectDto.affectedTypes,
        );

      case AbilityEffectType.BOOST_HP:
        return AbilityEffectFactory.boostHP(
          (effectDto.target as any) || TargetType.SELF,
          effectDto.modifier || 0,
        );

      case AbilityEffectType.REDUCE_DAMAGE:
        return AbilityEffectFactory.reduceDamage(
          (effectDto.target as any) || TargetType.SELF,
          (effectDto.amount as number) || 0,
        );

      case AbilityEffectType.STATUS_CONDITION:
        return AbilityEffectFactory.statusCondition(
          (effectDto.statusCondition as StatusCondition) ||
            StatusCondition.PARALYZED,
          (effectDto.target as any) || TargetType.DEFENDING,
        );

      case AbilityEffectType.PREVENT_DAMAGE:
        return AbilityEffectFactory.preventDamage(
          (effectDto.target as any) || TargetType.SELF,
          effectDto.duration as any,
          effectDto.amount,
        );

      case AbilityEffectType.SWITCH_POKEMON:
        return AbilityEffectFactory.switchPokemon(effectDto.selector as any);

      default:
        // For unsupported types, create a simple draw cards effect as fallback
        return AbilityEffectFactory.drawCards(1);
    }
  }
}
