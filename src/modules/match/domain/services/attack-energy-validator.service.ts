import { EnergyType, CardType } from '../../../card/domain/enums';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { EnergyProvision } from '../../../card/domain/value-objects/energy-provision.value-object';

/**
 * Interface for energy card data used in validation
 * Compatible with both Card entity and CardDetailDto
 */
interface EnergyCardData {
  cardType: CardType;
  energyType?: EnergyType;
  energyProvision?: EnergyProvision;
}

/**
 * Attack Energy Validator Service
 * Validates that a Pokemon has sufficient energy attached to use an attack
 */
export class AttackEnergyValidatorService {
  /**
   * Validate that the attached energy cards satisfy the attack's energy cost
   * @param attack The attack to validate
   * @param attachedEnergyCards Array of energy card data attached to the Pokemon
   * @returns true if energy requirements are met, false otherwise
   * @throws Error if validation fails with details
   */
  validateEnergyRequirements(
    attack: Attack,
    attachedEnergyCards: EnergyCardData[],
  ): { isValid: boolean; error?: string } {
    const requiredEnergy = attack.energyCost;

    // If attack has no energy cost, it's always valid
    if (!requiredEnergy || requiredEnergy.length === 0) {
      return { isValid: true };
    }

    // Count required energy by type
    const requiredCounts = this.countEnergyByType(requiredEnergy);

    // Get available energy from attached cards
    const availableEnergy = this.extractEnergyFromCards(attachedEnergyCards);

    // Check if requirements are met
    return this.checkEnergySatisfaction(requiredCounts, availableEnergy);
  }

  /**
   * Count energy requirements by type
   */
  private countEnergyByType(energyCost: EnergyType[]): Map<EnergyType, number> {
    const counts = new Map<EnergyType, number>();

    for (const energyType of energyCost) {
      counts.set(energyType, (counts.get(energyType) || 0) + 1);
    }

    return counts;
  }

  /**
   * Extract energy types from attached energy cards
   */
  private extractEnergyFromCards(energyCards: EnergyCardData[]): EnergyType[] {
    const energyTypes: EnergyType[] = [];

    for (const card of energyCards) {
      if (card.cardType !== CardType.ENERGY) {
        continue; // Skip non-energy cards
      }

      // Check if card has energyProvision (special energy)
      if (card.energyProvision) {
        const provision = card.energyProvision;
        // Add energy types based on amount provided
        for (let i = 0; i < provision.amount; i++) {
          // For special energy, add all types it provides
          energyTypes.push(...provision.energyTypes);
        }
      } else if (card.energyType) {
        // Basic energy card
        energyTypes.push(card.energyType);
      }
    }

    return energyTypes;
  }

  /**
   * Check if available energy satisfies required energy
   * COLORLESS energy can be satisfied by any energy type
   */
  private checkEnergySatisfaction(
    requiredCounts: Map<EnergyType, number>,
    availableEnergy: EnergyType[],
  ): { isValid: boolean; error?: string } {
    // Create a working copy of available energy
    const available = [...availableEnergy];
    const required = new Map(requiredCounts);

    // First, satisfy non-COLORLESS requirements with exact matches
    for (const [energyType, count] of Array.from(required.entries())) {
      if (energyType === EnergyType.COLORLESS) {
        continue; // Handle COLORLESS separately
      }

      let remaining = count;
      for (let i = available.length - 1; i >= 0 && remaining > 0; i--) {
        if (available[i] === energyType) {
          available.splice(i, 1);
          remaining--;
        }
      }

      if (remaining > 0) {
        return {
          isValid: false,
          error: `Attack requires ${count} ${energyType} Energy, but only ${count - remaining} is attached`,
        };
      }
    }

    // Now satisfy COLORLESS requirements with any remaining energy
    const colorlessCount = required.get(EnergyType.COLORLESS) || 0;
    if (colorlessCount > 0) {
      if (available.length < colorlessCount) {
        return {
          isValid: false,
          error: `Attack requires ${colorlessCount} COLORLESS Energy, but only ${available.length} energy cards are available`,
        };
      }
    }

    return { isValid: true };
  }
}
