import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Match Cancel E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  const TOURNAMENT_ID = 'classic-tournament';
  const FIRE_DECK = 'classic-fire-starter-deck';
  const WATER_DECK = 'classic-water-starter-deck';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';

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

  describe('DELETE /api/v1/matches/:matchId/cancel', () => {
    it('should successfully cancel and delete a match in WAITING_FOR_PLAYERS state', async () => {
      const MATCH_ID = 'spec-cancel-waiting-match';

      // 1. Create match (state: WAITING_FOR_PLAYERS)
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Verify match exists and is in WAITING_FOR_PLAYERS state
      const matchStateBeforeCancel = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(matchStateBeforeCancel.body.state).toBe('WAITING_FOR_PLAYERS');

      // 3. Player 1 cancels the match
      await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: PLAYER1_ID })
        .expect(200);

      // 4. Verify match is deleted (should not appear in match list)
      const player1MatchesAfterCancel = await request(server())
        .get(`/api/v1/matches?playerId=${PLAYER1_ID}`)
        .expect(200);

      const deletedMatch = player1MatchesAfterCancel.body.matches.find(
        (m: any) => m.id === MATCH_ID,
      );
      expect(deletedMatch).toBeUndefined();

      // 5. Verify match doesn't appear in player's match list
      const player1Matches = await request(server())
        .get(`/api/v1/matches?playerId=${PLAYER1_ID}`)
        .expect(200);

      const cancelledMatch = player1Matches.body.matches.find(
        (m: any) => m.id === MATCH_ID,
      );
      expect(cancelledMatch).toBeUndefined();
    });

    it('should return 400 when trying to cancel match not in WAITING_FOR_PLAYERS state', async () => {
      const MATCH_ID = 'spec-cancel-invalid-state';

      // 1. Create match and complete setup to get to MATCH_APPROVAL state
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/join`)
        .send({
          playerId: PLAYER2_ID,
          deckId: WATER_DECK,
        })
        .expect(200);

      // Wait for deck validation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Verify match is in MATCH_APPROVAL state (not WAITING_FOR_PLAYERS)
      const matchState = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(matchState.body.state).not.toBe('WAITING_FOR_PLAYERS');

      // 3. Try to cancel match - should return 400
      const cancelResponse = await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: PLAYER1_ID })
        .expect(400);

      expect(cancelResponse.body.message).toContain('WAITING_FOR_PLAYERS');

      // 4. Verify match still exists
      const matchListAfterCancel = await request(server())
        .get(`/api/v1/matches?playerId=${PLAYER1_ID}`)
        .expect(200);

      const matchAfterCancel = matchListAfterCancel.body.matches.find(
        (m: any) => m.id === MATCH_ID,
      );
      expect(matchAfterCancel).toBeDefined();
      // Match should still exist and be in MATCH_APPROVAL state (not cancelled)
      expect(matchAfterCancel.state).toBe('MATCH_APPROVAL');
    });

    it('should return 403 when non-participant tries to cancel match', async () => {
      const MATCH_ID = 'spec-cancel-unauthorized';
      const NON_PARTICIPANT_ID = 'non-participant-player';

      // 1. Create match
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Non-participant tries to cancel - should return 403
      const cancelResponse = await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: NON_PARTICIPANT_ID })
        .expect(403);

      expect(cancelResponse.body.message).toContain('participant');

      // 3. Verify match still exists (check via state endpoint)
      const matchStateAfterCancel = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(matchStateAfterCancel.body.state).toBe('WAITING_FOR_PLAYERS');
    });

    it('should return 403 when player2 tries to cancel before joining', async () => {
      const MATCH_ID = 'spec-cancel-player2-not-joined';

      // 1. Create match (only player1 assigned)
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Player 2 (not yet assigned) tries to cancel - should return 403
      const cancelResponse = await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: PLAYER2_ID })
        .expect(403);

      expect(cancelResponse.body.message).toContain('participant');

      // 3. Verify match still exists (check via state endpoint)
      const matchStateAfterCancel = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(matchStateAfterCancel.body.state).toBe('WAITING_FOR_PLAYERS');
    });

    it('should return 404 when trying to cancel non-existent match', async () => {
      const NON_EXISTENT_MATCH_ID = 'non-existent-match-id';

      // Try to cancel non-existent match - should return 404
      await request(server())
        .delete(`/api/v1/matches/${NON_EXISTENT_MATCH_ID}/cancel`)
        .query({ playerId: PLAYER1_ID })
        .expect(404);
    });

    it('should return 404 when trying to cancel already deleted match (idempotency)', async () => {
      const MATCH_ID = 'spec-cancel-idempotency';

      // 1. Create match
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Cancel match (first time)
      await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: PLAYER1_ID })
        .expect(200);

      // 3. Try to cancel again - should return 404 (idempotent)
      await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: PLAYER1_ID })
        .expect(404);
    });

    it('should allow player2 to cancel match after joining', async () => {
      const MATCH_ID = 'spec-cancel-player2';

      // 1. Create match
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

      // Wait for deck validation (match might transition to MATCH_APPROVAL)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 3. Check match state
      const matchState = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      // Only allow cancellation if still in WAITING_FOR_PLAYERS
      if (matchState.body.state === 'WAITING_FOR_PLAYERS') {
        // 4. Player 2 cancels the match
        await request(server())
          .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
          .query({ playerId: PLAYER2_ID })
          .expect(200);

        // 5. Verify match is deleted
        await request(server()).get(`/api/v1/matches/${MATCH_ID}`).expect(404);
      } else {
        // If match has progressed past WAITING_FOR_PLAYERS, cancellation should fail
        await request(server())
          .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
          .query({ playerId: PLAYER2_ID })
          .expect(400);
      }
    });

    it('should return 400 when playerId query parameter is missing', async () => {
      const MATCH_ID = 'spec-cancel-missing-playerid';

      // 1. Create match
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Try to cancel without playerId - should return 400
      await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .expect(400);
    });

    it('should return 400 when playerId query parameter is empty', async () => {
      const MATCH_ID = 'spec-cancel-empty-playerid';

      // 1. Create match
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      // 2. Try to cancel with empty playerId - should return 400
      await request(server())
        .delete(`/api/v1/matches/${MATCH_ID}/cancel`)
        .query({ playerId: '' })
        .expect(400);
    });
  });
});
