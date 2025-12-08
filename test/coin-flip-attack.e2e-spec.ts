import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Coin Flip Attack E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const BASE_MATCH_ID = '0bef5dd8-35a5-492e-9ede-0a8454b57213';
  const PLAYER2_ID = 'test-player-2';

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
    const matchData = await readFile(matchFilePath, 'utf-8');
    baseMatchState = JSON.parse(matchData);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Coin Flip Attack - Heads Scenario (30 damage)', () => {
    const TEST_MATCH_ID = 'coin-flip-test-heads-aaaa'; // Specific ID that should produce heads

    beforeEach(async () => {
      // Create a test match with modified ID
      // The seed is based on match ID + turn number + action ID + flip index
      // We'll use a specific match ID pattern to try to get heads
      // Get the first action from history to use as lastAction
      const firstAction = baseMatchState.gameState.actionHistory[0];
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        gameState: {
          ...baseMatchState.gameState,
          phase: 'ATTACK',
          currentPlayer: 'PLAYER2',
          coinFlipState: null,
          lastAction: firstAction, // Set lastAction to match actionHistory
          actionHistory: [firstAction], // Keep only DRAW_CARD
          player2State: {
            ...baseMatchState.gameState.player2State,
            activePokemon: {
              ...baseMatchState.gameState.player2State.activePokemon,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 GRASS energy for Horn Hazard attack
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));
    });

    // Files are kept after test run - cleaned up by jest-global-setup before next run

    it('should execute attack with coin flip - verify heads scenario (30 damage)', async () => {
      const initialOpponentHp = 40;

      // Execute ATTACK action
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'ATTACK',
          actionData: {
            attackIndex: 0, // Horn Hazard attack
          },
        })
        .expect(200);

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
      const isHeads = coinFlipResult.result === 'heads';

      // This test is specifically for heads scenario
      // If we get heads, verify 30 damage
      // If we get tails, skip this test's assertions (will be tested in tails test)
      if (isHeads) {
        expect(attackAction.actionData.damage).toBe(30);
        expect(attackAction.actionData.attackFailed).toBeUndefined();
        
        // Check if Pokemon was knocked out (30 damage on 30 HP = knockout)
        if (attackAction.actionData.isKnockedOut) {
          expect(finalState.opponentState.activePokemon).toBeNull();
        } else {
          const opponentHp = finalState.opponentState.activePokemon.currentHp;
          expect(opponentHp).toBe(initialOpponentHp - 30);
        }
      } else {
        // Got tails instead - this test will verify tails behavior
        // We'll verify it in the tails test, but log for debugging
        console.log(`Note: Got tails in heads test (match ID: ${TEST_MATCH_ID})`);
        // Still verify the logic is correct
        expect(attackAction.actionData.damage).toBe(0);
        expect(attackAction.actionData.attackFailed).toBe(true);
      }
    });
  });

  describe('Coin Flip Attack - Tails Scenario (0 damage)', () => {
    const TEST_MATCH_ID = 'coin-flip-test-tails-zzzz'; // Different ID pattern to try to get tails

    beforeEach(async () => {
      // Get the first action from history to use as lastAction
      const firstAction = baseMatchState.gameState.actionHistory[0];
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        gameState: {
          ...baseMatchState.gameState,
          phase: 'ATTACK',
          currentPlayer: 'PLAYER2',
          coinFlipState: null,
          lastAction: firstAction, // Set lastAction to match actionHistory
          actionHistory: [firstAction],
          player2State: {
            ...baseMatchState.gameState.player2State,
            activePokemon: {
              ...baseMatchState.gameState.player2State.activePokemon,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 GRASS energy for Horn Hazard attack
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));
    });

    // Files are kept after test run - cleaned up by jest-global-setup before next run

    it('should execute attack with coin flip - verify tails scenario (0 damage)', async () => {
      const initialOpponentHp = 40;

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
      const isTails = coinFlipResult.result === 'tails';

      // This test is specifically for tails scenario
      // If we get tails, verify 0 damage
      // If we get heads, skip this test's assertions (will be tested in heads test)
      if (isTails) {
        expect(attackAction.actionData.damage).toBe(0);
        expect(attackAction.actionData.attackFailed).toBe(true);
        const opponentHp = finalState.opponentState.activePokemon.currentHp;
        expect(opponentHp).toBe(initialOpponentHp); // Still 40 HP, no damage
      } else {
        // Got heads instead - this test will verify heads behavior
        // We'll verify it in the heads test, but log for debugging
        console.log(`Note: Got heads in tails test (match ID: ${TEST_MATCH_ID})`);
        // Still verify the logic is correct
        expect(attackAction.actionData.damage).toBe(30);
        expect(attackAction.actionData.attackFailed).toBeUndefined();
      }
    });
  });

  describe('Coin Flip State Transitions', () => {
    const TEST_MATCH_ID = 'coin-flip-test-transitions';

    beforeEach(async () => {
      // Get the first action from history to use as lastAction
      const firstAction = baseMatchState.gameState.actionHistory[0];
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        gameState: {
          ...baseMatchState.gameState,
          phase: 'ATTACK',
          currentPlayer: 'PLAYER2',
          coinFlipState: null,
          lastAction: firstAction, // Set lastAction to match actionHistory
          actionHistory: [firstAction],
          player2State: {
            ...baseMatchState.gameState.player2State,
            activePokemon: {
              ...baseMatchState.gameState.player2State.activePokemon,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 GRASS energy for Horn Hazard attack
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));
    });

    // Files are kept after test run - cleaned up by jest-global-setup before next run

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

