import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile } from 'fs/promises';
import { join } from 'path';

describe('Energy Retrieval E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-energy-retrieval';
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
    // Keep test match file for inspection - will be cleaned up by jest-global-setup before next run
  });

  beforeEach(async () => {
    // Files are cleaned up by jest-global-setup before test run
    // Set deterministic shuffle seed to prevent random shuffling
    process.env.MATCH_SHUFFLE_SEED = '99999';
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.MATCH_SHUFFLE_SEED;
  });

  it('should retrieve energy cards from discard pile and add them to hand', async () => {
    const energyRetrievalCardId = 'pokemon-base-set-v1.0-energy-retrieval--83';
    const pokemonBreederCardId = 'pokemon-base-set-v1.0-pokemon-breeder--78';
    const grassEnergyCardId1 = 'pokemon-base-set-v1.0-grass-energy--100';
    const grassEnergyCardId2 = 'pokemon-base-set-v1.0-grass-energy--100';

    const initialMatchState = {
      id: MATCH_ID,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
      state: 'PLAYER_TURN',
      currentPlayer: 'PLAYER2',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: Array(30).fill('pokemon-base-set-v1.0-fire-energy--99'),
          hand: Array(7).fill('pokemon-base-set-v1.0-fire-energy--99'),
          activePokemon: {
            instanceId: 'charmander-instance-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            maxHp: 50,
            currentHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: Array(30).fill('pokemon-base-set-v1.0-grass-energy--100'),
          hand: [
            energyRetrievalCardId,
            pokemonBreederCardId,
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
          ],
          activePokemon: {
            instanceId: 'bulbasaur-instance-1',
            cardId: 'pokemon-base-set-v1.0-bulbasaur--46',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [
            grassEnergyCardId1,
            grassEnergyCardId2,
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
          ], // 4 grass energy cards in discard pile
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER2',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      matchFilePath,
      JSON.stringify(initialMatchState, null, 2),
      'utf-8',
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get initial state
    const initialStateResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    const initialHand = initialStateResponse.body.playerState.hand;
    const initialDiscardPile = initialStateResponse.body.playerState.discardPile;
    const initialHandSize = initialHand.length;
    const initialDiscardSize = initialDiscardPile.length;

    // Verify initial state
    expect(initialHand.includes(energyRetrievalCardId)).toBe(true);
    expect(initialHand.includes(pokemonBreederCardId)).toBe(true);
    expect(initialDiscardPile.includes(grassEnergyCardId1)).toBe(true);
    expect(initialDiscardPile.includes(grassEnergyCardId2)).toBe(true);

    // Play Energy Retrieval: discard Pokemon Breeder, retrieve 2 grass energy from discard
    const response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'PLAY_TRAINER',
        actionData: {
          cardId: energyRetrievalCardId,
          handCardId: pokemonBreederCardId,
          selectedCardIds: [grassEnergyCardId1, grassEnergyCardId2], // Retrieve 2 energy from discard
        },
      })
      .expect(200);

    // Verify the response
    expect(response.body.state).toBe('PLAYER_TURN');
    expect(response.body.phase).toBe('MAIN_PHASE');

    const updatedHand = response.body.playerState.hand;
    const updatedDiscardPile = response.body.playerState.discardPile;

    // Verify Energy Retrieval was removed from hand
    expect(updatedHand.includes(energyRetrievalCardId)).toBe(false);

    // Verify Energy Retrieval is in discard pile
    expect(updatedDiscardPile.includes(energyRetrievalCardId)).toBe(true);

    // Verify Pokemon Breeder was removed from hand
    expect(updatedHand.includes(pokemonBreederCardId)).toBe(false);

    // Verify Pokemon Breeder is in discard pile
    expect(updatedDiscardPile.includes(pokemonBreederCardId)).toBe(true);

    // Verify selected energy cards were removed from discard pile
    // Note: grassEnergyCardId1 and grassEnergyCardId2 are the same ID, so we count once
    const grassEnergyInDiscard = updatedDiscardPile.filter(
      (id: string) => id === grassEnergyCardId1,
    ).length;
    
    // Should have 2 fewer grass energy cards in discard (the 2 we retrieved)
    const initialGrassEnergyCount = initialDiscardPile.filter(
      (id: string) => id === grassEnergyCardId1,
    ).length;
    expect(grassEnergyInDiscard).toBe(initialGrassEnergyCount - 2);

    // Verify selected energy cards were added to hand
    const grassEnergyInHand = updatedHand.filter(
      (id: string) => id === grassEnergyCardId1,
    ).length;
    expect(grassEnergyInHand).toBeGreaterThanOrEqual(2); // At least 2 grass energy in hand

    // Verify hand size: lost Energy Retrieval and Pokemon Breeder, gained 2 energy
    // Initial: 7 cards
    // Remove Energy Retrieval: 6 cards
    // Remove Pokemon Breeder: 5 cards
    // Add 2 energy from discard: 7 cards
    expect(updatedHand.length).toBe(initialHandSize); // Net: -2 + 2 = 0, so same size

    // Verify discard pile size: initial + Energy Retrieval + Pokemon Breeder - 2 energy = initial + 2 - 2 = initial
    expect(updatedDiscardPile.length).toBe(initialDiscardSize);
  });

  it('should retrieve multiple identical energy cards from discard pile when selectedCardIds contains duplicates', async () => {
    const energyRetrievalCardId = 'pokemon-base-set-v1.0-energy-retrieval--83';
    const pokemonBreederCardId = 'pokemon-base-set-v1.0-pokemon-breeder--78';
    const grassEnergyCardId = 'pokemon-base-set-v1.0-grass-energy--100';

    const matchIdForRequest = `${MATCH_ID}-multiple-identical`;
    const initialMatchState = {
      id: matchIdForRequest,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-grass-starter-deck',
      state: 'PLAYER_TURN',
      currentPlayer: 'PLAYER2',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      winnerId: null,
      result: null,
      winCondition: null,
      cancellationReason: null,
      gameState: {
        player1State: {
          deck: Array(30).fill('pokemon-base-set-v1.0-fire-energy--99'),
          hand: Array(7).fill('pokemon-base-set-v1.0-fire-energy--99'),
          activePokemon: {
            instanceId: 'charmander-instance-1',
            cardId: 'pokemon-base-set-v1.0-charmander--48',
            position: 'ACTIVE',
            maxHp: 50,
            currentHp: 50,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        player2State: {
          deck: Array(30).fill('pokemon-base-set-v1.0-grass-energy--100'),
          hand: [
            energyRetrievalCardId,
            pokemonBreederCardId,
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
            'pokemon-base-set-v1.0-grass-energy--100',
          ],
          activePokemon: {
            instanceId: 'bulbasaur-instance-1',
            cardId: 'pokemon-base-set-v1.0-bulbasaur--46',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [
            grassEnergyCardId,
            grassEnergyCardId,
            grassEnergyCardId,
          ], // 3 identical grass energy cards in discard pile
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER2',
        lastAction: null,
        actionHistory: [],
      },
    };

    const matchFilePathForRequest = join(matchesDirectory, `${matchIdForRequest}.json`);
    await writeFile(
      matchFilePathForRequest,
      JSON.stringify(initialMatchState, null, 2),
      'utf-8',
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get initial state
    const initialStateResponse = await request(server())
      .post(`/api/v1/matches/${matchIdForRequest}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    const initialHand = initialStateResponse.body.playerState.hand;
    const initialDiscardPile = initialStateResponse.body.playerState.discardPile;
    const initialHandSize = initialHand.length;
    const initialDiscardSize = initialDiscardPile.length;

    // Verify initial state
    expect(initialHand.includes(energyRetrievalCardId)).toBe(true);
    expect(initialHand.includes(pokemonBreederCardId)).toBe(true);
    expect(initialDiscardPile.filter((id: string) => id === grassEnergyCardId).length).toBe(3);

    // Play Energy Retrieval: discard Pokemon Breeder, retrieve 2 identical grass energy from discard
    // Note: selectedCardIds contains the same ID twice to retrieve 2 copies
    const response = await request(server())
      .post(`/api/v1/matches/${matchIdForRequest}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'PLAY_TRAINER',
        actionData: {
          cardId: energyRetrievalCardId,
          handCardId: pokemonBreederCardId,
          selectedCardIds: [grassEnergyCardId, grassEnergyCardId], // Retrieve 2 identical cards
        },
      })
      .expect(200);

    // Verify the response
    expect(response.body.state).toBe('PLAYER_TURN');
    expect(response.body.phase).toBe('MAIN_PHASE');

    const updatedHand = response.body.playerState.hand;
    const updatedDiscardPile = response.body.playerState.discardPile;

    // Verify Energy Retrieval was removed from hand
    expect(updatedHand.includes(energyRetrievalCardId)).toBe(false);

    // Verify Energy Retrieval is in discard pile
    expect(updatedDiscardPile.includes(energyRetrievalCardId)).toBe(true);

    // Verify Pokemon Breeder was removed from hand
    expect(updatedHand.includes(pokemonBreederCardId)).toBe(false);

    // Verify Pokemon Breeder is in discard pile
    expect(updatedDiscardPile.includes(pokemonBreederCardId)).toBe(true);

    // Verify 2 energy cards were removed from discard pile (should have 1 left)
    const grassEnergyInDiscard = updatedDiscardPile.filter(
      (id: string) => id === grassEnergyCardId,
    ).length;
    expect(grassEnergyInDiscard).toBe(1); // Started with 3, retrieved 2, should have 1 left

    // Verify 2 energy cards were added to hand
    const grassEnergyInHand = updatedHand.filter(
      (id: string) => id === grassEnergyCardId,
    ).length;
    const initialGrassEnergyInHand = initialHand.filter(
      (id: string) => id === grassEnergyCardId,
    ).length;
    expect(grassEnergyInHand).toBe(initialGrassEnergyInHand + 2); // Should have 2 more than initial

    // Verify hand size: lost Energy Retrieval and Pokemon Breeder, gained 2 energy = net 0
    expect(updatedHand.length).toBe(initialHandSize);

    // Verify discard pile size: initial + Energy Retrieval + Pokemon Breeder - 2 energy = initial + 2 - 2 = initial
    expect(updatedDiscardPile.length).toBe(initialDiscardSize);
  });
});

