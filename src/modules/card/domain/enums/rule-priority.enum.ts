/**
 * Rule Priority Enum
 * Defines the execution priority for card rules
 * 
 * When multiple rules apply simultaneously, they are evaluated in priority order:
 * HIGHEST → HIGH → NORMAL → LOW → LOWEST
 * 
 * This ensures consistent and predictable rule resolution.
 */
export enum RulePriority {
  /**
   * HIGHEST: Execute first
   * Use for: Critical game rules that override everything else
   * Example: "This Pokémon can't be affected by any effects"
   */
  HIGHEST = 'HIGHEST',

  /**
   * HIGH: Execute early
   * Use for: Important restrictions and immunities
   * Example: Damage immunity rules, status immunities
   */
  HIGH = 'HIGH',

  /**
   * NORMAL: Default priority
   * Use for: Most standard rules
   * Example: Energy cost modifications, retreat restrictions
   */
  NORMAL = 'NORMAL',

  /**
   * LOW: Execute late
   * Use for: Minor modifications
   * Example: Small damage adjustments
   */
  LOW = 'LOW',

  /**
   * LOWEST: Execute last
   * Use for: Conditional bonuses that shouldn't override other rules
   * Example: Situational energy cost reductions
   */
  LOWEST = 'LOWEST',
}

