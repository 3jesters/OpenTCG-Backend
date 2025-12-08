import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Trainer Card Validation E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-trainer-card-validation';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';
  const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Keep test match file for inspection - will be cleaned up by jest-global-setup
  });

  beforeEach(async () => {
    // Files are cleaned up by jest-global-setup before test run

    // Set deterministic shuffle seed to prevent random shuffling
    process.env.MATCH_SHUFFLE_SEED = '99999';

    // Create initial match state with Energy Retrieval in hand
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
      player1ReadyToStart: true,
      player2ReadyToStart: true,
      player1Approved: true,
      player2Approved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
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
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
          ],
          hand: [
            'pokemon-base-set-v1.0-energy-retrieval--83', // First Energy Retrieval at index 0
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-energy-retrieval--83', // Second Energy Retrieval at index 2
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
            'pokemon-base-set-v1.0-fire-energy--99',
          ],
          activePokemon: {
            instanceId: 'test-instance-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            currentHp: 50,
            maxHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
        },
        player2State: {
          deck: Array(50).fill('pokemon-base-set-v1.0-grass-energy--100'),
          hand: Array(7).fill('pokemon-base-set-v1.0-grass-energy--100'),
          activePokemon: {
            instanceId: 'test-instance-2',
            cardId: 'pokemon-base-set-v1.0-bulbasaur--44',
            position: 'ACTIVE',
            currentHp: 40,
            maxHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [],
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    // Write the initial match state to file
    await writeFile(
      matchFilePath,
      JSON.stringify(initialMatchState, null, 2),
      'utf-8',
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.MATCH_SHUFFLE_SEED;
  });

  it('should prevent selecting the same trainer card that was just played', async () => {
    const energyRetrievalCardId = 'pokemon-base-set-v1.0-energy-retrieval--83';
    const fireEnergyCardId = 'pokemon-base-set-v1.0-fire-energy--99';

    // Get initial state to find the index of Energy Retrieval
    const initialStateResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    const hand = initialStateResponse.body.playerState.hand;
    const energyRetrievalIndex = hand.indexOf(energyRetrievalCardId);
    expect(energyRetrievalIndex).toBeGreaterThanOrEqual(0);

    // Attempt to play Energy Retrieval and discard the same card
    const response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_TRAINER',
        actionData: {
          cardId: energyRetrievalCardId,
          handCardId: energyRetrievalCardId, // Try to discard the same card
          handCardIndex: energyRetrievalIndex, // Use the index of the played card
        },
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Cannot select the same trainer card that was just played',
    );
  });

  it('should allow selecting a different copy when multiple copies exist', async () => {
    const energyRetrievalCardId = 'pokemon-base-set-v1.0-energy-retrieval--83';
    const fireEnergyCardId = 'pokemon-base-set-v1.0-fire-energy--99';

    // Get initial state to find indices
    const initialStateResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    const hand = initialStateResponse.body.playerState.hand;
    const firstEnergyRetrievalIndex = hand.indexOf(energyRetrievalCardId);
    const secondEnergyRetrievalIndex = hand.lastIndexOf(energyRetrievalCardId);

    expect(firstEnergyRetrievalIndex).toBe(0);
    expect(secondEnergyRetrievalIndex).toBe(2);
    expect(firstEnergyRetrievalIndex).not.toBe(secondEnergyRetrievalIndex);

    // Play first Energy Retrieval (index 0) and discard second Energy Retrieval (index 2)
    const response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_TRAINER',
        actionData: {
          cardId: energyRetrievalCardId,
          handCardId: energyRetrievalCardId, // Same cardId but different copy
          handCardIndex: secondEnergyRetrievalIndex, // Use index of second copy
          selectedCardIds: [], // No energy cards to retrieve in this test
        },
      })
      .expect(200);

    // Verify the response
    expect(response.body.state).toBe('PLAYER_TURN');
    expect(response.body.phase).toBe('MAIN_PHASE');

    // Verify Energy Retrieval was removed from hand
    const updatedHand = response.body.playerState.hand;
    const energyRetrievalCount = updatedHand.filter(
      (id: string) => id === energyRetrievalCardId,
    ).length;
    expect(energyRetrievalCount).toBe(0); // Both copies should be removed (one played, one discarded)

    // Verify both Energy Retrieval cards are in discard pile
    const discardPile = response.body.playerState.discardPile;
    const energyRetrievalInDiscard = discardPile.filter(
      (id: string) => id === energyRetrievalCardId,
    );
    expect(energyRetrievalInDiscard.length).toBe(2); // Both copies should be in discard
  });

  it('should verify trainer card is moved to discard after use', async () => {
    const energyRetrievalCardId = 'pokemon-base-set-v1.0-energy-retrieval--83';
    const fireEnergyCardId = 'pokemon-base-set-v1.0-fire-energy--99';

    // Get initial state
    const initialStateResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    const initialHand = initialStateResponse.body.playerState.hand;
    const initialDiscardPile = initialStateResponse.body.playerState.discardPile;
    const energyRetrievalIndex = initialHand.indexOf(energyRetrievalCardId);
    const fireEnergyIndex = initialHand.indexOf(fireEnergyCardId);
    const initialFireEnergyCount = initialHand.filter(
      (id: string) => id === fireEnergyCardId,
    ).length;

    expect(energyRetrievalIndex).toBeGreaterThanOrEqual(0);
    expect(fireEnergyIndex).toBeGreaterThanOrEqual(0);
    expect(initialFireEnergyCount).toBeGreaterThan(0);

    // Play Energy Retrieval and discard a different card (fire energy)
    const response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_TRAINER',
        actionData: {
          cardId: energyRetrievalCardId,
          handCardId: fireEnergyCardId,
          handCardIndex: fireEnergyIndex,
          selectedCardIds: [], // No energy cards to retrieve in this test
        },
      })
      .expect(200);

    // Verify the response
    expect(response.body.state).toBe('PLAYER_TURN');
    expect(response.body.phase).toBe('MAIN_PHASE');

    // Verify Energy Retrieval was removed from hand
    const updatedHand = response.body.playerState.hand;
    expect(updatedHand.includes(energyRetrievalCardId)).toBe(false);

    // Verify Energy Retrieval is in discard pile
    const discardPile = response.body.playerState.discardPile;
    expect(discardPile.includes(energyRetrievalCardId)).toBe(true);

    // Verify selected card (fire energy) count decreased by 1
    const updatedFireEnergyCount = updatedHand.filter(
      (id: string) => id === fireEnergyCardId,
    ).length;
    expect(updatedFireEnergyCount).toBe(initialFireEnergyCount - 1);

    // Verify selected card (fire energy) is in discard pile
    expect(discardPile.includes(fireEnergyCardId)).toBe(true);

    // Verify discard pile contains exactly 2 cards (Energy Retrieval + fire energy)
    expect(discardPile.length).toBe(initialDiscardPile.length + 2);
  });
});

