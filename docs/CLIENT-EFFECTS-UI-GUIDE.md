# Client Effects UI Guide

This document describes UI/modal requirements, status indicators, and user interaction flows for the new status effects, damage modifiers, and damage prevention/reduction mechanics.

## Table of Contents

1. [Status Effect Indicators](#status-effect-indicators)
2. [Modal Requirements](#modal-requirements)
3. [User Interaction Flows](#user-interaction-flows)
4. [Visual Feedback](#visual-feedback)
5. [Between-Turns Processing](#between-turns-processing)

## Status Effect Indicators

### Visual Indicators

Each Pokemon card should display status effect indicators:

#### POISONED
- **Icon:** Purple/purple-green droplet or skull icon
- **Color:** Purple/purple-green
- **Text:** "POISONED" or "PSN"
- **Additional Info:** Show poison damage amount (10 or 20) if available
- **Animation:** Subtle pulsing or glow effect

#### CONFUSED
- **Icon:** Swirling/spinning stars or question marks
- **Color:** Yellow/orange
- **Text:** "CONFUSED" or "CNF"
- **Additional Info:** Show "Coin flip required" indicator when attack attempted

#### ASLEEP
- **Icon:** Z's or closed eyes
- **Color:** Blue/light blue
- **Text:** "ASLEEP" or "SLP"
- **Additional Info:** Show "Cannot attack" indicator

#### PARALYZED
- **Icon:** Lightning bolt or zigzag lines
- **Color:** Yellow/gold
- **Text:** "PARALYZED" or "PAR"
- **Additional Info:** Show "Cannot attack" indicator

#### BURNED
- **Icon:** Flame or fire icon
- **Color:** Red/orange
- **Text:** "BURNED" or "BRN"
- **Additional Info:** None

### Placement

- **Active Pokemon:** Status indicator should be prominently displayed (top-right corner or below HP)
- **Bench Pokemon:** Smaller status indicator (icon only or abbreviated text)
- **Hover/Tooltip:** Show full status effect name and details on hover

## Modal Requirements

### Sleep Wake-Up Modal

**Trigger:** When `coinFlipState.context === 'STATUS_CHECK' && coinFlipState.statusEffect === 'ASLEEP'`

**Display:**
- Title: "Pokemon is Asleep"
- Message: "Flip a coin to see if [Pokemon Name] wakes up."
- Pokemon image/name
- Coin flip button: "Flip Coin"
- Cannot be dismissed (must flip coin)

**After Coin Flip:**
- **Heads:** 
  - Message: "[Pokemon Name] woke up!"
  - Button: "Continue" (closes modal)
  - Allow normal turn actions
- **Tails:**
  - Message: "[Pokemon Name] is still asleep."
  - Button: "Continue" (closes modal)
  - Block ATTACK action

**Blocking Behavior:**
- Block all actions except `GENERATE_COIN_FLIP` and `CONCEDE`
- Show modal immediately when turn starts if Pokemon is asleep
- Prevent dismissing without flipping coin

### Confusion Coin Flip Modal

**Trigger:** When player attempts `ATTACK` with confused Pokemon and `coinFlipState` is created

**Display:**
- Title: "Confusion Check"
- Message: "[Pokemon Name] is confused! Flip a coin to see if the attack succeeds."
- Pokemon image/name
- Coin flip button: "Flip Coin"
- Cannot be dismissed (must flip coin)

**After Coin Flip:**
- **Heads:**
  - Message: "Success! [Pokemon Name] attacks normally."
  - Button: "Continue" (closes modal, proceeds with attack)
  - Attack proceeds
- **Tails:**
  - Message: "Attack failed! [Pokemon Name] takes 30 self-damage and cannot attack this turn."
  - Show HP reduction animation
  - Button: "Continue" (closes modal)
  - Attack does not proceed

**Blocking Behavior:**
- Block `ATTACK` action until coin flip resolved
- Show modal when attack attempted on confused Pokemon
- Prevent dismissing without flipping coin

## User Interaction Flows

### Flow 1: Sleep Wake-Up at Turn Start

```
1. Turn starts (DRAW phase)
   ↓
2. Check if active Pokemon is ASLEEP
   ↓
3. If asleep:
   - Show Sleep Wake-Up Modal
   - Block all actions except GENERATE_COIN_FLIP
   ↓
4. User clicks "Flip Coin"
   ↓
5. Send GENERATE_COIN_FLIP request
   ↓
6. Receive coin flip result
   ↓
7. If heads:
   - Show "Pokemon woke up!" message
   - Close modal
   - Allow normal turn actions (DRAW_CARD, ATTACK, etc.)
   ↓
8. If tails:
   - Show "Pokemon still asleep" message
   - Close modal
   - Block ATTACK action
   - Allow other actions (DRAW_CARD, END_TURN, etc.)
```

### Flow 2: Confused Pokemon Attack

```
1. User clicks "Attack" button
   ↓
2. Check if active Pokemon is CONFUSED
   ↓
3. If confused:
   - Send ATTACK request
   - Server creates coinFlipState
   ↓
4. Receive response with coinFlipState
   ↓
5. Show Confusion Coin Flip Modal
   ↓
6. User clicks "Flip Coin"
   ↓
7. Send GENERATE_COIN_FLIP request
   ↓
8. Receive coin flip result
   ↓
9. If heads:
   - Show "Attack succeeds!" message
   - Close modal
   - Proceed with attack (show attack animation)
   ↓
10. If tails:
    - Show "Attack failed! 30 self-damage" message
    - Show HP reduction animation
    - Close modal
    - Attack does not proceed
    - Update Pokemon HP display
```

### Flow 3: Poison Damage Between Turns

```
1. Player clicks "End Turn"
   ↓
2. Send END_TURN request
   ↓
3. Server processes between-turns effects
   ↓
4. Receive updated match state
   ↓
5. Check for status effect changes
   ↓
6. If Pokemon is POISONED:
   - Show poison damage animation
   - Display: "[Pokemon Name] takes 10 (or 20) poison damage!"
   - Update HP bar
   - Check for knockout
   ↓
7. If Pokemon knocked out:
   - Show knockout animation
   - Move to discard pile
   - Handle prize card selection if needed
```

### Flow 4: Status Effect Applied from Attack

```
1. Player attacks opponent Pokemon
   ↓
2. Attack succeeds (damage applied)
   ↓
3. Check attack effects for STATUS_CONDITION
   ↓
4. If status effect applied:
   - Show status effect animation on target Pokemon
   - Display: "[Opponent Pokemon] is now [STATUS]!"
   - Update status indicator on opponent's Pokemon
   ↓
5. If POISONED:
   - Show poison icon
   - Display poison damage amount (10 or 20) if available
```

## Visual Feedback

### Status Effect Animations

#### When Status Applied
- **POISONED:** Purple/purple-green particle effect or cloud
- **CONFUSED:** Swirling stars or question marks animation
- **ASLEEP:** Z's floating up or eyes closing animation
- **PARALYZED:** Lightning bolt flash or electric spark
- **BURNED:** Flame effect or smoke

#### During Status Effect
- **POISONED:** Subtle pulsing glow (purple/purple-green)
- **CONFUSED:** Subtle spinning/swirling effect
- **ASLEEP:** Gentle breathing animation or Z's floating
- **PARALYZED:** Occasional spark/static effect
- **BURNED:** Flickering flame or smoke

### Damage Feedback

#### Poison/Burn Damage
- Show damage number floating up: "-10" or "-20"
- Color: Red for damage
- HP bar animation: Smoothly reduce HP bar
- Sound effect: Optional damage sound

#### Confusion Self-Damage
- Show damage number: "-30"
- Color: Red (or different color to indicate self-damage)
- HP bar animation
- Shake or impact effect on Pokemon card
- Sound effect: Optional "fail" or "hurt" sound

### Coin Flip Feedback

#### Coin Flip Animation
- Show coin spinning/flipping animation
- Duration: 1-2 seconds
- Sound effect: Coin flipping sound

#### Result Display
- **Heads:** Show heads side, green checkmark or success indicator
- **Tails:** Show tails side, red X or failure indicator
- Display result text: "Heads!" or "Tails!"

## Between-Turns Processing

### Status Effect Processing Display

When `END_TURN` is called and between-turns effects are processed:

1. **Show Processing Indicator:**
   - Overlay: "Processing status effects..."
   - Disable all actions during processing

2. **Process Each Effect:**
   - **Poison Damage:**
     - Show: "[Pokemon Name] takes 10 (or 20) poison damage!"
     - Animation: HP reduction
     - Check for knockout
   - **Burn Damage:**
     - Show: "[Pokemon Name] takes 20 burn damage!"
     - Animation: HP reduction
     - Check for knockout
   - **Sleep Wake-Up:**
     - If active Pokemon is asleep, create coin flip state
     - Show Sleep Wake-Up Modal (if active Pokemon)
   - **Paralyze Clear:**
     - Show: "[Pokemon Name] is no longer Paralyzed!"
     - Remove status indicator

3. **Update Display:**
   - Update all Pokemon HP bars
   - Update status indicators
   - Update knockout states
   - Show prize card selection if knockouts occurred

4. **Complete Processing:**
   - Remove processing overlay
   - Enable actions for next player's turn

### Animation Timing

- **Between-turns processing:** 2-3 seconds total
- **Individual effect animations:** 0.5-1 second each
- **HP bar updates:** Smooth animation over 0.5 seconds
- **Status indicator updates:** Fade in/out over 0.3 seconds

## UI State Management

### Action Button States

#### Attack Button
- **Normal:** Enabled (green/primary color)
- **Blocked (ASLEEP/PARALYZED):** Disabled (gray), tooltip: "Cannot attack while [STATUS]"
- **Requires Coin Flip (CONFUSED):** Enabled but shows warning, tooltip: "Coin flip required"

#### End Turn Button
- **Normal:** Enabled
- **During Status Processing:** Disabled
- **During Coin Flip Modal:** Disabled (if blocking)

### Status Indicator States

- **Active:** Full opacity, animated
- **Inactive (cured):** Fade out animation, remove after 0.5 seconds
- **Newly Applied:** Fade in animation, highlight briefly

## Accessibility Considerations

### Screen Reader Support
- Announce status effect changes: "[Pokemon Name] is now [STATUS]"
- Announce coin flip results: "Coin flip result: [Heads/Tails]"
- Announce damage: "[Pokemon Name] takes [X] damage"
- Announce action blocks: "Cannot attack: Pokemon is [STATUS]"

### Keyboard Navigation
- Modal coin flip buttons should be keyboard accessible
- Tab order: Coin flip button → Continue button
- Escape key: Should not close modals (must complete coin flip)

### Color Contrast
- Status effect icons should have sufficient contrast
- Status effect text should be readable
- Damage numbers should be clearly visible

## Error Handling

### Network Errors During Coin Flip
- Show error message: "Failed to flip coin. Please try again."
- Keep modal open
- Allow retry

### Invalid State Errors
- Show error message from server
- Log error for debugging
- Allow user to refresh match state if needed

## Best Practices

1. **Always check `coinFlipState`** before allowing actions
2. **Show modals immediately** when required (don't wait for user interaction)
3. **Provide clear feedback** for all status effect changes
4. **Animate transitions** smoothly (don't jump between states)
5. **Handle edge cases** gracefully (e.g., Pokemon knocked out during status processing)
6. **Test all status effect combinations** (e.g., confused + poisoned Pokemon)

