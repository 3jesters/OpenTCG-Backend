import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Match Gameplay Flow E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-match-gameplay-flow';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';
  const matchFilePath = join(matchesDirectory, `${MATCH_ID}.json`);

  const initialMatchState = {
    id: 'spec-match-gameplay-flow',
    tournamentId: 'classic-tournament',
    player1Id: 'test-player-1',
    player2Id: 'test-player-2',
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
    createdAt: '2025-11-30T12:08:05.623Z',
    updatedAt: '2025-11-30T12:50:48.553Z',
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
          'pokemon-base-set-v1.0-energy-removal--93',
          'pokemon-base-set-v1.0-growlithe--28',
          'pokemon-base-set-v1.0-ponyta--62',
          'pokemon-base-set-v1.0-gust-of-wind--94',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-energy-removal--93',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-switch--96',
          'pokemon-base-set-v1.0-potion--90',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-potion--90',
          'pokemon-base-set-v1.0-energy-retrieval--83',
          'pokemon-base-set-v1.0-vulpix--70',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-potion--90',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-gust-of-wind--94',
          'pokemon-base-set-v1.0-switch--96',
          'pokemon-base-set-v1.0-magmar--36',
          'pokemon-base-set-v1.0-growlithe--28',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-energy-retrieval--83',
          'pokemon-base-set-v1.0-charmander--48',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-charmander--48',
          'pokemon-base-set-v1.0-charmeleon--24',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-charizard--4',
          'pokemon-base-set-v1.0-vulpix--70',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-magmar--36',
          'pokemon-base-set-v1.0-charmander--48',
          'pokemon-base-set-v1.0-charmander--48',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-charmeleon--24',
          'pokemon-base-set-v1.0-ponyta--62',
        ],
        hand: [
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-pokemon-breeder--78',
        ],
        activePokemon: {
          instanceId: '78dadb92-eb0b-4dbd-b51e-db9be356b27f',
          cardId: 'pokemon-base-set-v1.0-ponyta--62',
          position: 'ACTIVE',
          currentHp: 40,
          maxHp: 40,
          attachedEnergy: [], // Start with no energy, test will attach energy
          statusEffect: 'NONE',
          damageCounters: 0,
        },
        bench: [],
        prizeCards: [
          'pokemon-base-set-v1.0-pokemon-breeder--78',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-fire-energy--99',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-bill--92',
        ],
        discardPile: [],
      },
      player2State: {
        deck: [
          'pokemon-base-set-v1.0-potion--90',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-potion--90',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-energy-retrieval--83',
          'pokemon-base-set-v1.0-venusaur--15',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-switch--96',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-ivysaur--30',
          'pokemon-base-set-v1.0-weedle--71',
          'pokemon-base-set-v1.0-energy-removal--93',
          'pokemon-base-set-v1.0-pokemon-breeder--78',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-switch--96',
          'pokemon-base-set-v1.0-nidoran--57',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-energy-retrieval--83',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-tangela--68',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-bulbasaur--46',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-bill--92',
          'pokemon-base-set-v1.0-energy-removal--93',
          'pokemon-base-set-v1.0-bulbasaur--46',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-caterpie--47',
          'pokemon-base-set-v1.0-bulbasaur--46',
          'pokemon-base-set-v1.0-gust-of-wind--94',
          'pokemon-base-set-v1.0-potion--90',
          'pokemon-base-set-v1.0-pokemon-breeder--78',
        ],
        hand: [
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-ivysaur--30',
        ],
        activePokemon: {
          instanceId: '1002f14e-8881-414a-8fca-85a1bb095b0e',
          cardId: 'pokemon-base-set-v1.0-tangela--68',
          position: 'ACTIVE',
          currentHp: 50,
          maxHp: 50,
          attachedEnergy: [],
          statusEffect: 'NONE',
          damageCounters: 0,
        },
        bench: [
          {
            instanceId: 'faf5c1d8-4e2a-4c51-b8ad-a22f4a3d63ef',
            cardId: 'pokemon-base-set-v1.0-bulbasaur--46',
            position: 'BENCH_0',
            currentHp: 30, // 10 damage (40 max - 10 = 30 current)
            maxHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          {
            instanceId: 'dcfe7a0d-bf2b-4810-b26a-1f0c5a520dce',
            cardId: 'pokemon-base-set-v1.0-weedle--71',
            position: 'BENCH_1',
            currentHp: 40,
            maxHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          {
            instanceId: '57e6e56b-2f74-4f14-aafc-7cac32b22b04',
            cardId: 'pokemon-base-set-v1.0-caterpie--47',
            position: 'BENCH_2',
            currentHp: 40,
            maxHp: 40,
            attachedEnergy: [],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
        ],
        prizeCards: [
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-caterpie--47',
          'pokemon-base-set-v1.0-weedle--71',
          'pokemon-base-set-v1.0-gust-of-wind--94',
          'pokemon-base-set-v1.0-grass-energy--100',
          'pokemon-base-set-v1.0-nidoran--57',
        ],
        discardPile: [],
      },
      turnNumber: 1,
      phase: 'DRAW',
      currentPlayer: 'PLAYER1',
      lastAction: null,
      actionHistory: [],
    },
  };

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
    // Keep the test match file for inspection - do not delete
    await app.close();
  });

  beforeEach(async () => {
    // Files are cleaned up by jest-global-setup before test run

    // Set deterministic shuffle seed to prevent random shuffling
    process.env.MATCH_SHUFFLE_SEED = '99999';

    // Write the initial match state to file
    await writeFile(
      matchFilePath,
      JSON.stringify(initialMatchState, null, 2),
      'utf-8',
    );
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.MATCH_SHUFFLE_SEED;
  });

  it('should complete gameplay flow: draw, attach energy, evolve, end turn', async () => {
    // Step 0: Verify DRAW_CARD is available in DRAW phase for current player (PLAYER1)
    const player1StateBeforeDraw = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER1_ID })
      .expect(200);

    expect(player1StateBeforeDraw.body.state).toBe('PLAYER_TURN');
    expect(player1StateBeforeDraw.body.currentPlayer).toBe('PLAYER1');
    expect(player1StateBeforeDraw.body.phase).toBe('DRAW');
    // Current player should see DRAW_CARD, END_TURN, and CONCEDE
    expect(player1StateBeforeDraw.body.availableActions).toContain('DRAW_CARD');
    expect(player1StateBeforeDraw.body.availableActions).toContain('END_TURN');
    expect(player1StateBeforeDraw.body.availableActions).toContain('CONCEDE');
    expect(player1StateBeforeDraw.body.availableActions.length).toBe(3);

    // Step 0.5: Verify non-current player (PLAYER2) only sees CONCEDE
    const player2StateBeforeDraw = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2StateBeforeDraw.body.state).toBe('PLAYER_TURN');
    expect(player2StateBeforeDraw.body.currentPlayer).toBe('PLAYER1'); // Still PLAYER1's turn
    expect(player2StateBeforeDraw.body.phase).toBe('DRAW');
    // Non-current player should only see CONCEDE
    expect(player2StateBeforeDraw.body.availableActions).toEqual(['CONCEDE']);

    // Step 1: Player 1 draws a card
    const player1DrawResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'DRAW_CARD',
        actionData: {},
      })
      .expect(200);

    expect(player1DrawResponse.body.state).toBe('PLAYER_TURN');
    expect(player1DrawResponse.body.currentPlayer).toBe('PLAYER1');
    expect(player1DrawResponse.body.phase).toBe('MAIN_PHASE');
    expect(player1DrawResponse.body.playerState.hand.length).toBe(7); // 6 + 1 drawn
    expect(player1DrawResponse.body.playerState.deckCount).toBe(46); // 47 - 1 drawn

    // Step 2: Player 2 sees that player 1 drew a card
    const player2StateAfterDraw = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/state`)
      .send({ playerId: PLAYER2_ID })
      .expect(200);

    expect(player2StateAfterDraw.body.state).toBe('PLAYER_TURN');
    expect(player2StateAfterDraw.body.currentPlayer).toBe('PLAYER1');
    expect(player2StateAfterDraw.body.opponentState.handCount).toBe(7);
    expect(player2StateAfterDraw.body.opponentState.deckCount).toBe(46);
    expect(player2StateAfterDraw.body.lastAction).toBeTruthy();
    expect(player2StateAfterDraw.body.lastAction.actionType).toBe('DRAW_CARD');
    expect(player2StateAfterDraw.body.lastAction.playerId).toBe('PLAYER1');

    // Step 3: Player 1 adds an energy card to his active pokemon
    const player1EnergyResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACH_ENERGY',
        actionData: {
          energyCardId: 'pokemon-base-set-v1.0-fire-energy--99',
          target: 'ACTIVE',
        },
      })
      .expect(200);

    expect(player1EnergyResponse.body.state).toBe('PLAYER_TURN');
    expect(player1EnergyResponse.body.phase).toBe('MAIN_PHASE');
    expect(
      player1EnergyResponse.body.playerState.activePokemon.attachedEnergy.length,
    ).toBe(1);
    expect(
      player1EnergyResponse.body.playerState.activePokemon.attachedEnergy[0],
    ).toBe('pokemon-base-set-v1.0-fire-energy--99');
    expect(player1EnergyResponse.body.playerState.hand.length).toBe(6); // 7 - 1 energy attached

    // Step 4: Player 1 ends his turn
    const player1EndTurnResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(200);

    // After ending turn, state might be BETWEEN_TURNS or PLAYER_TURN (if automatically processed)
    expect(['PLAYER_TURN', 'BETWEEN_TURNS']).toContain(
      player1EndTurnResponse.body.state,
    );
    // If state is PLAYER_TURN, it should be player 2's turn
    if (player1EndTurnResponse.body.state === 'PLAYER_TURN') {
      expect(player1EndTurnResponse.body.currentPlayer).toBe('PLAYER2');
      expect(player1EndTurnResponse.body.turnNumber).toBe(2);
    }

    // Step 5: Turn moves to player 2
    // If state is BETWEEN_TURNS, we need to wait for it to transition to PLAYER_TURN
    // For now, let's check if we need to wait or if it's already PLAYER_TURN
    let player2State = player1EndTurnResponse.body;
    if (player1EndTurnResponse.body.state === 'BETWEEN_TURNS') {
      // Wait a bit and check state again (system should auto-process)
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stateCheck = await request(server())
        .post(`/api/v1/matches/${MATCH_ID}/state`)
        .send({ playerId: PLAYER2_ID })
        .expect(200);
      player2State = stateCheck.body;
    }

    expect(player2State.state).toBe('PLAYER_TURN');
    expect(player2State.currentPlayer).toBe('PLAYER2');

    // Step 6: Player 2 draws a card
    const player2DrawResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'DRAW_CARD',
        actionData: {},
      })
      .expect(200);

    expect(player2DrawResponse.body.state).toBe('PLAYER_TURN');
    expect(player2DrawResponse.body.currentPlayer).toBe('PLAYER2');
    expect(player2DrawResponse.body.phase).toBe('MAIN_PHASE');
    expect(player2DrawResponse.body.playerState.hand.length).toBe(3); // 2 + 1 drawn
    expect(player2DrawResponse.body.playerState.deckCount).toBe(46); // 47 - 1 drawn

    // Step 7: Player 2 adds an energy card to the active pokemon
    const player2EnergyResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'ATTACH_ENERGY',
        actionData: {
          energyCardId: 'pokemon-base-set-v1.0-grass-energy--100',
          target: 'ACTIVE',
        },
      })
      .expect(200);

    expect(player2EnergyResponse.body.state).toBe('PLAYER_TURN');
    expect(player2EnergyResponse.body.phase).toBe('MAIN_PHASE');
    expect(
      player2EnergyResponse.body.playerState.activePokemon.attachedEnergy.length,
    ).toBe(1);
    expect(
      player2EnergyResponse.body.playerState.activePokemon.attachedEnergy[0],
    ).toBe('pokemon-base-set-v1.0-grass-energy--100');
    expect(player2EnergyResponse.body.playerState.hand.length).toBe(2); // 3 - 1 energy attached

    // Step 8: Player 2 evolves the BENCH_0 pokemon (bulbasaur) with ivysaur
    const player2EvolveResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'EVOLVE_POKEMON',
        actionData: {
          evolutionCardId: 'pokemon-base-set-v1.0-ivysaur--30',
          target: 'BENCH_0',
        },
      })
      .expect(200);

    expect(player2EvolveResponse.body.state).toBe('PLAYER_TURN');
    expect(player2EvolveResponse.body.phase).toBe('MAIN_PHASE');
    // Verify the bench pokemon was evolved
    const bench0Pokemon = player2EvolveResponse.body.playerState.bench.find(
      (p: any) => p.position === 'BENCH_0',
    );
    expect(bench0Pokemon).toBeTruthy();
    expect(bench0Pokemon.cardId).toBe('pokemon-base-set-v1.0-ivysaur--30');
    // Verify evolution preserves damage: Bulbasaur had 10 damage (40 max - 30 current)
    // Ivysaur has 60 max HP, so current HP should be 60 - 10 = 50
    expect(bench0Pokemon.maxHp).toBe(60); // Ivysaur's actual HP
    expect(bench0Pokemon.currentHp).toBe(50); // 60 - 10 damage = 50
    // Verify ivysaur was removed from hand
    expect(player2EvolveResponse.body.playerState.hand.length).toBe(1);
    expect(
      player2EvolveResponse.body.playerState.hand.includes(
        'pokemon-base-set-v1.0-ivysaur--30',
      ),
    ).toBe(false);

    // Step 9: Player 2 ends his turn
    const player2EndTurnResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(200);

    // After ending turn, state might be BETWEEN_TURNS or PLAYER_TURN (if automatically processed)
    expect(['PLAYER_TURN', 'BETWEEN_TURNS']).toContain(
      player2EndTurnResponse.body.state,
    );
    // If state is PLAYER_TURN, it should be player 1's turn again
    if (player2EndTurnResponse.body.state === 'PLAYER_TURN') {
      expect(player2EndTurnResponse.body.currentPlayer).toBe('PLAYER1');
      expect(player2EndTurnResponse.body.turnNumber).toBe(3);
      expect(player2EndTurnResponse.body.phase).toBe('DRAW');
    }

    // Step 10: Player 1 draws a card and receives: pokemon-base-set-v1.0-energy-removal--93
    const player1Draw2Response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'DRAW_CARD',
        actionData: {},
      })
      .expect(200);

    expect(player1Draw2Response.body.state).toBe('PLAYER_TURN');
    expect(player1Draw2Response.body.currentPlayer).toBe('PLAYER1');
    expect(player1Draw2Response.body.phase).toBe('MAIN_PHASE');
    expect(
      player1Draw2Response.body.playerState.hand.includes(
        'pokemon-base-set-v1.0-energy-removal--93',
      ),
    ).toBe(true);

    // Step 11: Player 1 plays Energy Removal trainer card and removes grass energy from opponent's active Pokemon
    const player1TrainerResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'PLAY_TRAINER',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-energy-removal--93',
          target: 'ACTIVE',
          energyCardId: 'pokemon-base-set-v1.0-grass-energy--100',
        },
      })
      .expect(200);

    expect(player1TrainerResponse.body.state).toBe('PLAYER_TURN');
    expect(player1TrainerResponse.body.phase).toBe('MAIN_PHASE');
    // Verify energy was removed from opponent's active Pokemon
    expect(
      player1TrainerResponse.body.opponentState.activePokemon.attachedEnergy.length,
    ).toBe(0);
    // Verify trainer card was removed from hand
    expect(
      player1TrainerResponse.body.playerState.hand.includes(
        'pokemon-base-set-v1.0-energy-removal--93',
      ),
    ).toBe(false);

    // Step 12a: Player 1 attaches a second FIRE energy (Flame Tail requires 2 FIRE energy)
    const player1Energy2Response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACH_ENERGY',
        actionData: {
          energyCardId: 'pokemon-base-set-v1.0-fire-energy--99',
          target: 'ACTIVE',
        },
      })
      .expect(200);

    expect(player1Energy2Response.body.playerState.activePokemon.attachedEnergy.length).toBe(2);

    // Step 12b: Player 1 attacks with Flame Tail (30 damage, but 60 due to weakness)
    const player1AttackResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Flame Tail is the second attack (index 1)
        },
      });
    
    if (player1AttackResponse.status !== 200) {
      console.error('Attack failed:', player1AttackResponse.body);
    }
    expect(player1AttackResponse.status).toBe(200);

    expect(player1AttackResponse.body.state).toBe('PLAYER_TURN');
    expect(player1AttackResponse.body.phase).toBe('END');
    // Verify opponent's active Pokemon was knocked out (50 HP - 60 damage = 0 HP)
    expect(player1AttackResponse.body.opponentState.activePokemon).toBeNull();
    expect(player1AttackResponse.body.lastAction.actionType).toBe('ATTACK');
    expect(player1AttackResponse.body.lastAction.actionData.isKnockedOut).toBe(true);
    expect(player1AttackResponse.body.lastAction.actionData.damage).toBe(60);

    // Step 13: Player 1 selects a prize
    const player1PrizeResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'SELECT_PRIZE',
        actionData: {
          prizeIndex: 0, // Select first prize card
        },
      })
      .expect(200);

    expect(player1PrizeResponse.body.state).toBe('PLAYER_TURN');
    expect(player1PrizeResponse.body.playerState.prizeCardsRemaining).toBe(5); // 6 - 1 = 5
    expect(player1PrizeResponse.body.playerState.hand.length).toBeGreaterThan(
      player1AttackResponse.body.playerState.hand.length,
    );

    // Step 14: Player 2 selects a new active Pokemon (Ivysaur from bench)
    const player2SelectActiveResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'SET_ACTIVE_POKEMON',
        actionData: {
          cardId: 'pokemon-base-set-v1.0-ivysaur--30',
        },
      });
    
    if (player2SelectActiveResponse.status !== 200) {
      console.error('SET_ACTIVE_POKEMON failed:', JSON.stringify(player2SelectActiveResponse.body, null, 2));
    }
    expect(player2SelectActiveResponse.status).toBe(200);

    expect(player2SelectActiveResponse.body.state).toBe('PLAYER_TURN');
    // After selecting active Pokemon, it's still Player 1's turn
    expect(player2SelectActiveResponse.body.currentPlayer).toBe('PLAYER1');
    // Verify Player 2's active Pokemon was set (from Player 2's perspective)
    expect(player2SelectActiveResponse.body.playerState.activePokemon).toBeTruthy();
    expect(player2SelectActiveResponse.body.playerState.activePokemon.cardId).toBe(
      'pokemon-base-set-v1.0-ivysaur--30',
    );
    // Verify Ivysaur was removed from bench
    const ivysaurOnBench = player2SelectActiveResponse.body.playerState.bench.find(
      (p: any) => p.cardId === 'pokemon-base-set-v1.0-ivysaur--30',
    );
    expect(ivysaurOnBench).toBeUndefined();

    // Step 14.5: Player 1 ends their turn (after Player 2 selected active Pokemon)
    const player1EndTurn2Response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(200);

    // After ending turn, it should be Player 2's turn
    expect(['PLAYER_TURN', 'BETWEEN_TURNS']).toContain(
      player1EndTurn2Response.body.state,
    );
    if (player1EndTurn2Response.body.state === 'PLAYER_TURN') {
      expect(player1EndTurn2Response.body.currentPlayer).toBe('PLAYER2');
      expect(player1EndTurn2Response.body.phase).toBe('DRAW');
    }

    // Step 15: Player 2 draws a card
    const player2Draw2Response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'DRAW_CARD',
        actionData: {},
      })
      .expect(200);

    expect(player2Draw2Response.body.state).toBe('PLAYER_TURN');
    expect(player2Draw2Response.body.currentPlayer).toBe('PLAYER2');
    expect(player2Draw2Response.body.phase).toBe('MAIN_PHASE');

    // Step 16: Player 2 attaches grass energy to active Pokemon
    const player2Energy2Response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'ATTACH_ENERGY',
        actionData: {
          energyCardId: 'pokemon-base-set-v1.0-grass-energy--100',
          target: 'ACTIVE',
        },
      })
      .expect(200);

    expect(player2Energy2Response.body.state).toBe('PLAYER_TURN');
    expect(player2Energy2Response.body.phase).toBe('MAIN_PHASE');
    expect(
      player2Energy2Response.body.playerState.activePokemon.attachedEnergy.length,
    ).toBe(1);
    expect(
      player2Energy2Response.body.playerState.activePokemon.attachedEnergy[0],
    ).toBe('pokemon-base-set-v1.0-grass-energy--100');

    // Step 17: Player 2 ends his turn
    const player2EndTurn2Response = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER2_ID,
        actionType: 'END_TURN',
        actionData: {},
      })
      .expect(200);

    expect(['PLAYER_TURN', 'BETWEEN_TURNS']).toContain(
      player2EndTurn2Response.body.state,
    );
    // If state is PLAYER_TURN, it should be player 1's turn again
    if (player2EndTurn2Response.body.state === 'PLAYER_TURN') {
      expect(player2EndTurn2Response.body.currentPlayer).toBe('PLAYER1');
    }
  });
});

