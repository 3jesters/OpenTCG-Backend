import { StartGameRulesValidatorService } from './start-game-rules-validator.service';
import { GetCardByIdUseCase } from '../../../card/application/use-cases/get-card-by-id.use-case';
import {
  StartGameRules,
  StartGameRuleType,
} from '../../../tournament/domain/value-objects';
import { CardType, EvolutionStage } from '../../../card/domain/enums';
import { CardDetailDto } from '../../../card/presentation/dto/card-detail.dto';
import { NotFoundException } from '@nestjs/common';

describe('StartGameRulesValidatorService', () => {
  let service: StartGameRulesValidatorService;
  let mockGetCardByIdUseCase: jest.Mocked<GetCardByIdUseCase>;

  beforeEach(() => {
    mockGetCardByIdUseCase = {
      execute: jest.fn(),
    } as any;

    service = new StartGameRulesValidatorService(mockGetCardByIdUseCase);
  });

  describe('validateHand', () => {
    it('should return true when hand satisfies all rules', async () => {
      const hand = ['basic-pokemon-1', 'basic-pokemon-2', 'other-card-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId.startsWith('basic-pokemon')) {
          return Promise.resolve({
            cardId,
            cardType: CardType.POKEMON,
            stage: EvolutionStage.BASIC,
          } as CardDetailDto);
        }
        return Promise.resolve({
          cardId,
          cardType: CardType.TRAINER,
        } as CardDetailDto);
      });

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(true);
    });

    it('should return false when hand does not satisfy rules', async () => {
      const hand = ['trainer-card-1', 'trainer-card-2', 'other-card-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockResolvedValue({
        cardId: 'trainer-card-1',
        cardType: CardType.TRAINER,
      } as CardDetailDto);

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(false);
    });

    it('should return true when hand satisfies multiple rules', async () => {
      const hand = [
        'basic-pokemon-1',
        'basic-pokemon-2',
        'energy-card-1',
        'energy-card-2',
        'other-card-1',
      ];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 2,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId.startsWith('basic-pokemon')) {
          return Promise.resolve({
            cardId,
            cardType: CardType.POKEMON,
            stage: EvolutionStage.BASIC,
          } as CardDetailDto);
        }
        if (cardId.startsWith('energy-card')) {
          return Promise.resolve({
            cardId,
            cardType: CardType.ENERGY,
          } as CardDetailDto);
        }
        return Promise.resolve({
          cardId,
          cardType: CardType.TRAINER,
        } as CardDetailDto);
      });

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(true);
    });

    it('should return false when hand satisfies only one of multiple rules', async () => {
      const hand = ['basic-pokemon-1', 'trainer-card-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId.startsWith('basic-pokemon')) {
          return Promise.resolve({
            cardId,
            cardType: CardType.POKEMON,
            stage: EvolutionStage.BASIC,
          } as CardDetailDto);
        }
        return Promise.resolve({
          cardId,
          cardType: CardType.TRAINER,
        } as CardDetailDto);
      });

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(false);
    });

    it('should return true when rules are empty', async () => {
      const hand = ['any-card-1', 'any-card-2'];
      const rules = StartGameRules.createEmpty();

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(true);
      expect(mockGetCardByIdUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle minCount greater than 1', async () => {
      const hand = ['basic-pokemon-1', 'basic-pokemon-2', 'basic-pokemon-3'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockResolvedValue({
        cardId: 'basic-pokemon-1',
        cardType: CardType.POKEMON,
        stage: EvolutionStage.BASIC,
      } as CardDetailDto);

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(true);
      expect(mockGetCardByIdUseCase.execute).toHaveBeenCalledTimes(3);
    });

    it('should return false when minCount requirement is not met', async () => {
      const hand = ['basic-pokemon-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockResolvedValue({
        cardId: 'basic-pokemon-1',
        cardType: CardType.POKEMON,
        stage: EvolutionStage.BASIC,
      } as CardDetailDto);

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(false);
    });

    it('should skip non-Basic Pokemon when checking HAS_BASIC_POKEMON rule', async () => {
      const hand = ['stage1-pokemon-1', 'stage2-pokemon-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId.includes('stage1')) {
          return Promise.resolve({
            cardId,
            cardType: CardType.POKEMON,
            stage: EvolutionStage.STAGE_1,
          } as CardDetailDto);
        }
        return Promise.resolve({
          cardId,
          cardType: CardType.POKEMON,
          stage: EvolutionStage.STAGE_2,
        } as CardDetailDto);
      });

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(false);
    });

    it('should handle card not found errors gracefully', async () => {
      const hand = ['basic-pokemon-1', 'missing-card-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'missing-card-1') {
          return Promise.reject(new NotFoundException('Card not found'));
        }
        return Promise.resolve({
          cardId,
          cardType: CardType.POKEMON,
          stage: EvolutionStage.BASIC,
        } as CardDetailDto);
      });

      // Should not throw, but should skip missing card
      const result = await service.validateHand(hand, rules);

      expect(result).toBe(true);
    });

    it('should validate HAS_ENERGY_CARD rule correctly', async () => {
      const hand = ['energy-card-1', 'energy-card-2', 'trainer-card-1'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId.startsWith('energy-card')) {
          return Promise.resolve({
            cardId,
            cardType: CardType.ENERGY,
          } as CardDetailDto);
        }
        return Promise.resolve({
          cardId,
          cardType: CardType.TRAINER,
        } as CardDetailDto);
      });

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(true);
    });

    it('should return false when energy card requirement is not met', async () => {
      const hand = ['trainer-card-1', 'trainer-card-2'];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      mockGetCardByIdUseCase.execute.mockResolvedValue({
        cardId: 'trainer-card-1',
        cardType: CardType.TRAINER,
      } as CardDetailDto);

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(false);
    });

    it('should handle empty hand', async () => {
      const hand: string[] = [];
      const rules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);

      const result = await service.validateHand(hand, rules);

      expect(result).toBe(false);
      expect(mockGetCardByIdUseCase.execute).not.toHaveBeenCalled();
    });
  });
});

