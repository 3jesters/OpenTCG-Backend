import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { CardInstance } from '../../../domain/value-objects';
import {
  CardType,
  TrainerType,
  Rarity,
  EnergyType,
} from '../../../../card/domain/enums';
import { PokemonPosition } from '../../../domain/enums';
import { TrainerEffect } from '../../../../card/domain/value-objects';

/**
 * Shared test helpers for TrainerCardAnalyzerService tests
 */

// Helper function to create a Pokemon card
export const createPokemonCard = (
  cardId: string,
  name: string,
  hp: number,
  attacks: Attack[] = [],
): Card => {
  const card = Card.createPokemonCard(
    `instance-${cardId}`,
    cardId,
    '001',
    name,
    'base-set',
    '1',
    Rarity.COMMON,
    'Test Pokemon',
    'Artist',
    '',
  );
  card.setHp(hp);
  attacks.forEach((attack) => card.addAttack(attack));
  return card;
};

// Helper function to create a CardInstance
export const createCardInstance = (
  instanceId: string,
  cardId: string,
  position: PokemonPosition,
  currentHp: number,
  maxHp: number,
  attachedEnergy: string[] = [],
): CardInstance => {
  return new CardInstance(
    instanceId,
    cardId,
    position,
    currentHp,
    maxHp,
    attachedEnergy,
    [], // statusEffects
    [], // evolutionChain
    undefined, // poisonDamageAmount
    undefined, // evolvedAt
    undefined, // paralysisClearsAtTurn
  );
};

// Helper function to create a Trainer card
export const createTrainerCard = (
  cardId: string,
  name: string,
  trainerType: TrainerType,
  effects: TrainerEffect[],
): Card => {
  const card = Card.createTrainerCard(
    `instance-${cardId}`,
    cardId,
    '001',
    name,
    'base-set',
    '1',
    Rarity.COMMON,
    'Test Trainer',
    'Artist',
    '',
  );
  card.setTrainerType(trainerType);
  effects.forEach((effect) => card.addTrainerEffect(effect));
  return card;
};

// Helper function to create a basic Energy card
export const createEnergyCard = (
  cardId: string,
  energyType: EnergyType,
): Card => {
  const card = Card.createEnergyCard(
    `instance-${cardId}`,
    cardId,
    '001',
    'Energy',
    'base-set',
    '1',
    Rarity.COMMON,
    'Energy card',
    'Artist',
    '',
  );
  card.setEnergyType(energyType);
  return card;
};

