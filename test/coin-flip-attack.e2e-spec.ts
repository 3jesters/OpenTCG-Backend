import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

describe('Coin Flip Attack E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const BASE_MATCH_ID = '4c8b3958-420c-4271-877f-aa385ea717e3';
  const PLAYER2_ID = 'test-player-1'; // In base match, player2Id is 'test-player-1'

  // Load the base match state from the provided file
  let baseMatchState: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Load the base match state
    const matchFilePath = join(matchesDirectory, `${BASE_MATCH_ID}.json`);
    try {
      const matchData = await readFile(matchFilePath, 'utf-8');
      baseMatchState = JSON.parse(matchData);
    } catch (error) {
      // If file doesn't exist, create a minimal base match state
      baseMatchState = {
        tournamentId: 'classic-tournament',
        player1Id: 'test-player-1',
        player2Id: 'test-player-2',
        player1DeckId: 'classic-fire-starter-deck',
        player2DeckId: 'classic-grass-starter-deck',
        state: 'PLAYER_TURN',
        currentPlayer: 'PLAYER2',
        firstPlayer: 'PLAYER1',
        player1HasDrawnValidHand: true,
        player2HasDrawnValidHand: true,
        player1HasSetPrizeCards: true,
        player2HasSetPrizeCards: true,
        player1ReadyToStart: true,
        player2ReadyToStart: true,
        player1HasConfirmedFirstPlayer: true,
        player2HasConfirmedFirstPlayer: true,
        player1HasApprovedMatch: true,
        player2HasApprovedMatch: true,
        gameState: {
          player1State: {
            deck: [],
            hand: [],
            discardPile: [],
            activePokemon: {
              instanceId: 'test-instance-1',
              cardId: 'pokemon-base-set-v1.0-vulpix--70',
              position: 'ACTIVE',
              currentHp: 50,
              maxHp: 50,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
            bench: [],
            prizeCards: [],
          },
          player2State: {
            deck: [],
            hand: [],
            discardPile: [],
            activePokemon: {
              instanceId: 'test-instance-2',
              cardId: 'pokemon-base-set-v1.0-nidoran--57',
              position: 'ACTIVE',
              currentHp: 40,
              maxHp: 40,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
            bench: [],
            prizeCards: [],
          },
          turnNumber: 1,
          phase: 'MAIN_PHASE',
          currentPlayer: 'PLAYER2',
          coinFlipState: null,
          lastAction: null,
          actionHistory: [],
          abilityUsageThisTurn: {},
          player1State: baseMatchState.gameState?.player1State || {
            deck: [],
            hand: [],
            discardPile: [],
            activePokemon: {
              instanceId: 'test-instance-1',
              cardId: 'pokemon-base-set-v1.0-vulpix--70',
              position: 'ACTIVE',
              currentHp: 50,
              maxHp: 50,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
            bench: [],
            prizeCards: [],
          },
        },
      };
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Helper function to calculate coin flip result for a given match ID
   * This uses the same logic as CoinFlipResolverService to predict results
   */
  function calculateCoinFlipResult(
    matchId: string,
    turnNumber: number,
    actionId: string,
    flipIndex: number,
  ): 'heads' | 'tails' {
    // Same seed generation logic as CoinFlipResolverService
    const seedString = `${matchId}-${turnNumber}-${actionId}-${flipIndex}`;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const seed = Math.abs(hash);

    // Same LCG as CoinFlipResolverService
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    let state = seed % m;
    state = (a * state + c) % m;
    const random = state / m;

    return random >= 0.5 ? 'heads' : 'tails';
  }

  /**
   * Find a match ID that produces a specific coin flip result
   * Uses predefined match IDs that are known to produce specific results
   */
  function findMatchIdForResult(
    desiredResult: 'heads' | 'tails',
    turnNumber: number = 1,
    actionHistoryLength: number = 0,
  ): string {
    // Predefined match IDs that produce known results
    // These are calculated using the same logic as CoinFlipResolverService
    if (desiredResult === 'heads') {
      // coin-flip-heads-0000 produces heads for turn 1, action 0, flip 0
      return 'coin-flip-heads-0000';
    } else {
      // coin-flip-tails-0001 produces tails for turn 1, action 0, flip 0
      return 'coin-flip-tails-0001';
    }
  }

  describe('Coin Flip Attack - Heads Scenario (30 damage)', () => {
    const TEST_MATCH_ID = findMatchIdForResult('heads', 1, 0);

    beforeEach(async () => {
      // Create a test match with proper state setup
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        currentPlayer: 'PLAYER2', // Match-level currentPlayer must match gameState.currentPlayer
        state: 'PLAYER_TURN', // Match must be in PLAYER_TURN state
        gameState: {
          ...baseMatchState.gameState,
          phase: 'MAIN_PHASE', // Must be MAIN_PHASE to execute attack
          currentPlayer: 'PLAYER2',
          turnNumber: 1,
          coinFlipState: null,
          lastAction: null,
          actionHistory: [], // Empty history so action ID will be based on length 0
          player2State: {
            ...(baseMatchState.gameState?.player2State || {
              deck: [],
              hand: [],
              discardPile: [],
              activePokemon: {
                instanceId: 'test-instance-2',
                cardId: 'pokemon-base-set-v1.0-nidoran--57',
                position: 'ACTIVE',
                currentHp: 40,
                maxHp: 40,
                attachedEnergy: [],
                statusEffect: 'NONE',
                damageCounters: 0,
              },
              bench: [],
              prizeCards: [],
            }),
            activePokemon: {
              instanceId: baseMatchState.gameState?.player2State?.activePokemon?.instanceId || 'test-instance-2',
              cardId: 'pokemon-base-set-v1.0-nidoran--57', // Override to use Nidoran with Horn Hazard
              position: 'ACTIVE',
              currentHp: 40,
              maxHp: 40,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 GRASS energy for Horn Hazard attack
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));

      // Sync match to ensure it's loaded
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
    });

    it('should execute attack with coin flip - verify heads scenario (30 damage)', async () => {
      // Get initial opponent HP from match state
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
      const initialOpponentHp = initialState.body.opponentState.activePokemon?.currentHp || 50;

      // Execute ATTACK action
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'ATTACK',
          actionData: {
            attackIndex: 0, // Horn Hazard attack
          },
        });
      
      if (attackResponse.status !== 200) {
        console.error('Attack failed:', JSON.stringify(attackResponse.body, null, 2));
      }
      expect(attackResponse.status).toBe(200);

      const afterAttackState = attackResponse.body;

      // Verify coin flip state was created
      expect(afterAttackState.coinFlipState).toBeDefined();
      expect(afterAttackState.coinFlipState.status).toBe('READY_TO_FLIP');
      expect(afterAttackState.coinFlipState.context).toBe('ATTACK');
      expect(afterAttackState.coinFlipState.attackIndex).toBe(0);
      expect(afterAttackState.availableActions).toContain('GENERATE_COIN_FLIP');

      // Generate coin flip
      const coinFlipResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      const finalState = coinFlipResponse.body;

      // Verify coin flip was completed
      expect(finalState.coinFlipState).toBeNull();
      expect(finalState.phase).toBe('END');

      // Verify attack action data
      const attackAction = finalState.lastAction;
      expect(attackAction.actionType).toBe('ATTACK');
      expect(attackAction.actionData.attackIndex).toBe(0);
      expect(attackAction.actionData.coinFlipResults).toBeDefined();
      expect(attackAction.actionData.coinFlipResults.length).toBe(1);

      const coinFlipResult = attackAction.actionData.coinFlipResults[0];
      
      // Verify we got heads (deterministic based on match ID)
      expect(coinFlipResult.result).toBe('heads');
      expect(attackAction.actionData.damage).toBe(30);
      expect(attackAction.actionData.attackFailed).toBeUndefined();

      // Check if Pokemon was knocked out (30 damage on 40 HP = not knocked out)
      if (attackAction.actionData.isKnockedOut) {
        expect(finalState.opponentState.activePokemon).toBeNull();
      } else {
        const opponentHp = finalState.opponentState.activePokemon.currentHp;
        expect(opponentHp).toBe(initialOpponentHp - 30);
      }
    });
  });

  describe('Coin Flip Attack - Tails Scenario (0 damage)', () => {
    const TEST_MATCH_ID = findMatchIdForResult('tails', 1, 0);

    beforeEach(async () => {
      // Create a test match with proper state setup
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        currentPlayer: 'PLAYER2', // Match-level currentPlayer must match gameState.currentPlayer
        state: 'PLAYER_TURN', // Match must be in PLAYER_TURN state
        gameState: {
          ...baseMatchState.gameState,
          phase: 'MAIN_PHASE', // Must be MAIN_PHASE to execute attack
          currentPlayer: 'PLAYER2',
          turnNumber: 1,
          coinFlipState: null,
          lastAction: null,
          actionHistory: [], // Empty history so action ID will be based on length 0
          player2State: {
            ...(baseMatchState.gameState?.player2State || {
              deck: [],
              hand: [],
              discardPile: [],
              activePokemon: {
                instanceId: 'test-instance-2',
                cardId: 'pokemon-base-set-v1.0-nidoran--57',
                position: 'ACTIVE',
                currentHp: 40,
                maxHp: 40,
                attachedEnergy: [],
                statusEffect: 'NONE',
                damageCounters: 0,
              },
              bench: [],
              prizeCards: [],
            }),
            activePokemon: {
              instanceId: baseMatchState.gameState?.player2State?.activePokemon?.instanceId || 'test-instance-2',
              cardId: 'pokemon-base-set-v1.0-nidoran--57', // Override to use Nidoran with Horn Hazard
              position: 'ACTIVE',
              currentHp: 40,
              maxHp: 40,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 GRASS energy for Horn Hazard attack
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));

      // Sync match to ensure it's loaded
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
    });

    it('should execute attack with coin flip - verify tails scenario (0 damage)', async () => {
      // Get initial opponent HP from match state
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
      const initialOpponentHp = initialState.body.opponentState.activePokemon?.currentHp || 50;

      // Execute ATTACK action
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'ATTACK',
          actionData: {
            attackIndex: 0,
          },
        })
        .expect(200);

      // Generate coin flip
      const coinFlipResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      const finalState = coinFlipResponse.body;
      const attackAction = finalState.lastAction;
      const coinFlipResult = attackAction.actionData.coinFlipResults[0];

      // Verify we got tails (deterministic based on match ID)
      expect(coinFlipResult.result).toBe('tails');
      expect(attackAction.actionData.damage).toBe(0);
      expect(attackAction.actionData.attackFailed).toBe(true);
      const opponentHp = finalState.opponentState.activePokemon.currentHp;
      expect(opponentHp).toBe(initialOpponentHp); // Still 40 HP, no damage
    });
  });

  describe('Coin Flip State Transitions', () => {
    const TEST_MATCH_ID = 'coin-flip-test-transitions';

    beforeEach(async () => {
      // Create a test match with proper state setup
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        currentPlayer: 'PLAYER2', // Match-level currentPlayer must match gameState.currentPlayer
        state: 'PLAYER_TURN', // Match must be in PLAYER_TURN state
        gameState: {
          ...baseMatchState.gameState,
          phase: 'MAIN_PHASE', // Must be MAIN_PHASE to execute attack
          currentPlayer: 'PLAYER2',
          turnNumber: 1,
          coinFlipState: null,
          lastAction: null,
          actionHistory: [], // Empty history so action ID will be based on length 0
          player2State: {
            ...(baseMatchState.gameState?.player2State || {
              deck: [],
              hand: [],
              discardPile: [],
              activePokemon: {
                instanceId: 'test-instance-2',
                cardId: 'pokemon-base-set-v1.0-nidoran--57',
                position: 'ACTIVE',
                currentHp: 40,
                maxHp: 40,
                attachedEnergy: [],
                statusEffect: 'NONE',
                damageCounters: 0,
              },
              bench: [],
              prizeCards: [],
            }),
            activePokemon: {
              instanceId: baseMatchState.gameState?.player2State?.activePokemon?.instanceId || 'test-instance-2',
              cardId: 'pokemon-base-set-v1.0-nidoran--57', // Override to use Nidoran with Horn Hazard
              position: 'ACTIVE',
              currentHp: 40,
              maxHp: 40,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 GRASS energy for Horn Hazard attack
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));

      // Sync match to ensure it's loaded
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
    });

    it('should transition coin flip state correctly: READY_TO_FLIP -> COMPLETED', async () => {
      // Execute ATTACK
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'ATTACK',
          actionData: {
            attackIndex: 0,
          },
        })
        .expect(200);

      // Verify READY_TO_FLIP state
      let state = attackResponse.body;
      expect(state.coinFlipState.status).toBe('READY_TO_FLIP');
      expect(state.coinFlipState.results).toHaveLength(0);

      // Generate coin flip
      const coinFlipResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      // Verify COMPLETED state (coinFlipState should be null after completion)
      state = coinFlipResponse.body;
      expect(state.coinFlipState).toBeNull();

      // Verify results are in action data
      const attackAction = state.lastAction;
      expect(attackAction.actionData.coinFlipResults).toBeDefined();
      expect(attackAction.actionData.coinFlipResults.length).toBe(1);
      expect(['heads', 'tails']).toContain(attackAction.actionData.coinFlipResults[0].result);
    });
  });
});
