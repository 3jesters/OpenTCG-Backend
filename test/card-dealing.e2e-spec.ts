import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Dealing E2E (real data)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  const TOURNAMENT_ID = 'classic-tournament';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';
  const FIRE_DECK = 'classic-fire-starter-deck';
  const WATER_DECK = 'classic-water-starter-deck';
  const GRASS_DECK = 'classic-grass-starter-deck';

  const MATCH_IDS = {
    scenario1: 'spec-match-3',
    scenario2: 'spec-match-4',
    scenario3: 'spec-match-5',
    scenario4: 'spec-match-6',
    scenario5a: 'spec-match-9',
    scenario5b: 'spec-match-10',
  } as const;

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
  });

  const waitForDeckValidation = () =>
    new Promise((resolve) => setTimeout(resolve, 500));

  const verifyCardDistribution = (state: any) => {
    expect(state.playerState.handCount).toBe(7);
    expect(state.playerState.prizeCardsRemaining).toBe(6);
    expect(state.playerState.deckCount).toBe(47);

    expect(state.opponentState.handCount).toBe(7);
    expect(state.opponentState.prizeCardsRemaining).toBe(6);
    expect(state.opponentState.deckCount).toBe(47);
  };

  async function withShuffleSeed<T>(seed: number | undefined, fn: () => Promise<T>) {
    const previous = process.env.MATCH_SHUFFLE_SEED;
    if (seed === undefined) {
      delete process.env.MATCH_SHUFFLE_SEED;
    } else {
      process.env.MATCH_SHUFFLE_SEED = seed.toString();
    }

    try {
      return await fn();
    } finally {
      if (previous === undefined) {
        delete process.env.MATCH_SHUFFLE_SEED;
      } else {
        process.env.MATCH_SHUFFLE_SEED = previous;
      }
    }
  }

  async function createAndStartMatch(options: {
    matchId: string;
    player1DeckId: string;
    player2DeckId: string;
    shuffleSeed?: number;
  }) {
    const { matchId, player1DeckId, player2DeckId, shuffleSeed } = options;

    await request(server())
      .post('/api/v1/matches')
      .send({
        id: matchId,
        tournamentId: TOURNAMENT_ID,
        player1Id: PLAYER1_ID,
        player1DeckId,
      })
      .expect(201);

    await request(server())
      .post(`/api/v1/matches/${matchId}/join`)
      .send({
        playerId: PLAYER2_ID,
        deckId: player2DeckId,
      })
      .expect(200);

    await waitForDeckValidation();

    return await withShuffleSeed(shuffleSeed, async () => {
      await request(server())
        .post(`/api/v1/matches/${matchId}/start`)
        .send({ playerId: PLAYER1_ID, firstPlayer: 'PLAYER1' })
        .expect(200);

      const { body } = await request(server())
        .post(`/api/v1/matches/${matchId}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      return body;
    });
  }

  describe('Scenario 1: No reshuffle needed (classic decks)', () => {
    it('deals cards directly when both hands are valid', async () => {
      const state = await createAndStartMatch({
        matchId: MATCH_IDS.scenario1,
        player1DeckId: FIRE_DECK,
        player2DeckId: WATER_DECK,
      });

      verifyCardDistribution(state);
      expect(state.state).toBe('INITIAL_SETUP');
    });
  });

  describe('Scenario 2: Only player 1 requires reshuffle', () => {
    it('reshuffles player 1 when initial hand lacks a Basic Pokémon', async () => {
      const state = await createAndStartMatch({
        matchId: MATCH_IDS.scenario2,
        player1DeckId: FIRE_DECK,
        player2DeckId: WATER_DECK,
        shuffleSeed: 102,
      });

      verifyCardDistribution(state);
      expect(state.state).toBe('INITIAL_SETUP');
    });
  });

  describe('Scenario 3: Both players reshuffle', () => {
    it('reshuffles each player independently when both hands are invalid', async () => {
      const state = await createAndStartMatch({
        matchId: MATCH_IDS.scenario3,
        player1DeckId: FIRE_DECK,
        player2DeckId: WATER_DECK,
        shuffleSeed: 3,
      });

      verifyCardDistribution(state);
      expect(state.state).toBe('INITIAL_SETUP');
    });
  });

  describe('Scenario 4: Multiple reshuffles before success', () => {
    it('continues reshuffling until player 1 draws a valid hand', async () => {
      const state = await createAndStartMatch({
        matchId: MATCH_IDS.scenario4,
        player1DeckId: GRASS_DECK,
        player2DeckId: WATER_DECK,
        shuffleSeed: 164,
      });

      verifyCardDistribution(state);
      expect(state.state).toBe('INITIAL_SETUP');
    });
  });

  describe('Scenario 5: Deterministic shuffle', () => {
    it('produces identical hands when the same seed and decks are used', async () => {
      const first = await createAndStartMatch({
        matchId: MATCH_IDS.scenario5a,
        player1DeckId: FIRE_DECK,
        player2DeckId: WATER_DECK,
        shuffleSeed: 23,
      });

      const second = await createAndStartMatch({
        matchId: MATCH_IDS.scenario5b,
        player1DeckId: FIRE_DECK,
        player2DeckId: WATER_DECK,
        shuffleSeed: 23,
      });

      expect(first.playerState.hand).toEqual(second.playerState.hand);
      verifyCardDistribution(first);
      verifyCardDistribution(second);
    });
  });
});
