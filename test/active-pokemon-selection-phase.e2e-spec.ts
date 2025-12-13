import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile } from 'fs/promises';
import { join } from 'path';

describe('Active Pokemon Selection Phase E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-active-pokemon-selection-phase';
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
  });

  beforeEach(async () => {
    // Files are cleaned up by jest-global-setup before test run
  });

  it('should transition to SELECT_ACTIVE_POKEMON phase after prize selection when opponent has bench Pokemon', async () => {
    // Setup: Match after knockout, prize not yet selected
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
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
            attachedEnergy: ['pokemon-base-set-v1.0-fire-energy--99', 'pokemon-base-set-v1.0-fire-energy--99'],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: null, // Knocked out
          bench: [
            {
              instanceId: 'ivysaur-instance-1',
              cardId: 'pokemon-base-set-v1.0-ivysaur--30',
              position: 'BENCH_0',
              maxHp: 60,
              currentHp: 60,
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'],
              statusEffect: 'NONE',
              damageCounters: 0,
              evolutionChain: ['pokemon-base-set-v1.0-bulbasaur--46'],
            },
          ],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
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

    // Step 1: Player 1 selects a prize
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

    // Step 2: Verify phase transitioned to SELECT_ACTIVE_POKEMON
    expect(prizeResponse.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(prizeResponse.body.requiresActivePokemonSelection).toBe(false); // Player 1 doesn't need to select
    expect(prizeResponse.body.playersRequiringActiveSelection).toEqual(['PLAYER2']);

    // Step 3: Verify Player 2 can see SET_ACTIVE_POKEMON action
    const player2State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2State.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(player2State.body.requiresActivePokemonSelection).toBe(true);
    expect(player2State.body.availableActions).toContain('SET_ACTIVE_POKEMON');

    // Step 4: Player 2 selects active Pokemon
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

    // Step 5: Verify phase transitioned back to END
    expect(selectActiveResponse.body.phase).toBe('END');
    expect(selectActiveResponse.body.requiresActivePokemonSelection).toBeUndefined();
    expect(selectActiveResponse.body.playerState.activePokemon).toBeTruthy();
    expect(selectActiveResponse.body.playerState.activePokemon.cardId).toBe('pokemon-base-set-v1.0-ivysaur--30');
  });

  it('should not transition to SELECT_ACTIVE_POKEMON phase when opponent has no bench Pokemon', async () => {
    // Setup: Match after knockout, opponent has no bench Pokemon
    const initialMatchState = {
      id: `${MATCH_ID}-no-bench`,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
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
            evolutionChain: [],
          },
          bench: [],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: null, // Knocked out
          bench: [], // No bench Pokemon
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
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

    const matchFilePath = join(matchesDirectory, `${MATCH_ID}-no-bench.json`);
    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Step 1: Player 1 selects a prize
    const prizeResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-no-bench/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 0,
        },
      })
      .expect(200);

    // Step 2: Verify phase stays as END (no SELECT_ACTIVE_POKEMON since no bench Pokemon)
    expect(prizeResponse.body.phase).toBe('END');
    expect(prizeResponse.body.requiresActivePokemonSelection).toBeUndefined();
    
    // Step 3: Verify win condition was checked (opponent has no Pokemon)
    // The match should either be ended or ready to end
    // Note: Win condition check happens after prize selection
  });

  it('should handle double knockout with both players selecting active Pokemon', async () => {
    // Setup: Both players have active Pokemon knocked out (self-damage scenario)
    const initialMatchState = {
      id: `${MATCH_ID}-double-knockout`,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
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
          activePokemon: null, // Knocked out by self-damage
          bench: [
            {
              instanceId: 'charmander-instance-1',
              cardId: 'pokemon-base-set-v1.0-charmander--48',
              position: 'BENCH_0',
              maxHp: 50,
              currentHp: 50,
              attachedEnergy: [],
              statusEffect: 'NONE',
              damageCounters: 0,
              evolutionChain: [],
            },
          ],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
          discardPile: ['pokemon-base-set-v1.0-ponyta--62'],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
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
              evolutionChain: [],
            },
          ],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
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

    const matchFilePath = join(matchesDirectory, `${MATCH_ID}-double-knockout.json`);
    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Step 1: Player 1 selects a prize
    const prizeResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-double-knockout/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 0,
        },
      })
      .expect(200);

    // Step 2: Verify phase transitioned to SELECT_ACTIVE_POKEMON and both players need to select
    expect(prizeResponse.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(prizeResponse.body.playersRequiringActiveSelection).toEqual(['PLAYER1', 'PLAYER2']);

    // Step 3: Verify both players can see SET_ACTIVE_POKEMON action
    const player1State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-double-knockout/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(player1State.body.requiresActivePokemonSelection).toBe(true);
    expect(player1State.body.availableActions).toContain('SET_ACTIVE_POKEMON');

    const player2State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-double-knockout/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2State.body.requiresActivePokemonSelection).toBe(true);
    expect(player2State.body.availableActions).toContain('SET_ACTIVE_POKEMON');

    // Step 4: Player 1 selects active Pokemon
    const player1SelectResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-double-knockout/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-charmander--48',
        },
      })
      .expect(200);

    // Step 5: Verify phase is still SELECT_ACTIVE_POKEMON (Player 2 still needs to select)
    expect(player1SelectResponse.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(player1SelectResponse.body.playersRequiringActiveSelection).toEqual(['PLAYER2']);

    // Step 6: Player 2 selects active Pokemon
    const player2SelectResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-double-knockout/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-ivysaur--30',
        },
      })
      .expect(200);

    // Step 7: Verify phase transitioned back to END after both players selected
    expect(player2SelectResponse.body.phase).toBe('END');
    expect(player2SelectResponse.body.playersRequiringActiveSelection).toBeUndefined();
    expect(player2SelectResponse.body.playerState.activePokemon).toBeTruthy();
  });

  it('should prevent attacker from ending turn when opponent needs to select active Pokemon', async () => {
    // Setup: Match after knockout, prize selected, opponent has bench Pokemon
    const initialMatchState = {
      id: `${MATCH_ID}-prevent-end-turn`,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
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
            evolutionChain: [],
          },
          bench: [],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
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
              evolutionChain: [],
            },
          ],
          prizeCards: ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
          discardPile: ['pokemon-base-set-v1.0-bulbasaur--46'],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'SELECT_ACTIVE_POKEMON', // Already in selection phase (prize was selected)
        currentPlayer: 'PLAYER1',
        lastAction: {
          actionId: 'prize-action-1',
          playerId: 'PLAYER1',
          actionType: 'SELECT_PRIZE',
          timestamp: new Date().toISOString(),
          actionData: {
            prizeIndex: 0,
            prizeCard: 'prize-1',
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
          {
            actionId: 'prize-action-1',
            playerId: 'PLAYER1',
            actionType: 'SELECT_PRIZE',
            timestamp: new Date().toISOString(),
            actionData: {
              prizeIndex: 0,
              prizeCard: 'prize-1',
            },
          },
        ],
      },
    };

    const matchFilePath = join(matchesDirectory, `${MATCH_ID}-prevent-end-turn.json`);
    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Step 1: Verify phase is SELECT_ACTIVE_POKEMON
    const initialState = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-prevent-end-turn/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(initialState.body.phase).toBe('SELECT_ACTIVE_POKEMON');
    expect(initialState.body.playersRequiringActiveSelection).toEqual(['PLAYER2']);

    // Step 2: Try to end turn (should fail)
    const endTurnResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-prevent-end-turn/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(400);

    expect(endTurnResponse.body.message).toContain(
      'Cannot end turn. Opponent must select an active Pokemon',
    );

    // Step 3: Verify END_TURN is not in available actions
    const stateAfterFailedEndTurn = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-prevent-end-turn/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(stateAfterFailedEndTurn.body.availableActions).not.toContain('END_TURN');

    // Step 4: Opponent selects active Pokemon
    const opponentSelectResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-prevent-end-turn/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-ivysaur--30',
        },
      })
      .expect(200);

    expect(opponentSelectResponse.body.phase).toBe('END');

    // Step 5: Now attacker can end turn (should succeed)
    const endTurnAfterSelection = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}-prevent-end-turn/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(200);

    // After ending turn, state should be PLAYER_TURN, BETWEEN_TURNS, or MATCH_ENDED (if win condition met)
    expect(['PLAYER_TURN', 'BETWEEN_TURNS', 'MATCH_ENDED']).toContain(endTurnAfterSelection.body.state);
  });
});
