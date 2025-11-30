import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Match Approval Flow E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  const TOURNAMENT_ID = 'classic-tournament';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';
  const FIRE_DECK = 'classic-fire-starter-deck';
  const WATER_DECK = 'classic-water-starter-deck';
  const MATCH_ID = 'spec-match-approval-flow';

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

  it('should complete full match approval and initial setup flow', async () => {
    // Set deterministic shuffle seed
    process.env.MATCH_SHUFFLE_SEED = '12345';

    try {
      // 1. Create match with player 1
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Player 2 joins
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/join`)
        .send({
          playerId: PLAYER2_ID,
          deckId: WATER_DECK,
        })
        .expect(200);

      // Wait for deck validation
      await waitForDeckValidation();

      // 3. Player 1 checks state - should be in MATCH_APPROVAL, opponentDeckId should be null
      const player1State1 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State1.body.state).toBe('MATCH_APPROVAL');
      expect(player1State1.body.opponentDeckId).toBeNull();
      expect(player1State1.body.availableActions).toContain('APPROVE_MATCH');

      // 4. Player 1 approves
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'APPROVE_MATCH',
          actionData: {},
        })
        .expect(200);

      // 5. Player 1 checks state again - still MATCH_APPROVAL, opponentDeckId still null
      const player1State2 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State2.body.state).toBe('MATCH_APPROVAL');
      expect(player1State2.body.opponentDeckId).toBeNull();

      // 6. Player 2 checks state - should also be MATCH_APPROVAL, opponentDeckId null
      const player2State1 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(player2State1.body.state).toBe('MATCH_APPROVAL');
      expect(player2State1.body.opponentDeckId).toBeNull();
      expect(player2State1.body.availableActions).toContain('APPROVE_MATCH');

      // 7. Player 2 approves (this triggers coin toss automatically)
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'APPROVE_MATCH',
          actionData: {},
        })
        .expect(200);

      // 8. Player 2 checks state - should now be DRAWING_CARDS, opponentDeckId should be revealed
      const player2State2 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(player2State2.body.state).toBe('DRAWING_CARDS');
      expect(player2State2.body.opponentDeckId).toBe(FIRE_DECK);
      expect(player2State2.body.coinTossResult).toBeTruthy();
      expect(player2State2.body.availableActions).toContain('DRAW_INITIAL_CARDS');

      // 9. Player 1 checks state - should also see DRAWING_CARDS and opponentDeckId
      const player1State3 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State3.body.state).toBe('DRAWING_CARDS');
      expect(player1State3.body.opponentDeckId).toBe(WATER_DECK);
      expect(player1State3.body.coinTossResult).toBeTruthy();

      // 10. Player 1 clicks draw cards button
      const player1DrawResponse = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(200);

      expect(player1DrawResponse.body.state).toBe('DRAWING_CARDS');
      expect(player1DrawResponse.body.playerState.hand.length).toBe(7);
      expect(player1DrawResponse.body.playerHasDrawnValidHand).toBe(true);

      // 11. Player 1 tries to draw again - should fail
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(400);

      // 12. Player 1 checks state - no change (opponent hasn't drawn yet)
      const player1State4 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State4.body.state).toBe('DRAWING_CARDS');
      expect(player1State4.body.playerState.hand.length).toBe(7);
      expect(player1State4.body.opponentState.drawnCards).toBeUndefined();

      // 13. Player 2 clicks draw cards button
      const player2DrawResponse = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(200);

      expect(player2DrawResponse.body.state).toBe('SELECT_ACTIVE_POKEMON');
      expect(player2DrawResponse.body.playerState.hand.length).toBe(7);

      // 14. Player 1 checks state - should now see opponent's drawn cards and state changed to SELECT_ACTIVE_POKEMON
      const player1State5 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State5.body.state).toBe('SELECT_ACTIVE_POKEMON');
      expect(player1State5.body.opponentState.drawnCards).toBeUndefined(); // Opponent has valid deck, so no drawnCards shown
      expect(player1State5.body.opponentState.handCount).toBe(7);
      expect(player1State5.body.availableActions).toContain('SET_ACTIVE_POKEMON');

      // 15. Player 2 sets active Pokemon
      const player2ActiveCard = player2DrawResponse.body.playerState.hand[0];
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'SET_ACTIVE_POKEMON',
          actionData: { cardId: player2ActiveCard },
        })
        .expect(200);

      // 16. Player 1 checks state - should still be SELECT_ACTIVE_POKEMON (player 1 hasn't set yet)
      const player1State6 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State6.body.state).toBe('SELECT_ACTIVE_POKEMON');
      expect(player1State6.body.opponentState.activePokemon).toBeNull(); // Hidden until player 1 also selects

      // 17. Player 1 sets active Pokemon
      const player1ActiveCard = player1State6.body.playerState.hand[0];
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'SET_ACTIVE_POKEMON',
          actionData: { cardId: player1ActiveCard },
        })
        .expect(200);

      // 18. Player 1 checks state - should now be SELECT_BENCH_POKEMON, and see opponent's active Pokemon
      const player1State7 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State7.body.state).toBe('SELECT_BENCH_POKEMON');
      expect(player1State7.body.opponentState.activePokemon).toBeTruthy();
      expect(player1State7.body.availableActions).toContain('PLAY_POKEMON');
      expect(player1State7.body.availableActions).toContain('COMPLETE_INITIAL_SETUP');

      // 19. Player 2 sets bench Pokemon
      const player2BenchCard = player2DrawResponse.body.playerState.hand[1];
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'PLAY_POKEMON',
          actionData: { cardId: player2BenchCard },
        })
        .expect(200);

      // 20. Player 2 marks as ready
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      // 21. Player 2 checks state - should still be SELECT_BENCH_POKEMON (waiting for player 1)
      const player2State3 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(player2State3.body.state).toBe('SELECT_BENCH_POKEMON');

      // 22. Player 1 sets bench Pokemon
      const player1BenchCard = player1State7.body.playerState.hand[1];
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'PLAY_POKEMON',
          actionData: { cardId: player1BenchCard },
        })
        .expect(200);

      // 23. Player 1 marks as ready
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      // 24. Player 1 checks state - should now be PLAYER_TURN, and see full opponent information
      const player1State8 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State8.body.state).toBe('PLAYER_TURN');
      expect(player1State8.body.opponentState.activePokemon).toBeTruthy();
      expect(player1State8.body.opponentState.bench.length).toBe(1);
      expect(player1State8.body.opponentState.handCount).toBeGreaterThan(0);
      expect(player1State8.body.opponentState.deckCount).toBeGreaterThan(0);
      expect(player1State8.body.opponentState.discardCount).toBe(0);

      // 25. Player 2 checks state - should also be PLAYER_TURN (or BETWEEN_TURNS), and see full player 1 information
      const player2State4 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(['PLAYER_TURN', 'BETWEEN_TURNS']).toContain(player2State4.body.state);
      expect(player2State4.body.opponentState.activePokemon).toBeTruthy();
      expect(player2State4.body.opponentState.bench.length).toBe(1);
      expect(player2State4.body.opponentState.handCount).toBeGreaterThan(0);
      expect(player2State4.body.opponentState.deckCount).toBeGreaterThan(0);
      expect(player2State4.body.opponentState.discardCount).toBe(0);
    } finally {
      delete process.env.MATCH_SHUFFLE_SEED;
    }
  });
});

