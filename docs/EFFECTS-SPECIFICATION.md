# Effects Specification

This document specifies all effects that need to be supported in the game, based on analysis of existing card data.

## Table of Contents

1. [Status Effects](#status-effects)
2. [Damage Modifiers](#damage-modifiers)
3. [Damage Prevention/Reduction](#damage-preventionreduction)
4. [Self-Damage Effects](#self-damage-effects)
5. [Bench Damage Effects](#bench-damage-effects)

---

## Status Effects

### POISONED

**Card Examples**: 18 cards found
- Normal poison: 17 cards (Ivysaur, Kakuna, Koffing, etc.) - 10 damage per turn
- Special poison: 1 card (Nidoking - Toxic) - 20 damage per turn

**Mechanics**:
- Applied when attack with STATUS_CONDITION effect (POISONED) succeeds
- Can be applied via coin flip (if attack has coin flip condition)
- Default damage: 10 HP per turn
- Special case: Nidoking's Toxic attack applies 20 HP damage per turn
- Damage is applied between turns (after each player's turn ends)
- Affects both active and bench Pokemon
- Persists until:
  - Pokemon is knocked out
  - Pokemon retreats/switches (status clears on retreat)
  - Status is cured by trainer card or ability

**Implementation Requirements**:
1. Track poison damage amount (10 or 20) per Pokemon instance
2. Apply damage in `processBetweenTurnsStatusEffects()` method
3. Apply to all poisoned Pokemon (active + bench) for both players
4. Check for knockouts after applying poison damage
5. Clear status on retreat/switch

**Edge Cases**:
- Pokemon poisoned by multiple sources: Use highest damage amount (20 if any source was Toxic)
- Pokemon already poisoned and gets poisoned again: Update damage amount if new source is higher
- Poison damage reduces HP to 0: Knock out Pokemon, move to discard

---

### CONFUSED

**Card Examples**: 19 cards found
- All require coin flip to apply (e.g., "Flip a coin. If heads, the Defending Pokémon is now Confused.")

**Mechanics**:
- Applied when attack with STATUS_CONDITION effect (CONFUSED) succeeds (coin flip heads)
- Before attacking, confused Pokemon must flip a coin:
  - **Heads**: Attack proceeds normally, confusion status remains
  - **Tails**: Attack fails, Pokemon takes 30 self-damage, confusion status remains
- Confusion does NOT prevent attack attempts (unlike sleep/paralyze)
- Confusion persists until:
  - Pokemon retreats/switches (status clears)
  - Status is cured by trainer card or ability
  - Pokemon is knocked out

**Implementation Requirements**:
1. When ATTACK action is attempted on confused Pokemon:
   - Check if coin flip state exists for confusion
   - If not, create coin flip state with `CoinFlipContext.STATUS_CHECK`
   - Require GENERATE_COIN_FLIP action before attack can proceed
2. In GENERATE_COIN_FLIP handler:
   - If confusion coin flip: heads = proceed, tails = 30 self-damage + block attack
3. Confusion status does NOT block attack action itself (unlike sleep/paralyze)
4. Clear status on retreat/switch

**Edge Cases**:
- Confused Pokemon attempts attack: Must resolve coin flip first
- Coin flip tails: Apply 30 self-damage, don't proceed with attack
- Confused Pokemon with 30 or less HP: Self-damage may cause knockout

---

### ASLEEP

**Card Examples**: 12 cards found
- Some require coin flip to apply (e.g., Clefairy - Sing)
- Some apply directly (e.g., Haunter - Hypnosis)

**Mechanics**:
- Applied when attack with STATUS_CONDITION effect (ASLEEP) succeeds
- Asleep Pokemon cannot attack
- At start of turn (before DRAW_CARD), asleep Pokemon must flip a coin:
  - **Heads**: Pokemon wakes up (status becomes NONE), can attack normally
  - **Tails**: Pokemon remains asleep, cannot attack this turn
- Sleep persists until:
  - Coin flip succeeds (heads)
  - Pokemon retreats/switches (status clears)
  - Status is cured by trainer card or ability
  - Pokemon is knocked out

**Implementation Requirements**:
1. At turn start (in DRAW_CARD handler or turn initialization):
   - Check if active Pokemon is ASLEEP
   - If yes, create coin flip state with `CoinFlipContext.STATUS_CHECK`
   - Set `statusEffect: 'ASLEEP'` in coin flip state
   - Require GENERATE_COIN_FLIP action before other actions
2. In ATTACK handler:
   - If `statusEffect === ASLEEP`: Block attack (throw error)
   - Check if coin flip state exists - if not resolved, block attack
3. In GENERATE_COIN_FLIP handler:
   - If sleep wake-up coin flip: heads = wake up, tails = stay asleep
4. Clear status on retreat/switch

**Edge Cases**:
- Asleep Pokemon at turn start: Must resolve coin flip before any actions
- Multiple asleep Pokemon: Process active Pokemon first
- Asleep Pokemon on bench: Coin flip happens when it becomes active (if still asleep)

---

### PARALYZED

**Card Examples**: 24 cards found
- All require coin flip to apply (e.g., "Flip a coin. If heads, the Defending Pokémon is now Paralyzed.")

**Mechanics**:
- Applied when attack with STATUS_CONDITION effect (PARALYZED) succeeds (coin flip heads)
- Paralyzed Pokemon cannot attack
- Paralyzed Pokemon cannot retreat
- Status clears automatically at end of turn (after END_TURN action)
- If still paralyzed at start of next turn, coin flip to clear (similar to sleep)

**Implementation Requirements**:
1. In ATTACK handler:
   - If `statusEffect === PARALYZED`: Block attack (throw error)
2. In RETREAT handler (if exists):
   - If `statusEffect === PARALYZED`: Block retreat (throw error)
3. At end of turn (in END_TURN handler):
   - Clear PARALYZED status (set to NONE)
   - Or: Create coin flip state for next turn to clear (verify rules)
4. Clear status on switch (if forced switch occurs)

**Edge Cases**:
- Paralyzed Pokemon attempts attack: Block immediately
- Paralyzed Pokemon attempts retreat: Block immediately
- Status clears at end of turn automatically

---

### BURNED

**Card Examples**: 0 cards found in current sets (but enum exists)

**Mechanics** (based on standard Pokemon TCG rules):
- Applied when attack with STATUS_CONDITION effect (BURNED) succeeds
- Burned Pokemon takes 20 HP damage per turn
- Damage is applied between turns (after each player's turn ends)
- Affects both active and bench Pokemon
- Persists until:
  - Pokemon is knocked out
  - Pokemon retreats/switches (status clears)
  - Status is cured by trainer card or ability

**Implementation Requirements**:
1. Track burned status per Pokemon instance
2. Apply 20 HP damage in `processBetweenTurnsStatusEffects()` method
3. Apply to all burned Pokemon (active + bench) for both players
4. Check for knockouts after applying burn damage
5. Clear status on retreat/switch

---

## Damage Modifiers

### PLUS_DAMAGE (Energy-Based)

**Card Examples**: 12 cards found
- Blastoise - Hydro Pump: "Does 40 damage plus 10 more damage for each Water Energy attached to Blastoise but not used to pay for this attack's Energy cost."
- Mewtwo - Psychic: "Does 10 damage plus 10 more damage for each Energy card attached to the Defending Pokémon."
- Poliwrath - Water Gun: Similar to Blastoise

**Mechanics**:
- Base damage is calculated first
- Additional damage is calculated based on:
  - Attacker's attached energy (not used for attack cost)
  - Defender's attached energy
  - Other conditions (damage counters, etc.)
- Formula: `finalDamage = baseDamage + (energyCount * damagePerEnergy)`

**Implementation Requirements**:
1. In attack damage calculation (ATTACK and GENERATE_COIN_FLIP handlers):
   - Parse attack text or use structured effects to find DAMAGE_MODIFIER effects
   - Evaluate conditions (e.g., count energy cards)
   - Apply modifier: `damage += (energyCount * modifier)`
2. Apply modifiers BEFORE weakness/resistance calculations
3. Support multiple modifiers (additive)

**Edge Cases**:
- Energy used for attack cost: Don't count in "not used to pay" calculations
- Multiple energy types: Count all matching energy types
- Special energy: May provide multiple energy types

---

### PLUS_DAMAGE (Fixed/Coin Flip)

**Card Examples**: 18 cards found
- Nidoking - Thrash: "Flip a coin. If heads, this attack does 30 damage plus 10 more damage; if tails, this attack does 30 damage and Nidoking does 10 damage to itself."
- Electabuzz - Thunderpunch: Similar pattern

**Mechanics**:
- Base damage is calculated first
- Coin flip determines if bonus damage applies
- If heads: `finalDamage = baseDamage + bonusDamage`
- If tails: `finalDamage = baseDamage` (may also apply self-damage)

**Implementation Requirements**:
1. In coin flip attack handler:
   - After coin flip results are generated
   - Check if attack has DAMAGE_MODIFIER effect with coin flip condition
   - If heads: Apply bonus damage
   - If tails: Don't apply bonus (may apply self-damage instead)

---

## Damage Prevention/Reduction

### PREVENT_DAMAGE (All)

**Card Examples**: 17 cards found
- Chansey - Scrunch: "Flip a coin. If heads, prevent all damage done to Chansey during your opponent's next turn."
- Mewtwo - Barrier: "During your opponent's next turn, prevent all effects of attacks, including damage, done to Mewtwo."
- Raichu - Agility: Similar pattern

**Mechanics**:
- Applied when attack with PREVENT_DAMAGE effect succeeds
- Duration: "next_turn" (opponent's next turn) or "this_turn"
- Amount: "all" (prevent all damage) or number (prevent specific amount)
- Prevents damage from all attacks during specified duration
- May prevent "all effects" (damage + status effects) or just damage

**Implementation Requirements**:
1. Track PREVENT_DAMAGE effects in GameState:
   - Map: `PlayerIdentifier -> Map<instanceId, PreventDamageEffect>`
   - Store turn number when effect was applied
   - Store duration and amount
2. When calculating damage (before applying to Pokemon):
   - Check if Pokemon has active PREVENT_DAMAGE effect
   - If `amount === 'all'`: Set damage to 0
   - If `amount` is number: Reduce damage by that amount (min 0)
3. Expire effects:
   - Effects with `duration: 'next_turn'` expire at end of opponent's next turn
   - Clear expired effects in END_TURN handler

**Edge Cases**:
- Multiple prevent effects: Use most restrictive (all vs amount)
- Effect expires mid-turn: Check expiration before each attack
- "Prevent all effects": Block both damage and status effects

---

### PREVENT_DAMAGE (Amount)

**Card Examples**: 1 card found
- Graveler - Harden: "During your opponent's next turn, whenever 30 or less damage is done to Graveler (after applying Weakness and Resistance), prevent that damage."

**Mechanics**:
- Prevents damage only if damage amount is <= threshold (30 in example)
- Applied after weakness/resistance calculations
- Duration: "next_turn"

**Implementation Requirements**:
1. Similar to PREVENT_DAMAGE (all) but with condition
2. Check damage amount after weakness/resistance
3. If damage <= threshold: Prevent all damage
4. If damage > threshold: Apply full damage

---

### REDUCE_DAMAGE

**Card Examples**: 5 cards found
- Clefable - Minimize: "All damage done to Clefable during your opponent's next turn is reduced by 20 (after applying Weakness and Resistance)."
- Persian - Pounce: "If the Defending Pokémon attacks Persian during your opponent's next turn, any damage done by the attack is reduced by 10 (after applying Weakness and Resistance)."

**Mechanics**:
- Reduces incoming damage by fixed amount
- Applied after weakness/resistance calculations
- Duration: "next_turn" or conditional (e.g., "if attacked")
- Formula: `finalDamage = Math.max(0, damage - reductionAmount)`

**Implementation Requirements**:
1. Track REDUCE_DAMAGE effects in GameState (similar to PREVENT_DAMAGE)
2. When calculating damage (after weakness/resistance):
   - Check if Pokemon has active REDUCE_DAMAGE effect
   - Reduce damage by effect amount: `damage = Math.max(0, damage - reductionAmount)`
3. Expire effects at end of specified duration

**Edge Cases**:
- Multiple reduce effects: Additive reduction (reduce by sum of all amounts)
- Reduction > damage: Damage becomes 0 (not negative)

---

## Self-Damage Effects

**Card Examples**: 19 cards found
- Chansey - Double-edge: "Chansey does 80 damage to itself."
- Raichu - Thunder: "Flip a coin. If tails, Raichu does 30 damage to itself."
- Nidoking - Thrash: "If tails, this attack does 30 damage and Nidoking does 10 damage to itself."

**Mechanics**:
- Attacker takes damage after successful attack
- Can be fixed amount or coin flip dependent
- Applied after attack damage is dealt to defender
- May cause attacker to be knocked out

**Implementation Requirements**:
1. In attack handlers (ATTACK and GENERATE_COIN_FLIP):
   - After applying damage to defender
   - Check attack text or effects for self-damage
   - Parse self-damage amount (fixed or from coin flip)
   - Apply damage to attacker: `attackerHp = Math.max(0, attackerHp - selfDamage)`
   - Check for knockout, move to discard if HP = 0

**Edge Cases**:
- Self-damage causes knockout: Attacker is knocked out, move to discard
- Self-damage with coin flip: Only apply if coin flip condition met (tails)

---

## Bench Damage Effects

**Card Examples**: 26 cards found
- Magneton - Selfdestruct: "Does 20 damage to each Pokémon on each player's Bench."
- Dugtrio - Earthquake: "Does 10 damage to each of your own Benched Pokémon."

**Mechanics**:
- Attack deals damage to bench Pokemon in addition to (or instead of) active Pokemon
- Can target:
  - Opponent's bench only
  - Both players' benches
  - Attacker's own bench
- Damage is applied to all matching bench Pokemon
- Weakness/resistance may not apply to bench damage (check attack text)

**Implementation Requirements**:
1. In attack handlers:
   - Parse attack text for bench damage pattern
   - Calculate bench damage amount
   - Apply to all matching bench Pokemon:
     - Reduce HP: `benchHp = Math.max(0, benchHp - benchDamage)`
     - Check for knockouts
     - Move knocked out Pokemon to discard
     - Re-index bench positions

**Edge Cases**:
- Bench Pokemon knocked out: Move to discard, re-index bench
- Multiple bench Pokemon knocked out: Process all, then re-index
- Bench damage to attacker's own bench: Apply to own Pokemon

---

## Effect Interaction Rules

### Priority Order
1. Status effects are applied first (if from attack)
2. Damage modifiers are applied (plus damage)
3. Weakness/resistance calculations
4. Damage prevention/reduction
5. Self-damage (after defender damage)
6. Bench damage (after active damage)

### Status Effect Interactions
- **ASLEEP + CONFUSED**: Sleep takes priority (cannot attack at all)
- **PARALYZED + CONFUSED**: Paralyze takes priority (cannot attack at all)
- **POISONED + other status**: All statuses can coexist
- **Status on retreat**: All statuses clear when Pokemon retreats

### Damage Prevention vs Reduction
- PREVENT_DAMAGE (all) takes priority over REDUCE_DAMAGE
- Multiple REDUCE_DAMAGE effects: Additive (reduce by sum)
- PREVENT_DAMAGE (amount) + REDUCE_DAMAGE: Apply prevent first, then reduce remainder

---

## Implementation Checklist

### Status Effects
- [x] POISONED: Track damage amount (10/20), apply between turns
- [x] CONFUSED: Coin flip before attack, 30 self-damage on tails
- [x] ASLEEP: Coin flip at turn start, block attacks
- [x] PARALYZED: Block attacks, clear at end of turn
- [x] BURNED: 20 damage per turn, apply between turns

### Damage Modifiers
- [x] PLUS_DAMAGE (energy-based): Count energy, apply modifier
- [x] PLUS_DAMAGE (fixed/coin flip): Apply based on coin flip result

### Damage Prevention/Reduction
- [x] PREVENT_DAMAGE (all): Track in GameState, apply when calculating damage
- [x] PREVENT_DAMAGE (amount): Track with threshold, apply conditionally (if damage <= threshold, prevent all; otherwise apply full)
- [x] REDUCE_DAMAGE: Track in GameState, reduce damage by amount

### Other Effects
- [x] Self-damage: Apply after attack, check for knockout
- [x] Bench damage: Apply to bench Pokemon, handle knockouts
- [x] Resistance: Apply after weakness, reduce damage by fixed amount

### Between Turns Processing
- [x] Process poison damage (10 or 20 per Pokemon)
- [x] Process burn damage (20 per Pokemon)
- [x] Process sleep wake-up coin flips
- [x] Clear paralyzed status (if auto-clears)
- [x] Expire damage prevention/reduction effects

