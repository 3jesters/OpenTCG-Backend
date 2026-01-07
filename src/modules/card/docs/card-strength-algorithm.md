# Card Strength Calculation Algorithm

## Overview

The Card Strength Calculation Algorithm is a comprehensive system for assessing the balance and competitive viability of Pokémon cards. It evaluates cards based on multiple factors including HP, attacks, abilities, and various penalties/bonuses to produce a normalized score from 0-100.

**Purpose**: Provide an objective, quantitative assessment of card strength that aligns with competitive play patterns, particularly for the Base-Fossil format era of the Pokémon TCG.

## Core Calculation Components

### 1. HP Strength

The HP Strength component evaluates a card's defensive capabilities relative to its evolution stage.

**Formula**:
```
HP Strength = Evolution Value × HP × HP Efficiency Score
```

**Evolution Value Multipliers**:
- `BASIC`: 1.0 (full value)
- `STAGE_1`: 0.5 (half value - requires evolution setup)
- `STAGE_2`: 0.33 (one-third value - requires two evolutions)

**HP Efficiency Score (HPES)**:
- Base ratio: `HP / Expected HP for Stage`
- Expected HP by stage:
  - `BASIC`: 60 HP
  - `STAGE_1`: 80 HP
  - `STAGE_2`: 100 HP

**Weakness Modifier** (×2 weakness):
- Base penalty: -0.25
- Proportional penalty: -12% of HPES
- Total: `HPES -= (0.25 + HPES × 0.12)`

**Resistance Modifier**:
- **-30 resistance**:
  - Base bonus: +0.30
  - Proportional bonus: +18% of HPES
  - Total: `HPES += (0.30 + HPES × 0.18)`
- **-20 resistance**:
  - Base bonus: +0.18
  - Proportional bonus: +12% of HPES
  - Total: `HPES += (0.18 + HPES × 0.12)`

**Normalization**: Raw HP Strength (0-200) → Normalized (0-100)

### 2. Attack Strength

The Attack Strength component evaluates offensive capabilities, considering damage output, energy efficiency, effects, and drawbacks.

**Formula**:
```
Attack Efficiency = (Average Damage / Energy Cost) - Drawback Penalties - Energy Efficiency Penalty + Efficiency Bonus + Effect Bonuses
```

**Damage Parsing**:
- **Regular damage**: `"90"` → 90
- **Coin flip damage**: `"20×"` → 10 (50% average)
- **Energy bonus damage**: `"40+"` with `energyBonusCap: 2` → Average of min (40) and max (60) = 50
- **Combined damage**: `"30+20"` → 50

**Energy Cost**: Number of energy types in `energyCost` array

**Effect Value Scoring (EVS)**:
- **10 HP Poison**: +3 points
- **20 HP Poison**: +4 points
- **Paralysis**: +2 points
- **Confusion**: +2 points
- **Sleep**: +1.5 points
- **Burn**: +1 point
- **Generic defensive/utility**: +1 point

**Attack Efficiency Bonus**:
- **20+ damage/energy**: +10 points
- **15-19 damage/energy**: +6 points
- **12-14 damage/energy**: +3 points

**Normalization**: Raw Attack Strength (0-50) → Normalized (0-100)

### 3. Ability Strength

The Ability Strength component evaluates the value of Pokémon Powers/Abilities.

**Formula**:
```
Ability Strength = (1 / Evolution Value) × Base Ability Value (50)
```

**Evolution Stage Impact**:
- `BASIC`: 50 (full value)
- `STAGE_1`: 100 (double value - abilities more valuable on evolved forms)
- `STAGE_2`: 150 (triple value - abilities extremely valuable on final evolutions)

**Normalization**: Raw Ability Strength (0-150) → Normalized (0-100)

## Penalty System

### 1. Sustainability Penalty

Penalizes cards with self-damaging attacks that limit their usability.

**Self-Damage Percentage Thresholds**:
- **≥80% HP**: -30 points (lethal - can only use once)
- **≥66% HP**: -20 points (near-lethal - Chansey's case)
- **≥50% HP**: -12 points (high risk - can use twice at most)
- **≥33% HP**: -6 points (moderate risk - can use 2-3 times)
- **≥25% HP**: -3 points (low-moderate risk - can use 3-4 times)
- **<25% HP**: -1 point (low risk - can use many times)

**Mitigation**: If card has at least one attack without self-damage, penalty is reduced by 50%.

### 2. Attack Drawback Penalties

Penalties applied to individual attacks for negative effects:

**Self-Damage** (scaled by HP %):
- **≥50% HP**: -5 points
- **≥25% HP**: -3 points
- **<25% HP**: -1 point

**Self-Status Conditions**:
- **Asleep**: -2 points (cannot attack next turn)
- **Confused**: -2 points (50% chance to fail + 30 self-damage)
- **Paralyzed**: -3 points (cannot attack or retreat)

**Energy Discard**:
- **3+ or all energy**: -3 points
- **2 energy**: -2 points
- **1 energy**: -1 point

**Card Discard**: -1 to -2 points (capped at 2)

**Coin Flip Failure Risk**: -1 point (if tails causes negative effect)

**Cannot Attack Next Turn**: -3 points

**Cannot Retreat**: -1 point

**Coin Flip Penalty** (scaled by energy cost):
- **1-2 energy**: 1x base penalty (1 point)
- **3 energy**: 1.5x penalty (1.5 points)
- **4+ energy**: 2.5x penalty (2.5 points)
- **Efficiency reduction**: If attack is still efficient (≥15 damage/energy), penalty reduced by 50%

### 3. Evolution Dependency Penalty

Penalizes cards that require multiple evolutions to be useful.

**Three-Stage Evolution Lines**:
- **First forms** (Caterpie, Weedle): -5 points
- **Second forms** (Metapod, Kakuna): -3 points

### 4. Energy Efficiency Penalty

Penalizes high-cost attacks with low damage/energy ratios.

**Thresholds**:
- **4+ energy attacks**: Must do ≥10 damage/energy
- **3 energy attacks**: Must do ≥8 damage/energy

**Penalty**: 1 point per 2 points of inefficiency below threshold (max 5 points)

### 5. Prize Liability Penalty

Penalizes cards with very low HP relative to their evolution stage.

**Calculation**:
- If HP < 50% of expected HP for stage: Penalty applies
- Scale: 1 point per 0.1 deficit below 50% (max 5 points)

**Example**: STAGE_1 with 30 HP (expected 80):
- Ratio: 30/80 = 0.375 (37.5%)
- Deficit: 0.5 - 0.375 = 0.125
- Penalty: floor(0.125 × 10) = 1 point

### 6. Evolution Penalty

Explicit penalty for evolution stages (in addition to evolution value multiplier).

- **STAGE_2**: -8 points
- **STAGE_1**: -3 points
- **BASIC**: 0 points

## Bonus System

### 1. Retreat Cost Bonus

Rewards cards with low or free retreat costs.

- **Free retreat (0 cost)**: +5 points
- **Low retreat (1 cost)**: +2 points
- **High retreat (3+ cost)**: -2 points

### 2. Basic Pokémon Format Bonus

Rewards Basic Pokémon for format advantages in Base-Fossil era.

- **BASIC stage**: +5 points
- **STAGE_1/STAGE_2**: 0 points

## Normalization Process

### Step 1: Calculate Raw Totals

```
Raw Total = HP Strength (raw) + Attack Strength (raw) + Ability Strength (raw)
```

### Step 2: Normalize Based on Ability Presence

- **With ability**: Normalize to max 300 (HP 200 + Attack 50 + Ability 150)
- **Without ability**: Normalize to max 250 (HP 200 + Attack 50)

```
Normalized Total = (Raw Total / Normalization Max) × 100
```

### Step 3: Apply Penalties and Bonuses

```
Final Score = Normalized Total
  - Sustainability Penalty
  - Evolution Dependency Penalty
  - Prize Liability Penalty
  - Evolution Penalty
  + Retreat Cost Bonus
  + Basic Pokémon Bonus
```

### Step 4: Clamp to Valid Range

```
Final Score = max(0, min(100, Final Score))
```

## Balance Categories

The final score determines the balance category:

- **0-30**: `very_weak` - Effectively unplayable
- **31-45**: `weak` - Below average, niche use cases
- **46-54**: `balanced` - Average competitive viability
- **55-70**: `strong` - Above average, competitive staple
- **71-100**: `too_strong` - Meta-defining, potentially overpowered

## Example Calculation

### Example: Hitmonchan (Base Set)

**Card Stats**:
- HP: 70
- Stage: BASIC
- Attacks:
  - Jab: 1 energy, 20 damage
  - Special Punch: 3 energy, 40 damage
- Retreat Cost: 2
- Weakness: PSYCHIC ×2

**HP Strength**:
- Evolution Value: 1.0
- HPES: 70/60 = 1.167
- Weakness penalty: 1.167 - (0.25 + 1.167 × 0.12) = 0.757
- Raw: 1.0 × 70 × 0.757 = 52.99
- Normalized: (52.99 / 200) × 100 = 26.50

**Attack Strength**:
- Jab: 20/1 = 20 damage/energy → +10 efficiency bonus
- Special Punch: 40/3 = 13.33 damage/energy → +3 efficiency bonus
- Average: (20 + 10 + 13.33 + 3) / 2 = 23.17
- Normalized: (23.17 / 50) × 100 = 46.34

**Ability Strength**: 0 (no ability)

**Raw Total**: 52.99 + 23.17 + 0 = 76.16

**Normalization**: (76.16 / 250) × 100 = 30.46

**Penalties**:
- Sustainability: 0
- Evolution Dependency: 0
- Prize Liability: 0
- Evolution: 0

**Bonuses**:
- Retreat Cost: 0 (cost is 2, no bonus)
- Basic Pokémon: +5

**Final Score**: 30.46 + 5 = 35.46 → `weak` category

## Integration Guide

### Using the Service

```typescript
import { CardStrengthCalculatorService } from './domain/services/card-strength-calculator.service';
import { Card } from './domain/entities/card.entity';

const service = new CardStrengthCalculatorService();
const result = service.calculateStrength(card);

console.log(`Total Strength: ${result.totalStrength}/100`);
console.log(`Category: ${result.balanceCategory}`);
console.log(`Breakdown: HP=${result.breakdown.hpStrength}, Attack=${result.breakdown.attackStrength}, Ability=${result.breakdown.abilityStrength}`);
```

### Service Interface

```typescript
interface CardStrengthResult {
  totalStrength: number; // 0-100 normalized score
  balanceCategory: 'very_weak' | 'weak' | 'balanced' | 'strong' | 'too_strong';
  breakdown: {
    hpStrength: number;
    attackStrength: number;
    abilityStrength: number;
  };
  penalties: {
    sustainability: number;
    evolutionDependency: number;
    prizeLiability: number;
    evolution: number;
  };
  bonuses: {
    retreatCost: number;
    basicPokemon: number;
  };
}
```

## Algorithm Validation

The algorithm has been validated against canonical competitive rankings:

### S-Tier Cards (Meta-Defining)
- **Chansey**: Correctly ranked #1 (97.00/100)
- **Hitmonchan**: Ranked #31 (36.01/100) - Improved from #33
- **Electabuzz**: Ranked #34 (32.85/100) - Improved from #37

### A-Tier Cards (Top Competitive Staples)
- **Scyther**: Ranked #19 (46.06/100) - Improved from #24
- **Lapras**: Ranked #26 (38.65/100) - Improved from #27

### Bottom Tier (Effectively Unplayable)
- **Caterpie**: Ranked #183 (2.79/100) - Correctly identified
- **Weedle**: Ranked #182 (3.19/100) - Correctly identified
- **Magikarp**: Ranked #171 (6.28/100) - Correctly identified

## Notes

- The algorithm is designed for the Base-Fossil format era where Basics dominated due to Energy Removal and fast games
- Stage 2 Pokémon are heavily penalized due to setup time and vulnerability
- Coin flip dependency is penalized, but less harshly for efficient attacks
- Free retreat cost is highly valued (Scyther's key advantage)
- Extremely efficient attacks (20+ damage/energy) receive significant bonuses

## Future Enhancements

Potential improvements for future iterations:
- Format-specific adjustments (different eras may value different factors)
- Context-aware calculations (considering meta matchups)
- Ability effect evaluation (currently only presence is considered)
- Trainer card support (if needed)
- Energy card evaluation (if needed)

