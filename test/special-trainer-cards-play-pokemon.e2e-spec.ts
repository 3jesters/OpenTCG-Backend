import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Special Trainer Cards - Play as Basic Pokemon E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-special-trainer-cards';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';
  const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Clean up any existing match file
    try {
      await unlink(matchFilePath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  });

  afterAll(async () => {
    await app.close();
    // Clean up test match file
    try {
      await unlink(matchFilePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should allow playing Clefairy Doll as Basic Pokemon', async () => {
    // Create a match in MAIN_PHASE with Clefairy Doll in hand
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-water-starter-deck',
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
      createdAt: '2025-12-12T20:00:00.000Z',
      updatedAt: '2025-12-12T20:00:00.000Z',
      startedAt: null,
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: [],
          hand: ['pokemon-base-set-v1.0-clefairy-doll--72'],
          activePokemon: {
            instanceId: 'active-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            currentHp: 50,
            maxHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: [],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: {
            instanceId: 'active-2',
            cardId: 'pokemon-base-set-v1.0-squirtle--65',
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
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
        coinFlipState: null,
        effectState: new Map(),
      },
    };

    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Try to play Clefairy Doll as Basic Pokemon
    const response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-clefairy-doll--72',
        },
      })
      .expect(200);

    // Verify Clefairy Doll was added to bench
    expect(response.body.playerState.bench).toHaveLength(1);
    expect(response.body.playerState.bench[0].cardId).toBe('pokemon-base-set-v1.0-clefairy-doll--72');
    expect(response.body.playerState.hand).not.toContain('pokemon-base-set-v1.0-clefairy-doll--72');
  });

  it('should allow playing Mysterious Fossil as Basic Pokemon', async () => {
    // Create a match in MAIN_PHASE with Mysterious Fossil in hand
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-water-starter-deck',
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
      createdAt: '2025-12-12T20:00:00.000Z',
      updatedAt: '2025-12-12T20:00:00.000Z',
      startedAt: null,
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: [],
          hand: ['pokemon-fossil-v1.0-mysterious-fossil--61'], // Card number 61
          activePokemon: {
            instanceId: 'active-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            currentHp: 50,
            maxHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: [],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: {
            instanceId: 'active-2',
            cardId: 'pokemon-base-set-v1.0-squirtle--65',
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
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
        coinFlipState: null,
        effectState: new Map(),
      },
    };

    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Try to play Mysterious Fossil as Basic Pokemon
    const response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_POKEMON',
        actionData: {
          cardId: 'pokemon-fossil-v1.0-mysterious-fossil--61',
        },
      })
      .expect(200);

    // Verify Mysterious Fossil was added to bench
    expect(response.body.playerState.bench).toHaveLength(1);
    expect(response.body.playerState.bench[0].cardId).toBe('pokemon-fossil-v1.0-mysterious-fossil--61');
    expect(response.body.playerState.hand).not.toContain('pokemon-fossil-v1.0-mysterious-fossil--61');
  });

  it('should reject playing regular trainer card as Pokemon', async () => {
    // Create a match in MAIN_PHASE with a regular trainer card (Bill) in hand
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-water-starter-deck',
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
      createdAt: '2025-12-12T20:00:00.000Z',
      updatedAt: '2025-12-12T20:00:00.000Z',
      startedAt: null,
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: [],
          hand: ['pokemon-base-set-v1.0-bill--92'],
          activePokemon: {
            instanceId: 'active-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            currentHp: 50,
            maxHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: [],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: {
            instanceId: 'active-2',
            cardId: 'pokemon-base-set-v1.0-squirtle--65',
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
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
        coinFlipState: null,
        effectState: new Map(),
      },
    };

    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Try to play Bill as Pokemon (should fail)
    await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-bill--92',
        },
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Only Pokemon cards can be played to the bench');
      });
  });

  it('should reject playing evolved Pokemon directly', async () => {
    // Create a match in MAIN_PHASE with Wartortle (STAGE_1) in hand
    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-water-starter-deck',
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
      createdAt: '2025-12-12T20:00:00.000Z',
      updatedAt: '2025-12-12T20:00:00.000Z',
      startedAt: null,
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: [],
          hand: ['pokemon-base-set-v1.0-wartortle--44'],
          activePokemon: {
            instanceId: 'active-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            currentHp: 50,
            maxHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: [],
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: [],
          hand: [],
          activePokemon: {
            instanceId: 'active-2',
            cardId: 'pokemon-base-set-v1.0-squirtle--65',
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
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
        coinFlipState: null,
        effectState: new Map(),
      },
    };

    await writeFile(matchFilePath, JSON.stringify(initialMatchState, null, 2));

    // Try to play Wartortle directly (should fail)
    await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-wartortle--44',
        },
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Cannot play STAGE_1 Pokemon directly');
      });
  });
});

