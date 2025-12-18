import { ConditionType } from '../enums/condition-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import {
  ConditionFactory,
  ConditionHelper,
  Condition,
} from './condition.value-object';

describe('Condition Value Objects', () => {
  describe('ConditionFactory', () => {
    it('should create an always condition', () => {
      const condition = ConditionFactory.always();
      expect(condition.type).toBe(ConditionType.ALWAYS);
      expect(condition.value).toBeUndefined();
    });

    it('should create a coin flip success condition', () => {
      const condition = ConditionFactory.coinFlipSuccess('If heads');
      expect(condition.type).toBe(ConditionType.COIN_FLIP_SUCCESS);
      expect(condition.description).toBe('If heads');
    });

    it('should create a coin flip failure condition', () => {
      const condition = ConditionFactory.coinFlipFailure('If tails');
      expect(condition.type).toBe(ConditionType.COIN_FLIP_FAILURE);
      expect(condition.description).toBe('If tails');
    });

    it('should create a self has damage condition', () => {
      const condition = ConditionFactory.selfHasDamage('Has damage');
      expect(condition.type).toBe(ConditionType.SELF_HAS_DAMAGE);
    });

    it('should create a self minimum damage condition', () => {
      const condition = ConditionFactory.selfMinimumDamage(
        3,
        'At least 3 damage',
      );
      expect(condition.type).toBe(ConditionType.SELF_MINIMUM_DAMAGE);
      expect(condition.value?.minimumAmount).toBe(3);
    });

    it('should create a self no damage condition', () => {
      const condition = ConditionFactory.selfNoDamage();
      expect(condition.type).toBe(ConditionType.SELF_NO_DAMAGE);
    });

    it('should create a self has status condition', () => {
      const condition = ConditionFactory.selfHasStatus('PARALYZED');
      expect(condition.type).toBe(ConditionType.SELF_HAS_STATUS);
      expect(condition.value?.statusCondition).toBe('PARALYZED');
    });

    it('should create an opponent has damage condition', () => {
      const condition = ConditionFactory.opponentHasDamage();
      expect(condition.type).toBe(ConditionType.OPPONENT_HAS_DAMAGE);
    });

    it('should create an opponent has status condition', () => {
      const condition = ConditionFactory.opponentHasStatus('CONFUSED');
      expect(condition.type).toBe(ConditionType.OPPONENT_HAS_STATUS);
      expect(condition.value?.statusCondition).toBe('CONFUSED');
    });

    it('should create an opponent confused condition', () => {
      const condition = ConditionFactory.opponentConfused();
      expect(condition.type).toBe(ConditionType.OPPONENT_CONFUSED);
    });

    it('should create an opponent paralyzed condition', () => {
      const condition = ConditionFactory.opponentParalyzed();
      expect(condition.type).toBe(ConditionType.OPPONENT_PARALYZED);
    });

    it('should create an opponent poisoned condition', () => {
      const condition = ConditionFactory.opponentPoisoned();
      expect(condition.type).toBe(ConditionType.OPPONENT_POISONED);
    });

    it('should create an opponent burned condition', () => {
      const condition = ConditionFactory.opponentBurned();
      expect(condition.type).toBe(ConditionType.OPPONENT_BURNED);
    });

    it('should create an opponent asleep condition', () => {
      const condition = ConditionFactory.opponentAsleep();
      expect(condition.type).toBe(ConditionType.OPPONENT_ASLEEP);
    });

    it('should create a self has energy type condition', () => {
      const condition = ConditionFactory.selfHasEnergyType(
        EnergyType.FIRE,
        2,
        'At least 2 Fire',
      );
      expect(condition.type).toBe(ConditionType.SELF_HAS_ENERGY_TYPE);
      expect(condition.value?.energyType).toBe(EnergyType.FIRE);
      expect(condition.value?.minimumAmount).toBe(2);
    });

    it('should create a self minimum energy condition', () => {
      const condition = ConditionFactory.selfMinimumEnergy(3);
      expect(condition.type).toBe(ConditionType.SELF_MINIMUM_ENERGY);
      expect(condition.value?.minimumAmount).toBe(3);
    });

    it('should create an opponent has benched condition', () => {
      const condition = ConditionFactory.opponentHasBenched();
      expect(condition.type).toBe(ConditionType.OPPONENT_HAS_BENCHED);
    });

    it('should create a self has benched condition', () => {
      const condition = ConditionFactory.selfHasBenched();
      expect(condition.type).toBe(ConditionType.SELF_HAS_BENCHED);
    });

    it('should create a stadium in play condition', () => {
      const condition = ConditionFactory.stadiumInPlay('Power Plant');
      expect(condition.type).toBe(ConditionType.STADIUM_IN_PLAY);
      expect(condition.value?.stadiumName).toBe('Power Plant');
    });

    it('should create a stadium in play condition without specific stadium', () => {
      const condition = ConditionFactory.stadiumInPlay();
      expect(condition.type).toBe(ConditionType.STADIUM_IN_PLAY);
      expect(condition.value).toBeUndefined();
    });
  });

  describe('ConditionHelper', () => {
    it('should identify always condition', () => {
      const condition = ConditionFactory.always();
      expect(ConditionHelper.isAlways(condition)).toBe(true);

      const notAlways = ConditionFactory.coinFlipSuccess();
      expect(ConditionHelper.isAlways(notAlways)).toBe(false);
    });

    it('should identify conditions that require game state', () => {
      const always = ConditionFactory.always();
      expect(ConditionHelper.requiresGameState(always)).toBe(false);

      const requiresState = ConditionFactory.selfHasDamage();
      expect(ConditionHelper.requiresGameState(requiresState)).toBe(true);
    });

    it('should identify coin flip based conditions', () => {
      const coinFlip = ConditionFactory.coinFlipSuccess();
      expect(ConditionHelper.isCoinFlipBased(coinFlip)).toBe(true);

      const notCoinFlip = ConditionFactory.selfHasDamage();
      expect(ConditionHelper.isCoinFlipBased(notCoinFlip)).toBe(false);
    });

    it('should identify self conditions', () => {
      const selfCondition = ConditionFactory.selfHasDamage();
      expect(ConditionHelper.isSelfCondition(selfCondition)).toBe(true);

      const opponentCondition = ConditionFactory.opponentConfused();
      expect(ConditionHelper.isSelfCondition(opponentCondition)).toBe(false);
    });

    it('should identify opponent conditions', () => {
      const opponentCondition = ConditionFactory.opponentHasDamage();
      expect(ConditionHelper.isOpponentCondition(opponentCondition)).toBe(true);

      const selfCondition = ConditionFactory.selfHasDamage();
      expect(ConditionHelper.isOpponentCondition(selfCondition)).toBe(false);
    });

    it('should identify conditions that require a value', () => {
      expect(ConditionHelper.requiresValue(ConditionType.SELF_HAS_STATUS)).toBe(
        true,
      );
      expect(
        ConditionHelper.requiresValue(ConditionType.SELF_MINIMUM_DAMAGE),
      ).toBe(true);
      expect(
        ConditionHelper.requiresValue(ConditionType.SELF_HAS_ENERGY_TYPE),
      ).toBe(true);

      expect(ConditionHelper.requiresValue(ConditionType.ALWAYS)).toBe(false);
      expect(
        ConditionHelper.requiresValue(ConditionType.COIN_FLIP_SUCCESS),
      ).toBe(false);
    });
  });
});
