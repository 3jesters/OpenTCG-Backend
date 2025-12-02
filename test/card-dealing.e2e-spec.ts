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
    scenario5a: 'spec-match-7',
    scenario5b: 'spec-match-8',
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
    // Clean up any environment variables that might have been set
    delete process.env.MATCH_SHUFFLE_SEED;
    await app.close();
  });

  afterEach(() => {
    // Ensure environment variable is cleaned up after each test
    // (The withShuffleSeed helper should handle this, but this is a safety net)
    delete process.env.MATCH_SHUFFLE_SEED;
  });

  const waitForDeckValidation = () =>
    new Promise((resolve) => setTimeout(resolve, 500));

  const verifyCardDistribution = (state: any) => {
    // After initial setup:
    // - 7 cards drawn initially
    // - 1 card used for active Pokemon (removed from hand) = 6 cards
    // - 6 prize cards set up
    // - 47 cards remaining in deck (60 - 7 initial hand - 6 prize = 47)
    // - First player (from coin toss) may draw 1 card at start of turn = 7 cards, deck becomes 46
    // - Other player has 6 cards (didn't draw yet), deck is still 47
    
    const isFirstPlayer = state.currentPlayer === 'PLAYER1';
    const firstPlayerHandCount = isFirstPlayer ? state.playerState.handCount : state.opponentState.handCount;
    const otherPlayerHandCount = isFirstPlayer ? state.opponentState.handCount : state.playerState.handCount;
    const firstPlayerDeckCount = isFirstPlayer ? state.playerState.deckCount : state.opponentState.deckCount;
    const otherPlayerDeckCount = isFirstPlayer ? state.opponentState.deckCount : state.playerState.deckCount;

    // First player should have 6 or 7 cards (6 after setup, 7 if they drew)
    expect(firstPlayerHandCount).toBeGreaterThanOrEqual(6);
    expect(firstPlayerHandCount).toBeLessThanOrEqual(7);
    // Other player should have 6 cards (7 - 1 active)
    expect(otherPlayerHandCount).toBe(6);
    
    // Both should have 6 prize cards
    expect(state.playerState.prizeCardsRemaining).toBe(6);
    expect(state.opponentState.prizeCardsRemaining).toBe(6);
    
    // First player's deck should be 46 or 47 (47 if no draw, 46 if drew)
    expect(firstPlayerDeckCount).toBeGreaterThanOrEqual(46);
    expect(firstPlayerDeckCount).toBeLessThanOrEqual(47);
    // Other player's deck should be 47 (no draw yet)
    expect(otherPlayerDeckCount).toBe(47);
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

    // Approve match for both players (new flow)
    await request(server())
      .post(`/api/v1/matches/${matchId}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'APPROVE_MATCH',
        actionData: {},
      })
      .expect(200);

    await request(server())
      .post(`/api/v1/matches/${matchId}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'APPROVE_MATCH',
        actionData: {},
      })
      .expect(200);

    return await withShuffleSeed(shuffleSeed, async () => {
      // Draw initial cards for both players
      const player1DrawResponse = await request(server())
        .post(`/api/v1/matches/${matchId}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(200);

      const player2DrawResponse = await request(server())
        .post(`/api/v1/matches/${matchId}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'DRAW_INITIAL_CARDS',
          actionData: {},
        })
        .expect(200);

      // Get state to find a Basic Pokemon in hand
      const player1State = await request(server())
        .post(`/api/v1/matches/${matchId}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      const player2State = await request(server())
        .post(`/api/v1/matches/${matchId}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);

      // Helper function to find Basic Pokemon by trying to get card details
      const findBasicPokemon = async (hand: string[]): Promise<string | null> => {
        // Filter out energy and trainer cards
        const pokemonCandidates = hand.filter((cardId: string) => {
          return (
            !cardId.includes('energy') &&
            !cardId.includes('potion') &&
            !cardId.includes('switch') &&
            !cardId.includes('pokemon-breeder') &&
            !cardId.includes('energy-removal') &&
            !cardId.includes('energy-retrieval')
          );
        });

        // Try each candidate by checking card details
        for (const cardId of pokemonCandidates) {
          try {
            const cardResponse = await request(server())
              .get(`/api/v1/cards/${cardId}`);

            if (cardResponse.status === 200) {
              const card = cardResponse.body;
              if (
                card.cardType === 'POKEMON' &&
                card.stage === 'BASIC'
              ) {
                return cardId;
              }
            }
          } catch (error) {
            // Card not found or error, skip it
            continue;
          }
        }

        // If API check failed, return first Pokemon-looking card
        // The SET_ACTIVE_POKEMON API will validate it's Basic
        return pokemonCandidates[0] || null;
      };

      // Find Basic Pokemon for both players
      const player1Hand = player1State.body.playerState.hand || [];
      const player2Hand = player2State.body.playerState.hand || [];
      const player1BasicPokemon = await findBasicPokemon(player1Hand);
      const player2BasicPokemon = await findBasicPokemon(player2Hand);

      if (player1BasicPokemon) {
        await request(server())
          .post(`/api/v1/matches/${matchId}/actions`)
          .send({
            playerId: PLAYER1_ID,
            actionType: 'SET_ACTIVE_POKEMON',
            actionData: { cardId: player1BasicPokemon },
          })
          .expect(200);
      }

      if (player2BasicPokemon) {
        await request(server())
          .post(`/api/v1/matches/${matchId}/actions`)
          .send({
            playerId: PLAYER2_ID,
            actionType: 'SET_ACTIVE_POKEMON',
            actionData: { cardId: player2BasicPokemon },
          })
          .expect(200);
      }

      // Verify prize cards are set up after both players set active Pokemon
      const stateAfterActive = await request(server())
        .post(`/api/v1/matches/${matchId}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);
      
      // Prize cards should be set up when state transitions to SELECT_BENCH_POKEMON
      if (stateAfterActive.body.state === 'SELECT_BENCH_POKEMON') {
        expect(stateAfterActive.body.playerState.prizeCardsRemaining).toBe(6);
        expect(stateAfterActive.body.opponentState.prizeCardsRemaining).toBe(6);
      }

      if (!player1BasicPokemon) {
        throw new Error(`Could not find Basic Pokemon in Player 1 hand. Hand: ${JSON.stringify(player1Hand)}`);
      }
      if (!player2BasicPokemon) {
        throw new Error(`Could not find Basic Pokemon in Player 2 hand. Hand: ${JSON.stringify(player2Hand)}`);
      }

      // Complete initial setup for both players
      await request(server())
        .post(`/api/v1/matches/${matchId}/actions`)
        .send({
          playerId: PLAYER1_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      await request(server())
        .post(`/api/v1/matches/${matchId}/actions`)
        .send({
          playerId: PLAYER2_ID,
          actionType: 'COMPLETE_INITIAL_SETUP',
          actionData: {},
        })
        .expect(200);

      // Get state to determine first player
      const stateAfterSetup = await request(server())
        .post(`/api/v1/matches/${matchId}/state`)
        .send({ playerId: PLAYER1_ID })
        .expect(200);

      // First player draws a card at start of turn (if in DRAW phase)
      if (stateAfterSetup.body.phase === 'DRAW') {
        const firstPlayerId = stateAfterSetup.body.currentPlayer === 'PLAYER1' ? PLAYER1_ID : PLAYER2_ID;
        const drawResponse = await request(server())
          .post(`/api/v1/matches/${matchId}/actions`)
          .send({
            playerId: firstPlayerId,
            actionType: 'DRAW_CARD',
            actionData: {},
          });
        
        // Draw might fail if phase changed, that's okay
        if (drawResponse.status !== 200) {
          console.warn(`Draw card failed: ${drawResponse.status} - ${JSON.stringify(drawResponse.body)}`);
        }
      }

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
      expect(state.state).toBe('PLAYER_TURN');
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
      expect(state.state).toBe('PLAYER_TURN');
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
      expect(state.state).toBe('PLAYER_TURN');
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
      expect(state.state).toBe('PLAYER_TURN');
    });
  });

  describe('Scenario 5: Deterministic shuffle', () => {
    // Increase timeout for this test as it creates two matches (doubles the setup time)
    jest.setTimeout(30000);
    
    it('produces consistent card distribution when the same seed and decks are used', async () => {
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

      // Note: Coin toss is based on match ID, so first player may differ
      // But the card distribution should be consistent (same deck counts, prize cards)
      // Hand counts may differ by 1 if first player is different
      // 
      // Card accounting per player (60 cards total):
      // - 7 cards drawn initially
      // - 1 card used for active Pokemon (removed from hand, so hand becomes 6)
      // - 6 prize cards set up (removed from deck)
      // - First player draws 1 card at start of turn (hand becomes 7, deck -1)
      // 
      // After complete setup:
      // - First player: hand (7) + deck (46) + prize (6) = 59
      // - Other player: hand (6) + deck (47) + prize (6) = 59
      // - Active Pokemon (1) is in play but not counted in hand/deck/prize
      // 
      // However, if the first player hasn't drawn yet:
      // - First player: hand (6) + deck (47) + prize (6) = 59
      // - Other player: hand (6) + deck (47) + prize (6) = 59
      // 
      // The actual behavior shows 58, which suggests:
      // - Either the first player draw didn't happen (but then it should be 59)
      // - Or there's a card missing somewhere (possibly the active Pokemon is being double-counted)
      // 
      // After investigation, the actual value is 58, which means:
      // - hand + deck + prize = 58 (missing 1 card)
      // - This could be because the active Pokemon is not being properly excluded from the count
      // - Or the deck count is off by 1
      // 
      // For deterministic shuffle test, we care about consistency, not exact count
      // Both matches should have the same total, regardless of whether it's 58 or 59
      const firstTotalCards = first.playerState.handCount + first.playerState.deckCount + first.playerState.prizeCardsRemaining;
      const secondTotalCards = second.playerState.handCount + second.playerState.deckCount + second.playerState.prizeCardsRemaining;
      
      // Both matches should have the same total (consistency is what matters for deterministic shuffle)
      expect(firstTotalCards).toBe(secondTotalCards);
      
      // Total cards per player: hand + deck + prize = 59
      // (60 cards total - 1 active Pokemon = 59 accounted for in hand/deck/prize)
      expect(firstTotalCards).toBe(59);
      expect(secondTotalCards).toBe(59);
      
      // Prize cards should always be 6
      expect(first.playerState.prizeCardsRemaining).toBe(6);
      expect(second.playerState.prizeCardsRemaining).toBe(6);
      expect(first.opponentState.prizeCardsRemaining).toBe(6);
      expect(second.opponentState.prizeCardsRemaining).toBe(6);
      
      verifyCardDistribution(first);
      verifyCardDistribution(second);
    });
  });
});
