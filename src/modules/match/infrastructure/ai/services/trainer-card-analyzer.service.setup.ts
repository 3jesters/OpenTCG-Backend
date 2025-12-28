import { Test, TestingModule } from '@nestjs/testing';
import { TrainerCardAnalyzerService } from './trainer-card-analyzer.service';
import { ActionPrioritizationService } from './action-prioritization.service';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { AttackTextParserService } from '../../../domain/services/attack/damage-bonuses/attack-text-parser.service';
import { AttackDamageCalculatorService } from '../../../domain/services/attack/damage-bonuses/attack-damage-calculator.service';
import { WeaknessResistanceService } from '../../../domain/services/attack/damage-modifiers/weakness-resistance.service';
import { DamagePreventionService } from '../../../domain/services/attack/damage-modifiers/damage-prevention.service';
import * as helpers from './trainer-card-analyzer.service.helpers';

/**
 * Shared setup for TrainerCardAnalyzerService tests
 */
export function createTestModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      TrainerCardAnalyzerService,
      ActionPrioritizationService,
      OpponentAnalysisService,
      PokemonScoringService,
      AttackEnergyValidatorService,
      AttackTextParserService,
      AttackDamageCalculatorService,
      WeaknessResistanceService,
      DamagePreventionService,
      AttackDamageCalculationService,
    ],
  }).compile();
}

export function getServices(module: TestingModule) {
  return {
    service: module.get<TrainerCardAnalyzerService>(TrainerCardAnalyzerService),
    actionPrioritizationService: module.get<ActionPrioritizationService>(
      ActionPrioritizationService,
    ),
    opponentAnalysisService: module.get<OpponentAnalysisService>(
      OpponentAnalysisService,
    ),
    pokemonScoringService: module.get<PokemonScoringService>(
      PokemonScoringService,
    ),
  };
}

// Re-export helpers
export const { createPokemonCard, createCardInstance, createTrainerCard, createEnergyCard } = helpers;

