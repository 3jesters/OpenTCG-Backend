import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Prize Selection After Knockout E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-prize-selection-knockout';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Keep test match file for inspection - will be cleaned up before next test run by jest-global-setup
  });

  beforeEach(async () => {
    // Files are cleaned up by jest-global-setup before test run

    // Ensure matches directory exists
    const fs = require('fs');
    if (!fs.existsSync(matchesDirectory)) {
      fs.mkdirSync(matchesDirectory, { recursive: true });
    }
  });

  it('should require prize selection after knockout before ending turn', async () => {
    // Setup: Create a match with initial state where Player 1 can attack
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
      player1Type: null,
      player2Type: null,
      state: 'PLAYER_TURN',
      currentPlayer: 'PLAYER1',
      firstPlayer: 'PLAYER1',
      coinTossResult: 'PLAYER1',
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
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      startedAt: '2025-01-01T00:00:00.000Z',
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: [
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
          ],
          hand: [
            'pokemon-base-set-v1.0-ponyta--62',
            'pokemon-base-set-v1.0-fire-energy--99',
          ],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ], // 2 FIRE energy for Flame Tail attack
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: [
            'prize-card-1',
            'prize-card-2',
            'prize-card-3',
            'prize-card-4',
            'prize-card-5',
            'prize-card-6',
          ],
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: [
            'pokemon-base-set-v1.0-grass-energy--99',
            'pokemon-base-set-v1.0-grass-energy--99',
          ],
          hand: [
            'pokemon-base-set-v1.0-bulbasaur--46',
            'pokemon-base-set-v1.0-ivysaur--30',
          ],
          activePokemon: {
            instanceId: 'bulbasaur-instance-1',
            cardId: 'pokemon-base-set-v1.0-bulbasaur--46',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40, // Will be knocked out by attack
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [
            {
              instanceId: 'ivysaur-instance-1',
              cardId: 'pokemon-base-set-v1.0-ivysaur--30',
              position: 'BENCH_0',
              maxHp: 60,
              currentHp: 60,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          ],
          prizeCards: [
            'prize-card-1',
            'prize-card-2',
            'prize-card-3',
            'prize-card-4',
            'prize-card-5',
            'prize-card-6',
          ],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    // Write initial match state
    const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);
    await writeFile(
      matchFilePath,
      JSON.stringify(initialMatchState, null, 2),
      'utf-8',
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Step 1: Player 1 attacks and knocks out opponent's Pokemon
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Flame Tail is the second attack (index 1) - does 30 damage, but Bulbasaur has weakness to Fire, so 60 damage
        },
      });

    if (attackResponse.status !== 200) {
      console.error(
        'Attack failed:',
        JSON.stringify(attackResponse.body, null, 2),
      );
      console.error(
        'Match file exists:',
        require('fs').existsSync(matchFilePath),
      );
    }
    expect(attackResponse.status).toBe(200);

    expect(attackResponse.body.state).toBe('PLAYER_TURN');
    expect(attackResponse.body.phase).toBe('END');
    expect(attackResponse.body.lastAction.actionType).toBe('ATTACK');
    expect(attackResponse.body.lastAction.actionData.isKnockedOut).toBe(true);
    expect(attackResponse.body.opponentState.activePokemon).toBeNull();
    expect(attackResponse.body.playerState.prizeCardsRemaining).toBe(6);
    expect(attackResponse.body.playerState.prizeCards).toHaveLength(6);

    // Step 2: Verify that SELECT_PRIZE is in availableActions and END_TURN is not
    expect(attackResponse.body.availableActions).toContain('SELECT_PRIZE');
    expect(attackResponse.body.availableActions).not.toContain('END_TURN');

    // Step 3: Try to end turn without selecting prize - should fail
    const endTurnResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(400);

    expect(endTurnResponse.body.message).toContain('select a prize card');

    // Step 4: Player 1 selects a specific prize (index 2)
    const prizeSelectionResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 2, // Select the third prize card
        },
      })
      .expect(200);

    expect(prizeSelectionResponse.body.state).toBe('PLAYER_TURN');
    expect(prizeSelectionResponse.body.playerState.prizeCardsRemaining).toBe(5);
    expect(prizeSelectionResponse.body.playerState.prizeCards).toHaveLength(5);
    expect(prizeSelectionResponse.body.playerState.hand).toContain(
      'prize-card-3',
    );
    expect(prizeSelectionResponse.body.playerState.prizeCards).not.toContain(
      'prize-card-3',
    );
    expect(prizeSelectionResponse.body.lastAction.actionType).toBe(
      'SELECT_PRIZE',
    );
    expect(prizeSelectionResponse.body.lastAction.actionData.prizeIndex).toBe(
      2,
    );
    expect(prizeSelectionResponse.body.lastAction.actionData.prizeCard).toBe(
      'prize-card-3',
    );

    // Step 5: Verify phase transitioned to SELECT_ACTIVE_POKEMON (opponent needs to select active Pokemon)
    const stateAfterPrize = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    // Phase should be SELECT_ACTIVE_POKEMON since opponent has bench Pokemon
    expect(stateAfterPrize.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(stateAfterPrize.body.availableActions).not.toContain('END_TURN'); // Can't end turn until opponent selects active
    expect(stateAfterPrize.body.availableActions).not.toContain('SELECT_PRIZE');

    // Step 6: Verify opponent can select active Pokemon after prize is selected
    const opponentStateBeforeTurnEnd = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    // Phase should be SELECT_ACTIVE_POKEMON
    expect(opponentStateBeforeTurnEnd.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(opponentStateBeforeTurnEnd.body.requiresActivePokemonSelection).toBe(
      true,
    );
    // Opponent should be able to select active Pokemon after prize is selected
    expect(opponentStateBeforeTurnEnd.body.availableActions).toContain(
      'SET_ACTIVE_POKEMON',
    );
    // Player 2's active Pokemon should be null (knocked out), opponentState shows Player 1's active Pokemon
    expect(
      opponentStateBeforeTurnEnd.body.playerState.activePokemon,
    ).toBeNull();

    // Step 7: Player 2 selects a new active Pokemon (Ivysaur from bench)
    const selectActiveResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-ivysaur--30',
        },
      })
      .expect(200);

    expect(selectActiveResponse.body.state).toBe('PLAYER_TURN');
    // Phase should transition back to END after active Pokemon is selected
    expect(selectActiveResponse.body.phase).toBe('END');
    // From Player 2's perspective, playerState is their own state
    expect(selectActiveResponse.body.playerState.activePokemon).not.toBeNull();
    expect(selectActiveResponse.body.playerState.activePokemon.cardId).toBe(
      'pokemon-base-set-v1.0-ivysaur--30',
    );

    // Step 8: Player 1 can now end turn (after opponent selected active Pokemon)
    const endTurnAfterPrize = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(200);

    expect(endTurnAfterPrize.body.state).toBe('PLAYER_TURN');
    expect(endTurnAfterPrize.body.currentPlayer).toBe('PLAYER2');
    expect(endTurnAfterPrize.body.turnNumber).toBe(2);
  });

  it('should prevent opponent from selecting active Pokemon before prize is selected', async () => {
    // Setup: Create a match where Player 1 just knocked out Player 2's Pokemon
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
      player1Type: null,
      player2Type: null,
      state: 'PLAYER_TURN',
      currentPlayer: 'PLAYER1',
      firstPlayer: 'PLAYER1',
      coinTossResult: 'PLAYER1',
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
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      startedAt: '2025-01-01T00:00:00.000Z',
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: ['pokemon-base-set-v1.0-ponyta--62'],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ], // 2 FIRE energy for Flame Tail attack
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: [
            'prize-1',
            'prize-2',
            'prize-3',
            'prize-4',
            'prize-5',
            'prize-6',
          ],
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--99'],
          hand: ['pokemon-base-set-v1.0-ivysaur--30'],
          activePokemon: null, // Knocked out
          bench: [
            {
              instanceId: 'ivysaur-instance-1',
              cardId: 'pokemon-base-set-v1.0-ivysaur--30',
              position: 'BENCH_0',
              maxHp: 60,
              currentHp: 60,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          ],
          prizeCards: [
            'prize-1',
            'prize-2',
            'prize-3',
            'prize-4',
            'prize-5',
            'prize-6',
          ],
          discardPile: ['pokemon-base-set-v1.0-bulbasaur--46'],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'END',
        currentPlayer: 'PLAYER1',
        lastAction: {
          actionId: 'attack-action-1',
          playerId: 'PLAYER1',
          actionType: 'ATTACK',
          timestamp: new Date().toISOString(),
          actionData: {
            attackIndex: 0,
            damage: 60,
            isKnockedOut: true,
          },
        },
        actionHistory: [
          {
            actionId: 'attack-action-1',
            playerId: 'PLAYER1',
            actionType: 'ATTACK',
            timestamp: new Date().toISOString(),
            actionData: {
              attackIndex: 0,
              damage: 60,
              isKnockedOut: true,
            },
          },
        ],
      },
    };

    const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);
    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Step 1: Player 2 tries to select active Pokemon before prize is selected - should fail
    const selectActiveBeforePrize = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-ivysaur--30',
        },
      })
      .expect(400);

    expect(selectActiveBeforePrize.body.message).toContain(
      'select a prize card first',
    );

    // Step 2: Player 1 selects a prize
    const prizeResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 0,
        },
      })
      .expect(200);

    expect(prizeResponse.body.playerState.prizeCardsRemaining).toBe(5);

    // Step 3: Now Player 2 can select active Pokemon
    const selectActiveAfterPrize = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-ivysaur--30',
        },
      })
      .expect(200);

    expect(
      selectActiveAfterPrize.body.opponentState.activePokemon,
    ).not.toBeNull();
  });

  it('should validate prize index when selecting prize', async () => {
    // Setup: Match after knockout
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
      player1Type: null,
      player2Type: null,
      state: 'PLAYER_TURN',
      currentPlayer: 'PLAYER1',
      firstPlayer: 'PLAYER1',
      coinTossResult: 'PLAYER1',
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
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      startedAt: '2025-01-01T00:00:00.000Z',
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: [],
          hand: [],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: ['prize-1', 'prize-2', 'prize-3'],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: null,
          bench: [],
          prizeCards: ['prize-1', 'prize-2', 'prize-3'],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'END',
        currentPlayer: 'PLAYER1',
        lastAction: {
          actionId: 'attack-action-1',
          playerId: 'PLAYER1',
          actionType: 'ATTACK',
          timestamp: new Date().toISOString(),
          actionData: {
            attackIndex: 0,
            damage: 60,
            isKnockedOut: true,
          },
        },
        actionHistory: [
          {
            actionId: 'attack-action-1',
            playerId: 'PLAYER1',
            actionType: 'ATTACK',
            timestamp: new Date().toISOString(),
            actionData: {
              attackIndex: 0,
              damage: 60,
              isKnockedOut: true,
            },
          },
        ],
      },
    };

    const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);
    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Try to select prize with invalid index (negative)
    const invalidNegativeIndex = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: -1,
        },
      })
      .expect(400);

    expect(invalidNegativeIndex.body.message).toContain('Invalid prizeIndex');

    // Try to select prize with invalid index (too high)
    const invalidHighIndex = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 10,
        },
      })
      .expect(400);

    expect(invalidHighIndex.body.message).toContain('Invalid prizeIndex');

    // Try to select prize without prizeIndex
    const missingIndex = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {},
      })
      .expect(400);

    expect(missingIndex.body.message).toContain('Invalid prizeIndex');

    // Valid selection
    const validSelection = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 1,
        },
      })
      .expect(200);

    expect(validSelection.body.playerState.prizeCardsRemaining).toBe(2);
    expect(validSelection.body.playerState.hand).toContain('prize-2');
  });

  it('should correctly detect prize selection state after knockout', async () => {
    // Setup: Match state matching spec-match-gameplay-flow.json scenario
    // Player 1 just knocked out Player 2's Pokemon, prize not yet selected
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
      player1Type: null,
      player2Type: null,
      state: 'PLAYER_TURN',
      currentPlayer: 'PLAYER1',
      firstPlayer: 'PLAYER1',
      coinTossResult: 'PLAYER1',
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
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-12-02T08:32:35.012Z',
      startedAt: '2025-01-01T00:00:00.000Z',
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: ['pokemon-base-set-v1.0-fire-energy--99'],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ], // 2 FIRE energy for Flame Tail attack
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: [
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-bill--92',
            'pokemon-base-set-v1.0-bill--92',
          ],
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--100'],
          hand: ['pokemon-base-set-v1.0-potion--90'],
          activePokemon: null, // Knocked out
          bench: [
            {
              instanceId: 'weedle-instance-1',
              cardId: 'pokemon-base-set-v1.0-weedle--71',
              position: 'BENCH_0',
              maxHp: 40,
              currentHp: 40,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          ],
          prizeCards: [
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-caterpie--47',
            'pokemon-base-set-v1.0-weedle--71',
            'pokemon-base-set-v1.0-gust-of-wind--94',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-nidoran--57',
          ],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 5,
        phase: 'END',
        currentPlayer: 'PLAYER1',
        lastAction: {
          actionId: '528e8d0a-121b-44cf-b209-5e450439c274',
          playerId: 'PLAYER1',
          actionType: 'ATTACK',
          timestamp: '2025-12-02T08:32:35.012Z',
          actionData: {
            attackIndex: 1,
            damage: 60,
            isKnockedOut: true,
          },
        },
        actionHistory: [
          {
            actionId: '528e8d0a-121b-44cf-b209-5e450439c274',
            playerId: 'PLAYER1',
            actionType: 'ATTACK',
            timestamp: '2025-12-02T08:32:35.012Z',
            actionData: {
              attackIndex: 1,
              damage: 60,
              isKnockedOut: true,
            },
          },
        ],
      },
    };

    const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);
    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Step 1: Get match state - should show SELECT_PRIZE is available
    const stateResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    // Verify the state detection logic works correctly
    expect(stateResponse.body.phase).toBe('END');
    expect(stateResponse.body.currentPlayer).toBe('PLAYER1');
    expect(stateResponse.body.lastAction.actionType).toBe('ATTACK');
    expect(stateResponse.body.lastAction.actionData.isKnockedOut).toBe(true);
    expect(stateResponse.body.opponentState.activePokemon).toBeNull();

    // Prize selection should be available, END_TURN should not be
    expect(stateResponse.body.availableActions).toContain('SELECT_PRIZE');
    expect(stateResponse.body.availableActions).not.toContain('END_TURN');

    // Step 2: Select a prize
    const prizeResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 0,
        },
      })
      .expect(200);

    expect(prizeResponse.body.playerState.prizeCardsRemaining).toBe(4);
    expect(prizeResponse.body.lastAction.actionType).toBe('SELECT_PRIZE');

    // Step 3: After prize selection, phase should be SELECT_ACTIVE_POKEMON (opponent needs to select)
    const stateAfterPrize = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(stateAfterPrize.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(stateAfterPrize.body.availableActions).not.toContain('END_TURN'); // Can't end turn until opponent selects
    expect(stateAfterPrize.body.availableActions).not.toContain('SELECT_PRIZE');
  });
});
