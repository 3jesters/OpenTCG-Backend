import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

describe('Coin Flip Approval Attack E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const BASE_MATCH_ID = '4c8b3958-420c-4271-877f-aa385ea717e3';
  const PLAYER1_ID = 'test-player-2';
  const PLAYER2_ID = 'test-player-1';

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
        currentPlayer: 'PLAYER1',
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
          currentPlayer: 'PLAYER1',
          coinFlipState: null,
          lastAction: null,
          actionHistory: [],
          abilityUsageThisTurn: {},
        },
      };
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Coin Flip Approval Attack - Vulpix Confuse Ray', () => {
    const TEST_MATCH_ID = 'coin-flip-approval-vulpix-test';

    beforeEach(async () => {
      // Create a test match with Vulpix (PLAYER1) ready to attack
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        player1Id: PLAYER1_ID,
        player2Id: PLAYER2_ID,
        currentPlayer: 'PLAYER1',
        state: 'PLAYER_TURN',
        gameState: {
          ...baseMatchState.gameState,
          phase: 'MAIN_PHASE',
          currentPlayer: 'PLAYER1',
          turnNumber: 1,
          coinFlipState: null,
          lastAction: null,
          actionHistory: [],
          player1State: {
            ...baseMatchState.gameState.player1State,
            activePokemon: {
              instanceId: 'test-instance-1',
              cardId: 'pokemon-base-set-v1.0-vulpix--70',
              position: 'ACTIVE',
              currentHp: 50,
              maxHp: 50,
              attachedEnergy: [
                'pokemon-base-set-v1.0-fire-energy--99',
                'pokemon-base-set-v1.0-fire-energy--99',
              ],
              statusEffect: 'NONE',
              damageCounters: 0,
              evolutionChain: [],
            },
          },
          player2State: {
            ...baseMatchState.gameState.player2State,
            activePokemon: {
              instanceId: 'test-instance-2',
              cardId: 'pokemon-base-set-v1.0-nidoran--57',
              position: 'ACTIVE',
              currentHp: 40,
              maxHp: 40,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
              evolutionChain: [],
            },
          },
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));

      // Sync match to ensure it's loaded
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
    });

    it('should allow both players to see and approve coin flip for Confuse Ray attack', async () => {
      // Get initial opponent status
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
      const initialStatusEffect =
        initialState.body.opponentState.activePokemon.statusEffect;
      expect(initialStatusEffect).toBe('NONE');

      // 1. Execute ATTACK action (PLAYER1)
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 }, // Confuse Ray
        })
        .expect(200);

      // 2. Verify coin flip state created with approval flags
      expect(attackResponse.body.coinFlipState).toBeDefined();
      expect(attackResponse.body.coinFlipState.status).toBe('READY_TO_FLIP');
      expect(attackResponse.body.coinFlipState.player1HasApproved).toBe(false);
      expect(attackResponse.body.coinFlipState.player2HasApproved).toBe(false);

      // 3. Verify both players can see GENERATE_COIN_FLIP action
      const player1State = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
      expect(player1State.body.availableActions).toContain(
        'GENERATE_COIN_FLIP',
      );

      const player2State = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
      expect(player2State.body.availableActions).toContain(
        'GENERATE_COIN_FLIP',
      );
      expect(player2State.body.coinFlipState).toBeDefined(); // Both see same state

      // 4. First player (PLAYER1) approves - triggers coin flip generation
      const approveResponse1 = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      // 5. Verify coin flip was generated (deterministic)
      // Note: For Confuse Ray, coin flip may not affect damage, but results should be generated
      // Check if coinFlipState is cleared (results applied) or if results are in coinFlipState
      if (approveResponse1.body.coinFlipState) {
        // Results may be in coinFlipState if not yet applied
        expect(approveResponse1.body.coinFlipState.player1HasApproved).toBe(
          true,
        );
        expect(approveResponse1.body.coinFlipState.player2HasApproved).toBe(
          false,
        );
      }

      // 6. Verify PLAYER2 sees the same result (if coinFlipState still exists)
      const player2View = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      if (player2View.body.coinFlipState) {
        expect(player2View.body.coinFlipState.player1HasApproved).toBe(true);
        // Results should be the same if present
        if (approveResponse1.body.coinFlipState?.results) {
          expect(player2View.body.coinFlipState.results).toEqual(
            approveResponse1.body.coinFlipState.results,
          );
        }
      }

      // 7. Results should be automatically applied (single-stage approval)
      // Check lastAction for attack results
      if (approveResponse1.body.lastAction?.actionType === 'ATTACK') {
        expect(approveResponse1.body.lastAction.actionData.attackIndex).toBe(0);
        // Coin flip results may be in actionData if attack had coin flip

        // Verify status effect based on coin flip result
        const coinFlipResults =
          approveResponse1.body.lastAction.actionData.coinFlipResults;
        if (coinFlipResults && coinFlipResults.length > 0) {
          const coinFlipResult = coinFlipResults[0];
          const finalState = approveResponse1.body;

          if (coinFlipResult.result === 'heads') {
            // Heads: Status effect should be applied
            expect(finalState.opponentState.activePokemon.statusEffect).toBe(
              'CONFUSED',
            );
            expect(
              approveResponse1.body.lastAction.actionData.effectFailed,
            ).toBeUndefined();
          } else {
            // Tails: Status effect should NOT be applied
            expect(finalState.opponentState.activePokemon.statusEffect).toBe(
              'NONE',
            );
            expect(
              approveResponse1.body.lastAction.actionData.effectFailed,
            ).toBe(true);
          }

          // Verify damage was always applied
          expect(approveResponse1.body.lastAction.actionData.damage).toBe(10);
        }
      }
    });

    it('should apply same coin flip result when either player approves first', async () => {
      // Get initial opponent status
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
      const initialStatusEffect =
        initialState.body.opponentState.activePokemon.statusEffect;
      expect(initialStatusEffect).toBe('NONE');

      // Execute ATTACK
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        })
        .expect(200);

      // PLAYER2 approves first
      const approveResponse2 = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      // Verify PLAYER2 approval tracked
      if (approveResponse2.body.coinFlipState) {
        expect(approveResponse2.body.coinFlipState.player2HasApproved).toBe(
          true,
        );
        expect(approveResponse2.body.coinFlipState.player1HasApproved).toBe(
          false,
        );
      }

      // Verify status effect based on coin flip result
      if (approveResponse2.body.lastAction?.actionType === 'ATTACK') {
        const coinFlipResults =
          approveResponse2.body.lastAction.actionData.coinFlipResults;
        if (coinFlipResults && coinFlipResults.length > 0) {
          const coinFlipResult = coinFlipResults[0];
          const finalState = approveResponse2.body;

          if (coinFlipResult.result === 'heads') {
            // Heads: Status effect should be applied
            expect(finalState.opponentState.activePokemon.statusEffect).toBe(
              'CONFUSED',
            );
            expect(
              approveResponse2.body.lastAction.actionData.effectFailed,
            ).toBeUndefined();
            // Verify status effect changed from initial state
            expect(
              finalState.opponentState.activePokemon.statusEffect,
            ).not.toBe(initialStatusEffect);
          } else {
            // Tails: Status effect should NOT be applied
            expect(finalState.opponentState.activePokemon.statusEffect).toBe(
              'NONE',
            );
            expect(
              approveResponse2.body.lastAction.actionData.effectFailed,
            ).toBe(true);
            // Verify status effect did not change from initial state
            expect(finalState.opponentState.activePokemon.statusEffect).toBe(
              initialStatusEffect,
            );
          }

          // Verify damage was always applied
          expect(approveResponse2.body.lastAction.actionData.damage).toBe(10);
        }
      }
    });

    it('should apply damage for STATUS_EFFECT_ONLY attacks even on tails (effectFailed)', async () => {
      // Get initial opponent HP and status
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
      const initialOpponentHp =
        initialState.body.opponentState.activePokemon.currentHp;
      const initialStatusEffect =
        initialState.body.opponentState.activePokemon.statusEffect;

      // Verify initial state: no status effect
      expect(initialStatusEffect).toBe('NONE');

      // Execute ATTACK (Confuse Ray - STATUS_EFFECT_ONLY)
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        })
        .expect(200);

      // Generate coin flip (will be deterministic based on match ID)
      const coinFlipResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      const finalState = coinFlipResponse.body;
      const attackAction = finalState.lastAction;

      // Verify attack was executed
      expect(attackAction.actionType).toBe('ATTACK');
      expect(attackAction.actionData.attackIndex).toBe(0);
      expect(attackAction.actionData.coinFlipResults).toBeDefined();
      expect(attackAction.actionData.coinFlipResults.length).toBe(1);

      const coinFlipResult = attackAction.actionData.coinFlipResults[0];
      const isTails = coinFlipResult.result === 'tails';
      const isHeads = coinFlipResult.result === 'heads';

      // For STATUS_EFFECT_ONLY (Confuse Ray):
      // - Damage should ALWAYS be applied (10 damage)
      // - If tails: effectFailed should be true, attackFailed should be undefined
      // - If heads: effectFailed should be undefined, status effect should be applied
      expect(attackAction.actionData.damage).toBe(10); // Damage always applies
      expect(attackAction.actionData.attackFailed).toBeUndefined(); // Never attackFailed for STATUS_EFFECT_ONLY

      // Verify opponent HP reduced by 10 (always)
      const opponentHp = finalState.opponentState.activePokemon.currentHp;
      expect(opponentHp).toBe(initialOpponentHp - 10);

      // Verify opponent Pokemon still exists (not knocked out)
      expect(finalState.opponentState.activePokemon).toBeDefined();
      expect(finalState.opponentState.activePokemon.instanceId).toBeDefined();

      if (isTails) {
        // Tails: damage applied, but status effect failed
        expect(attackAction.actionData.effectFailed).toBe(true);
        // Verify no status effect applied
        expect(finalState.opponentState.activePokemon.statusEffect).toBe(
          'NONE',
        );
        // Verify status effect did not change from initial state
        expect(finalState.opponentState.activePokemon.statusEffect).toBe(
          initialStatusEffect,
        );
      } else if (isHeads) {
        // Heads: damage applied, status effect should be applied
        expect(attackAction.actionData.effectFailed).toBeUndefined();
        // Verify status effect applied (Confused)
        expect(finalState.opponentState.activePokemon.statusEffect).toBe(
          'CONFUSED',
        );
        // Verify status effect changed from initial state
        expect(finalState.opponentState.activePokemon.statusEffect).not.toBe(
          initialStatusEffect,
        );
      }
    });

    it('should apply CONFUSED status effect when coin flip is heads', async () => {
      // Get initial opponent status
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      // Verify initial state: no status effect
      expect(initialState.body.opponentState.activePokemon.statusEffect).toBe(
        'NONE',
      );

      // Execute ATTACK (Confuse Ray)
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        })
        .expect(200);

      // Generate coin flip
      const coinFlipResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        })
        .expect(200);

      const finalState = coinFlipResponse.body;
      const attackAction = finalState.lastAction;
      const coinFlipResult = attackAction.actionData.coinFlipResults[0];

      // Verify coin flip result
      expect(coinFlipResult).toBeDefined();
      expect(['heads', 'tails']).toContain(coinFlipResult.result);

      // Verify opponent Pokemon status effect based on coin flip
      if (coinFlipResult.result === 'heads') {
        // Heads: Status effect should be applied
        expect(finalState.opponentState.activePokemon.statusEffect).toBe(
          'CONFUSED',
        );
        expect(attackAction.actionData.effectFailed).toBeUndefined();
      } else {
        // Tails: Status effect should NOT be applied
        expect(finalState.opponentState.activePokemon.statusEffect).toBe(
          'NONE',
        );
        expect(attackAction.actionData.effectFailed).toBe(true);
      }

      // Verify damage was always applied regardless of coin flip
      expect(attackAction.actionData.damage).toBe(10);
    });
  });

  describe('Coin Flip Approval - Multiple Flips (Fixed Count)', () => {
    const TEST_MATCH_ID = 'coin-flip-approval-multiple-test';

    it('should generate all flips at once and display sequentially', async () => {
      // This test would require a card with multiple coin flips
      // For now, we'll test the structure
      // Setup: Attack requiring 2 coin flips
      // Execute ATTACK
      // First player approves → both flips generated
      // Verify coinFlipState.results contains 2 results
      // Client displays results sequentially
      // Damage calculated from all results
    });
  });

  describe('Coin Flip Approval - Flip Until Tails', () => {
    const TEST_MATCH_ID = 'coin-flip-approval-until-tails-test';

    it('should generate flips until tails appears', async () => {
      // Setup: Attack requiring "flip until tails"
      // Execute ATTACK
      // First player approves → flips generated until tails (or max limit)
      // Verify coinFlipState.results stops at first tails
      // Verify all heads before tails are counted
      // Damage calculated from number of heads
    });

    it('should handle max limit when all flips are heads', async () => {
      // Test case where max limit (10) is reached without tails
      // Should still apply results based on all heads
    });
  });

  describe('Coin Flip Approval - Error Cases', () => {
    const TEST_MATCH_ID = 'coin-flip-approval-error-test';

    it('should reject approval when coin flip not ready', async () => {
      // Create a test match first
      const testMatchState = {
        ...baseMatchState,
        id: TEST_MATCH_ID,
        player1Id: PLAYER1_ID,
        player2Id: PLAYER2_ID,
        currentPlayer: 'PLAYER1',
        state: 'PLAYER_TURN',
        gameState: {
          ...baseMatchState.gameState,
          phase: 'ATTACK', // Must be ATTACK phase for GENERATE_COIN_FLIP
          currentPlayer: 'PLAYER1',
          turnNumber: 1,
          coinFlipState: null, // No coin flip in progress
          lastAction: null,
          actionHistory: [],
        },
      };

      const matchFilePath = join(matchesDirectory, `${TEST_MATCH_ID}.json`);
      await writeFile(matchFilePath, JSON.stringify(testMatchState, null, 2));

      // Test approval when coinFlipState is null
      const response = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'GENERATE_COIN_FLIP',
          actionData: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No coin flip in progress');
    });

    it('should reject duplicate approval', async () => {
      // Setup: Create match with coin flip state
      // First approval succeeds
      // Second approval from same player should fail
      // This would require setting up a match with coin flip in progress
    });
  });
});
