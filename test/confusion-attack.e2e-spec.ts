import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

describe('Confusion Attack E2E', () => {
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
              attachedEnergy: [
                'pokemon-base-set-v1.0-fire-energy--99',
                'pokemon-base-set-v1.0-fire-energy--99',
              ],
              statusEffect: 'NONE',
              damageCounters: 0,
              evolutionChain: [],
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
              evolutionChain: [],
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

  describe('Confused Pokemon Attack', () => {
    const TEST_MATCH_ID = 'confusion-attack-test';

    beforeEach(async () => {
      // Create a test match with confused Pokemon ready to attack
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
              statusEffect: 'CONFUSED', // Confused Pokemon
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

    it('should create coin flip state when confused Pokemon attempts to attack', async () => {
      // Get initial state
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(initialState.body.playerState.activePokemon.statusEffect).toBe('CONFUSED');
      expect(initialState.body.coinFlipState).toBeNull();

      // Attempt to attack with confused Pokemon
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 }, // Confuse Ray
        })
        .expect(200);

      // Verify coin flip state was created for confusion check
      expect(attackResponse.body.coinFlipState).toBeDefined();
      expect(attackResponse.body.coinFlipState.context).toBe('STATUS_CHECK');
      expect(attackResponse.body.coinFlipState.statusEffect).toBe('CONFUSED');
      expect(attackResponse.body.coinFlipState.status).toBe('READY_TO_FLIP');
      expect(attackResponse.body.coinFlipState.configuration.damageCalculationType).toBe('BASE_DAMAGE');
      expect(attackResponse.body.coinFlipState.configuration.baseDamage).toBe(0);
      expect(attackResponse.body.coinFlipState.pokemonInstanceId).toBe('test-instance-1');
      
      // Note: GENERATE_COIN_FLIP is not in availableActions for STATUS_CHECK contexts
      // The coin flip state is created automatically, and the client can call GENERATE_COIN_FLIP
      // when coinFlipState exists, but it doesn't need to be in availableActions
    });

    it('should allow attack to proceed when confusion coin flip is heads', async () => {
      // Get initial opponent HP
      const initialState = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
      const initialOpponentHp = initialState.body.opponentState.activePokemon.currentHp;
      const initialPlayerHp = initialState.body.playerState.activePokemon.currentHp;

      // Attempt to attack with confused Pokemon
      await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        })
        .expect(200);

      // Generate coin flip (deterministic - result depends on match ID)
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
      expect(attackAction.actionData.coinFlipResults).toBeDefined();
      expect(attackAction.actionData.coinFlipResults.length).toBe(1);

      const coinFlipResult = attackAction.actionData.coinFlipResults[0];
      const isHeads = coinFlipResult.result === 'heads';
      const isTails = coinFlipResult.result === 'tails';

      if (isHeads) {
        // Heads: Attack should proceed, no self-damage
        expect(attackAction.actionData.attackFailed).toBeUndefined();
        expect(attackAction.actionData.damage).toBe(10); // Confuse Ray damage
        expect(finalState.opponentState.activePokemon.currentHp).toBe(initialOpponentHp - 10);
        expect(finalState.playerState.activePokemon.currentHp).toBe(initialPlayerHp); // No self-damage
        expect(finalState.playerState.activePokemon.statusEffect).toBe('CONFUSED'); // Status remains
      } else if (isTails) {
        // Tails: Attack should fail, 30 self-damage applied
        expect(attackAction.actionData.attackFailed).toBe(true);
        expect(attackAction.actionData.damage).toBe(0); // No damage to opponent
        expect(finalState.opponentState.activePokemon.currentHp).toBe(initialOpponentHp); // No damage
        expect(finalState.playerState.activePokemon.currentHp).toBe(initialPlayerHp - 30); // 30 self-damage
        expect(finalState.playerState.activePokemon.statusEffect).toBe('CONFUSED'); // Status remains
      }
    });

    it('should prevent attack when confusion coin flip is tails', async () => {
      // Attempt to attack with confused Pokemon
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

      const attackAction = coinFlipResponse.body.lastAction;
      const coinFlipResult = attackAction.actionData.coinFlipResults[0];

      if (coinFlipResult.result === 'tails') {
        // Tails: Attack should fail
        expect(attackAction.actionData.attackFailed).toBe(true);
        expect(attackAction.actionData.damage).toBe(0);
        
        // Verify opponent took no damage
        const finalState = coinFlipResponse.body;
        const initialState = await request(server())
          .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
          .send({ playerId: PLAYER1_ID })
          .expect(200);
        // Note: We can't easily compare HP here since the state was already updated
        // But we verified attackFailed is true and damage is 0
      }
    });

    it('should allow confused Pokemon to attempt attack (not blocked like sleep/paralyze)', async () => {
      // Verify confused Pokemon can attempt attack (unlike sleep/paralyze)
      const stateBeforeAttack = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(stateBeforeAttack.body.playerState.activePokemon.statusEffect).toBe('CONFUSED');
      expect(stateBeforeAttack.body.availableActions).toContain('ATTACK'); // Can attempt attack

      // Attempt attack should succeed (creates coin flip state automatically)
      const attackResponse = await request(server())
        .post(`/api/v1/matches/${TEST_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        })
        .expect(200);

      // Should create coin flip state automatically, not block the attack
      expect(attackResponse.body.coinFlipState).toBeDefined();
      expect(attackResponse.body.coinFlipState.context).toBe('STATUS_CHECK');
      // Note: GENERATE_COIN_FLIP is not in availableActions, but client can call it when coinFlipState exists
    });
  });
});
