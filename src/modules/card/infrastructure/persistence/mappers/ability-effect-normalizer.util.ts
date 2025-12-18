import { AbilityEffectType } from '../../../domain/enums/ability-effect-type.enum';
import { TargetType } from '../../../domain/enums/target-type.enum';

/**
 * Ability Effect Normalizer Utility
 * Normalizes ability effects to fix invalid targets (e.g., DEFENDING in HEAL effects)
 * Used by both file-based and database-based card loading
 */
export class AbilityEffectNormalizer {
  /**
   * Normalize ability effects to fix invalid targets
   * Converts invalid targets to valid ones based on effect type
   */
  static normalize(effects: any[]): any[] {
    return effects.map((effect) => {
      if (!effect || !effect.effectType) {
        return effect;
      }

      // Check if this is a HEAL effect (handle both enum and string values)
      const isHealEffect =
        effect.effectType === AbilityEffectType.HEAL ||
        (typeof effect.effectType === 'string' &&
          effect.effectType.toUpperCase() === 'HEAL');

      // HEAL effects in abilities cannot use DEFENDING target
      // Convert DEFENDING or missing target to SELF (most reasonable default)
      if (isHealEffect) {
        const validTargets = [
          TargetType.SELF,
          TargetType.ALL_YOURS,
          TargetType.BENCHED_YOURS,
          TargetType.ACTIVE_YOURS,
        ];

        // Normalize target: handle missing, null, undefined, or invalid values
        const currentTarget = effect.target;

        // Check if target is explicitly DEFENDING (case-insensitive)
        const isDefending =
          currentTarget === TargetType.DEFENDING ||
          (typeof currentTarget === 'string' &&
            currentTarget.toUpperCase() === 'DEFENDING');

        // Check if target is valid (handle both enum and string values)
        const isValidTarget =
          currentTarget &&
          !isDefending &&
          validTargets.includes(currentTarget as TargetType);

        if (!isValidTarget || isDefending) {
          // Convert invalid, missing, or DEFENDING target to SELF
          return {
            ...effect,
            target: TargetType.SELF,
          };
        }
      }

      return effect;
    });
  }
}

