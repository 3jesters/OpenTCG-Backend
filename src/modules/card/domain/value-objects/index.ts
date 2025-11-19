export * from './weakness.value-object';
export * from './resistance.value-object';
export * from './evolution.value-object';
export { Attack } from './attack.value-object';
export { Ability } from './ability.value-object';

// Card Rules
export { CardRule, CardRuleFactory } from './card-rule.value-object';
export type {
  RuleMetadata,
  MovementRuleMetadata,
  AttackRuleMetadata,
  DamageRuleMetadata,
  StatusRuleMetadata,
  PrizeRuleMetadata,
  EvolutionRuleMetadata,
  PlayRuleMetadata,
  EnergyRuleMetadata,
} from './card-rule.value-object';

// Attack Preconditions
export {
  AttackPreconditionFactory,
} from './attack-precondition.value-object';
export type {
  AttackPrecondition,
  CoinFlipValue,
  DamageCheckValue,
  EnergyCheckValue,
} from './attack-precondition.value-object';

// Conditions (Generic)
export {
  ConditionFactory,
  ConditionHelper,
} from './condition.value-object';
export type {
  Condition,
  ConditionValue,
} from './condition.value-object';

// Attack Effects
export {
  AttackEffectFactory,
} from './attack-effect.value-object';
export type {
  AttackEffect,
  DiscardEnergyEffect,
  StatusConditionEffect,
  DamageModifierEffect,
  HealEffect,
  PreventDamageEffect,
  RecoilDamageEffect,
  EnergyAccelerationEffect,
  SwitchPokemonEffect,
} from './attack-effect.value-object';

// Ability Effects
export {
  AbilityEffectFactory,
} from './ability-effect.value-object';
export type {
  AbilityEffect,
  HealAbilityEffect,
  PreventDamageAbilityEffect,
  StatusConditionAbilityEffect,
  EnergyAccelerationAbilityEffect,
  SwitchPokemonAbilityEffect,
  DrawCardsEffect,
  SearchDeckEffect,
  BoostAttackEffect,
  BoostHPEffect,
  ReduceDamageEffect,
  DiscardFromHandEffect,
  AttachFromDiscardEffect,
  RetrieveFromDiscardEffect,
  AnyAbilityEffect,
} from './ability-effect.value-object';

// Trainer Effects
export { TrainerEffect } from './trainer-effect.value-object';

// Energy Provision
export { EnergyProvision } from './energy-provision.value-object';

