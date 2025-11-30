import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Match Deck Validation Failure E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  const TOURNAMENT_ID = 'classic-tournament';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';
  const FIRE_DECK = 'classic-fire-starter-deck';
  const INVALID_DECK = 'invalid-deck-id-that-does-not-exist';
  const MATCH_ID = 'spec-match-deck-validation-failure';

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

  it('should cancel match when deck validation fails', async () => {
    // 1. Create match with player 1 (valid deck)
    await request(server())
      .post('/api/v1/matches')
      .send({
        id: MATCH_ID,
        tournamentId: TOURNAMENT_ID,
        player1Id: PLAYER1_ID,
        player1DeckId: FIRE_DECK,
      })
      .expect(201);

    // 2. Player 2 joins with invalid deck (deck doesn't exist)
    await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/join`)
      .send({
        playerId: PLAYER2_ID,
        deckId: INVALID_DECK,
      })
      .expect(200);

    // Wait for deck validation to complete
    await waitForDeckValidation();

    // 3. Player 1 checks state - should be CANCELLED
    const player1State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(player1State.body.state).toBe('CANCELLED');
    expect(player1State.body.availableActions).toEqual([]); // No actions available in cancelled state

    // 4. Player 1 checks match list - should see cancellation reason
    const player1Matches = await request(server())
      .get(`/api/v1/matches?playerId=${PLAYER1_ID}`)
      .expect(200);

    const cancelledMatch = player1Matches.body.matches.find(
      (m: any) => m.id === MATCH_ID,
    );
    expect(cancelledMatch).toBeDefined();
    expect(cancelledMatch.state).toBe('CANCELLED');
    expect(cancelledMatch.cancellationReason).toBe('Deck validation failed');
    expect(cancelledMatch.result).toBe('CANCELLED');

    // 5. Player 2 checks state - should also be CANCELLED
    const player2State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2State.body.state).toBe('CANCELLED');
    expect(player2State.body.availableActions).toEqual([]);

    // 6. Player 2 checks match list - should see cancellation reason
    const player2Matches = await request(server())
      .get(`/api/v1/matches?playerId=${PLAYER2_ID}`)
      .expect(200);

    const cancelledMatch2 = player2Matches.body.matches.find(
      (m: any) => m.id === MATCH_ID,
    );
    expect(cancelledMatch2).toBeDefined();
    expect(cancelledMatch2.state).toBe('CANCELLED');
    expect(cancelledMatch2.cancellationReason).toBe('Deck validation failed');
    expect(cancelledMatch2.result).toBe('CANCELLED');

    // 7. Verify match cannot be used for actions
    await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'APPROVE_MATCH',
        actionData: {},
      })
      .expect(400); // Should fail - match is cancelled
  });

  it('should cancel match when player 1 has invalid deck', async () => {
    const MATCH_ID_2 = 'spec-match-deck-validation-failure-2';

    // 1. Create match with player 1 (invalid deck)
    await request(server())
      .post('/api/v1/matches')
      .send({
        id: MATCH_ID_2,
        tournamentId: TOURNAMENT_ID,
        player1Id: PLAYER1_ID,
        player1DeckId: INVALID_DECK,
      })
      .expect(201);

    // 2. Player 2 joins with valid deck
    await request(server())
      .post(`/api/v1/matches/${MATCH_ID_2}/join`)
      .send({
        playerId: PLAYER2_ID,
        deckId: FIRE_DECK,
      })
      .expect(200);

    // Wait for deck validation
    await waitForDeckValidation();

    // 3. Both players should see CANCELLED state
    const player1State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID_2}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(player1State.body.state).toBe('CANCELLED');

    const player2State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID_2}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2State.body.state).toBe('CANCELLED');
  });

  it('should cancel match when both players have invalid decks', async () => {
    const MATCH_ID_3 = 'spec-match-deck-validation-failure-3';

    // 1. Create match with player 1 (invalid deck)
    await request(server())
      .post('/api/v1/matches')
      .send({
        id: MATCH_ID_3,
        tournamentId: TOURNAMENT_ID,
        player1Id: PLAYER1_ID,
        player1DeckId: INVALID_DECK,
      })
      .expect(201);

    // 2. Player 2 joins with invalid deck
    await request(server())
      .post(`/api/v1/matches/${MATCH_ID_3}/join`)
      .send({
        playerId: PLAYER2_ID,
        deckId: INVALID_DECK,
      })
      .expect(200);

    // Wait for deck validation
    await waitForDeckValidation();

    // 3. Both players should see CANCELLED state
    const player1State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID_3}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(player1State.body.state).toBe('CANCELLED');

    const player2State = await request(server())
      .post(`/api/v1/matches/${MATCH_ID_3}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2State.body.state).toBe('CANCELLED');
  });
});

