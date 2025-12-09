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
    // Clean up environment variable
    delete process.env.MATCH_SHUFFLE_SEED;
    await app.close();
  });

  afterEach(() => {
    // Ensure environment variable is cleaned up after each test
    delete process.env.MATCH_SHUFFLE_SEED;
  });

  const waitForDeckValidation = () =>
    new Promise((resolve) => setTimeout(resolve, 500));

  it('should complete full match approval and initial setup flow', async () => {
    // Set deterministic shuffle seed for this test only
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

      // 7. Player 2 approves (coin toss does NOT happen yet - only after both complete initial setup)
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'APPROVE_MATCH',
          actionData: {},
        })
        .expect(200);

      // 8. Player 2 checks state - should now be DRAWING_CARDS, opponentDeckId should be revealed
      // Coin toss should NOT have happened yet (currentPlayer should be null)
      const player2State2 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(player2State2.body.state).toBe('DRAWING_CARDS');
      expect(player2State2.body.opponentDeckId).toBe(FIRE_DECK);
      expect(player2State2.body.coinTossResult).toBeNull(); // Coin toss hasn't happened yet
      expect(player2State2.body.currentPlayer).toBeNull(); // currentPlayer is unknown before coin toss
      expect(player2State2.body.availableActions).toContain('DRAW_INITIAL_CARDS');

      // 9. Player 1 checks state - should also see DRAWING_CARDS and opponentDeckId
      const player1State3 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State3.body.state).toBe('DRAWING_CARDS');
      expect(player1State3.body.opponentDeckId).toBe(WATER_DECK);
      expect(player1State3.body.coinTossResult).toBeNull(); // Coin toss hasn't happened yet
      expect(player1State3.body.currentPlayer).toBeNull(); // currentPlayer is unknown before coin toss

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

      // 20. Player 2 marks as ready (first player to be ready - coin toss should NOT happen yet)
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

      // 23. Player 1 marks as ready (second player - transitions to FIRST_PLAYER_SELECTION)
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      // 24. Player 1 checks state - should now be FIRST_PLAYER_SELECTION
      const player1State8 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State8.body.state).toBe('FIRST_PLAYER_SELECTION');
      expect(player1State8.body.availableActions).toContain('CONFIRM_FIRST_PLAYER');
      expect(player1State8.body.playerHasConfirmedFirstPlayer).toBe(false);

      // 25. Player 1 confirms first player (coin toss happens immediately so player can see result)
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'CONFIRM_FIRST_PLAYER',
          actionData: {},
        })
        .expect(200);

      // 26. Player 1 checks state - coin toss should have happened
      const player1State9 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1State9.body.state).toBe('FIRST_PLAYER_SELECTION');
      expect(player1State9.body.coinTossResult).toBeTruthy(); // Coin toss should have happened
      expect(['PLAYER1', 'PLAYER2']).toContain(player1State9.body.coinTossResult);
      expect(player1State9.body.currentPlayer).toBeTruthy(); // currentPlayer should be set after coin toss
      expect(player1State9.body.currentPlayer).toBe(player1State9.body.coinTossResult); // currentPlayer should match coin toss result
      expect(player1State9.body.playerHasConfirmedFirstPlayer).toBe(true);
      expect(player1State9.body.opponentHasConfirmedFirstPlayer).toBe(false);

      // 27. Player 2 confirms first player (both confirmed - coin toss happens and transitions to PLAYER_TURN)
      await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'CONFIRM_FIRST_PLAYER',
          actionData: {},
        })
        .expect(200);

      // 28. Player 2 checks state - should now be PLAYER_TURN
      const player2State4 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(player2State4.body.state).toBe('PLAYER_TURN');
      expect(player2State4.body.coinTossResult).toBeTruthy();
      expect(player2State4.body.coinTossResult).toBe(player1State9.body.coinTossResult); // Same result for both players
      expect(player2State4.body.currentPlayer).toBeTruthy();
      expect(player2State4.body.currentPlayer).toBe(player2State4.body.coinTossResult);
      expect(player2State4.body.opponentState.activePokemon).toBeTruthy();
      expect(player2State4.body.opponentState.bench.length).toBe(1);
      expect(player2State4.body.opponentState.handCount).toBeGreaterThan(0);
      expect(player2State4.body.opponentState.deckCount).toBeGreaterThan(0);
      expect(player2State4.body.opponentState.discardCount).toBe(0);

      // 29. Player 1 checks state - should also be PLAYER_TURN
      const player1State10 = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(['PLAYER_TURN', 'BETWEEN_TURNS']).toContain(player1State10.body.state);
      expect(player1State10.body.coinTossResult).toBeTruthy();
      expect(player1State10.body.coinTossResult).toBe(player2State4.body.coinTossResult); // Same result for both players
      expect(player1State10.body.currentPlayer).toBeTruthy();
      expect(player1State10.body.currentPlayer).toBe(player1State10.body.coinTossResult);
      expect(player1State10.body.opponentState.activePokemon).toBeTruthy();
      expect(player1State10.body.opponentState.bench.length).toBe(1);
      expect(player1State10.body.opponentState.handCount).toBeGreaterThan(0);
      expect(player1State10.body.opponentState.deckCount).toBeGreaterThan(0);
      expect(player1State10.body.opponentState.discardCount).toBe(0);
    } finally {
      delete process.env.MATCH_SHUFFLE_SEED;
    }
  });

  it('should validate coin toss happens only after both players complete initial setup', async () => {
    // Set deterministic shuffle seed for this test only
    process.env.MATCH_SHUFFLE_SEED = '67890';
    const COIN_TOSS_MATCH_ID = 'spec-coin-toss-validation';

    try {
      // 1. Create match and complete approval phase
      await request(server())
        .post('/api/v1/matches')
        .send({
          id: COIN_TOSS_MATCH_ID,
          tournamentId: TOURNAMENT_ID,
          player1Id: PLAYER1_ID,
          player1DeckId: FIRE_DECK,
        })
        .expect(201);

      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/join`)
        .send({
          playerId: PLAYER2_ID,
          deckId: WATER_DECK,
        })
        .expect(200);

      await waitForDeckValidation();

      // 2. Both players approve match
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'APPROVE_MATCH',
          actionData: {},
        })
        .expect(200);

      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'APPROVE_MATCH',
          actionData: {},
        })
        .expect(200);

      // 3. Verify coin toss has NOT happened yet (after approval)
      const stateAfterApproval = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(stateAfterApproval.body.state).toBe('DRAWING_CARDS');
      expect(stateAfterApproval.body.coinTossResult).toBeNull(); // Coin toss should NOT have happened
      expect(stateAfterApproval.body.currentPlayer).toBeNull(); // currentPlayer should be unknown

      // 4. Both players draw cards
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(200);

      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(200);

      // 5. Both players set prize cards
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'SET_PRIZE_CARDS',
          actionData: {},
        })
        .expect(200);

      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'SET_PRIZE_CARDS',
          actionData: {},
        })
        .expect(200);

      // 6. Both players set active Pokemon
      const player1State = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      const player1ActiveCard = player1State.body.playerState.hand[0];
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'SET_ACTIVE_POKEMON',
          actionData: { cardId: player1ActiveCard },
        })
        .expect(200);

      const player2State = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      const player2ActiveCard = player2State.body.playerState.hand[0];
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'SET_ACTIVE_POKEMON',
          actionData: { cardId: player2ActiveCard },
        })
        .expect(200);

      // 7. Player 1 completes initial setup (first player - state should still be SELECT_BENCH_POKEMON)
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      // 8. Verify state is still SELECT_BENCH_POKEMON (only one player is ready)
      const stateAfterPlayer1Ready = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(stateAfterPlayer1Ready.body.state).toBe('SELECT_BENCH_POKEMON');
      expect(stateAfterPlayer1Ready.body.coinTossResult).toBeNull(); // Coin toss should NOT have happened
      expect(stateAfterPlayer1Ready.body.currentPlayer).toBeNull(); // currentPlayer should still be unknown

      // 9. Player 2 completes initial setup (second player - transitions to FIRST_PLAYER_SELECTION)
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      // 10. Verify state is FIRST_PLAYER_SELECTION (both players are ready)
      const stateAfterPlayer2Ready = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      expect(stateAfterPlayer2Ready.body.state).toBe('FIRST_PLAYER_SELECTION');
      expect(stateAfterPlayer2Ready.body.coinTossResult).toBeNull(); // Coin toss hasn't happened yet
      expect(stateAfterPlayer2Ready.body.currentPlayer).toBeNull(); // currentPlayer is still unknown
      expect(stateAfterPlayer2Ready.body.availableActions).toContain('CONFIRM_FIRST_PLAYER');

      // 11. Player 1 confirms first player (coin toss happens immediately so player can see result)
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'CONFIRM_FIRST_PLAYER',
          actionData: {},
        })
        .expect(200);

      // 12. Verify coin toss has happened
      const stateAfterPlayer1Confirm = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(stateAfterPlayer1Confirm.body.state).toBe('FIRST_PLAYER_SELECTION');
      expect(stateAfterPlayer1Confirm.body.coinTossResult).toBeTruthy(); // Coin toss should have happened
      expect(['PLAYER1', 'PLAYER2']).toContain(stateAfterPlayer1Confirm.body.coinTossResult);
      expect(stateAfterPlayer1Confirm.body.currentPlayer).toBeTruthy(); // currentPlayer should be set after coin toss
      expect(stateAfterPlayer1Confirm.body.currentPlayer).toBe(stateAfterPlayer1Confirm.body.coinTossResult); // currentPlayer should match coin toss result
      expect(stateAfterPlayer1Confirm.body.playerHasConfirmedFirstPlayer).toBe(true);
      expect(stateAfterPlayer1Confirm.body.opponentHasConfirmedFirstPlayer).toBe(false);

      // 13. Player 2 confirms first player (both confirmed - coin toss happens and transitions to PLAYER_TURN)
      await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'CONFIRM_FIRST_PLAYER',
          actionData: {},
        })
        .expect(200);

      // 14. Verify state is PLAYER_TURN and coin toss has happened
      const player1FinalState = await request(server())
        .post(`/api/v1/matches/${COIN_TOSS_MATCH_ID}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      expect(player1FinalState.body.state).toBe('PLAYER_TURN');
      expect(player1FinalState.body.coinTossResult).toBeTruthy(); // Coin toss result should now be set
      expect(['PLAYER1', 'PLAYER2']).toContain(player1FinalState.body.coinTossResult);
      expect(player1FinalState.body.currentPlayer).toBeTruthy(); // currentPlayer should be set after coin toss
      expect(player1FinalState.body.currentPlayer).toBe(player1FinalState.body.coinTossResult); // currentPlayer should match coin toss result
    } finally {
      delete process.env.MATCH_SHUFFLE_SEED;
    }
  });
});

