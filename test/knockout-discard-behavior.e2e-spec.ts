import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFile } from 'fs/promises';
import { join } from 'path';

describe('Knockout Discard Behavior E2E', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

  const MATCH_ID = 'spec-knockout-discard-behavior';
  const PLAYER1_ID = 'test-player-1';
  const PLAYER2_ID = 'test-player-2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Keep test match files for inspection - will be cleaned up by jest-global-setup before next run
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

  it('should move active Pokemon and all attached energy to discard pile on knockout', async () => {
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
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: [],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ], // 2 FIRE energy for Flame Tail attack
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--100'],
          hand: [],
          activePokemon: {
            instanceId: 'bulbasaur-instance-1',
            cardId: 'pokemon-base-set-v1.0-bulbasaur--46',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40, // Will be knocked out by attack
            attachedEnergy: [
              'pokemon-base-set-v1.0-grass-energy--100',
              'pokemon-base-set-v1.0-grass-energy--100',
            ], // 2 attached energy cards
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      join(matchesDirectory, `${MATCH_ID}.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    const bulbasaurCardId = 'pokemon-base-set-v1.0-bulbasaur--46';
    const grassEnergyCardId = 'pokemon-base-set-v1.0-grass-energy--100';

    // Player 1 attacks and knocks out opponent's active Pokemon
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${MATCH_ID}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Flame Tail attack - does 30 damage, but Bulbasaur has weakness to Fire, so 60 damage (knockout)
        },
      })
      .expect(200);

    // Verify opponent's active Pokemon is null (knocked out)
    expect(attackResponse.body.opponentState.activePokemon).toBeNull();

    // Verify discard pile contains Pokemon card + 2 attached energy cards
    const discardPile = attackResponse.body.opponentState.discardPile;
    expect(discardPile).toContain(bulbasaurCardId);
    expect(discardPile).toContain(grassEnergyCardId);
    
    // Count occurrences of grass energy in discard pile
    const grassEnergyCount = discardPile.filter(
      (id: string) => id === grassEnergyCardId,
    ).length;
    expect(grassEnergyCount).toBe(2); // Both attached energy cards should be in discard

    // Verify discard pile contains exactly 3 cards (Pokemon + 2 energy)
    expect(discardPile.length).toBe(3);
  });

  it('should move bench Pokemon and all attached energy to discard pile on knockout', async () => {
    const initialMatchState = {
      id: `${MATCH_ID}-bench`,
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
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: [],
          activePokemon: {
            instanceId: 'magnemite-instance-1',
            cardId: 'pokemon-base-set-v1.0-magnemite--37',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-lightning-energy--101',
              'pokemon-base-set-v1.0-lightning-energy--101',
              'pokemon-base-set-v1.0-lightning-energy--101',
              'pokemon-base-set-v1.0-fire-energy--99', // COLORLESS can be any energy type
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--100'],
          hand: [],
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
          bench: [
            {
              instanceId: 'ivysaur-instance-1',
              cardId: 'pokemon-base-set-v1.0-ivysaur--30',
              position: 'BENCH_0',
              maxHp: 60,
              currentHp: 10, // Low HP so Selfdestruct will knock it out (10 damage)
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'], // 1 attached energy
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          ],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      join(matchesDirectory, `${MATCH_ID}-bench.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    const ivysaurCardId = 'pokemon-base-set-v1.0-ivysaur--30';
    const grassEnergyCardId = 'pokemon-base-set-v1.0-grass-energy--100';

    // Player 1 attacks with Selfdestruct (Magnemite's attack that does bench damage)
    // Selfdestruct does 10 damage to each Pokemon on each player's Bench
    // This will knock out the bench Ivysaur (10 HP, takes 10 damage = 0 HP)
    const matchIdForRequest = `${MATCH_ID}-bench`;
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${matchIdForRequest}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Selfdestruct attack (index 1)
        },
      });

    if (attackResponse.status !== 200) {
      console.error('Attack failed:', {
        status: attackResponse.status,
        body: attackResponse.body,
        matchId: matchIdForRequest,
        filePath: join(matchesDirectory, `${matchIdForRequest}.json`),
      });
    }
    expect(attackResponse.status).toBe(200);

    // Verify bench Pokemon was knocked out
    expect(attackResponse.body.opponentState.bench).toHaveLength(0);

    // Verify discard pile contains bench Pokemon card + attached energy card
    // Note: Selfdestruct does 40 damage to active Pokemon, so Bulbasaur is also knocked out
    const discardPile = attackResponse.body.opponentState.discardPile;
    const bulbasaurCardId = 'pokemon-base-set-v1.0-bulbasaur--46';
    
    expect(discardPile).toContain(ivysaurCardId);
    expect(discardPile).toContain(bulbasaurCardId); // Active Pokemon also knocked out by 40 damage
    expect(discardPile).toContain(grassEnergyCardId);

    // Verify discard pile contains exactly 3 cards (2 Pokemon: active + bench + 1 energy)
    expect(discardPile.length).toBe(3);

    // File will be kept for inspection - cleaned up by jest-global-setup before next run
  });

  it('should move multiple bench Pokemon and their attached energy to discard pile', async () => {
    const initialMatchState = {
      id: `${MATCH_ID}-multiple-bench`,
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
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: [],
          activePokemon: {
            instanceId: 'magnemite-instance-1',
            cardId: 'pokemon-base-set-v1.0-magnemite--37',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-lightning-energy--101',
              'pokemon-base-set-v1.0-lightning-energy--101',
              'pokemon-base-set-v1.0-lightning-energy--101',
              'pokemon-base-set-v1.0-fire-energy--99', // COLORLESS can be any energy type
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--100'],
          hand: [],
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
          bench: [
            {
              instanceId: 'ivysaur-instance-1',
              cardId: 'pokemon-base-set-v1.0-ivysaur--30',
              position: 'BENCH_0',
              maxHp: 60,
              currentHp: 10, // Low HP so Selfdestruct will knock it out (10 damage)
              attachedEnergy: ['pokemon-base-set-v1.0-grass-energy--100'],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
            {
              instanceId: 'weedle-instance-1',
              cardId: 'pokemon-base-set-v1.0-weedle--71',
              position: 'BENCH_1',
              maxHp: 40,
              currentHp: 10, // Low HP so Selfdestruct will knock it out (10 damage)
              attachedEnergy: [
                'pokemon-base-set-v1.0-grass-energy--100',
                'pokemon-base-set-v1.0-grass-energy--100',
              ],
              statusEffect: 'NONE',
              damageCounters: 0,
            },
          ],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      join(matchesDirectory, `${MATCH_ID}-multiple-bench.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    // Small delay to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    const ivysaurCardId = 'pokemon-base-set-v1.0-ivysaur--30';
    const weedleCardId = 'pokemon-base-set-v1.0-weedle--71';
    const grassEnergyCardId = 'pokemon-base-set-v1.0-grass-energy--100';

    // Player 1 attacks with Selfdestruct (does 10 damage to each Pokemon on each player's Bench)
    // This will knock out both bench Pokemon (both have 10 HP, take 10 damage = 0 HP)
    const matchIdForRequest = `${MATCH_ID}-multiple-bench`;
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${matchIdForRequest}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Selfdestruct attack (index 1)
        },
      });

    if (attackResponse.status !== 200) {
      console.error('Attack failed:', {
        status: attackResponse.status,
        body: attackResponse.body,
        matchId: matchIdForRequest,
        filePath: join(matchesDirectory, `${matchIdForRequest}.json`),
      });
    }
    expect(attackResponse.status).toBe(200);

    // Verify both bench Pokemon were knocked out
    expect(attackResponse.body.opponentState.bench).toHaveLength(0);

    // Verify discard pile contains both bench Pokemon cards + all attached energy
    // Note: Selfdestruct does 40 damage to active Pokemon, so Bulbasaur is also knocked out
    const discardPile = attackResponse.body.opponentState.discardPile;
    const bulbasaurCardId = 'pokemon-base-set-v1.0-bulbasaur--46';
    
    expect(discardPile).toContain(ivysaurCardId);
    expect(discardPile).toContain(weedleCardId);
    expect(discardPile).toContain(bulbasaurCardId); // Active Pokemon also knocked out by 40 damage
    expect(discardPile).toContain(grassEnergyCardId);

    // Count energy cards in discard pile
    const grassEnergyCount = discardPile.filter(
      (id: string) => id === grassEnergyCardId,
    ).length;
    expect(grassEnergyCount).toBe(3); // 1 from Ivysaur + 2 from Weedle (Bulbasaur has no energy)

    // Verify all Pokemon cards are in discard pile (exactly once each)
    const bulbasaurCount = discardPile.filter((id: string) => id === bulbasaurCardId).length;
    const ivysaurCount = discardPile.filter((id: string) => id === ivysaurCardId).length;
    const weedleCount = discardPile.filter((id: string) => id === weedleCardId).length;
    expect(bulbasaurCount).toBe(1);
    expect(ivysaurCount).toBe(1);
    expect(weedleCount).toBe(1);

    // Verify discard pile contains exactly 6 cards (3 Pokemon: active + 2 bench + 3 energy)
    expect(discardPile.length).toBe(6);

    // File will be kept for inspection - cleaned up by jest-global-setup before next run
  });

  it('should discard evolution chain when evolved Pokemon is knocked out', async () => {
    const matchId = `${MATCH_ID}-evolved`;
    const initialMatchState = {
      id: matchId,
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
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: [],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--100'],
          hand: [],
          activePokemon: {
            instanceId: 'ivysaur-instance-1',
            cardId: 'pokemon-base-set-v1.0-ivysaur--30',
            position: 'ACTIVE',
            maxHp: 60,
            currentHp: 60, // Will be knocked out by attack
            attachedEnergy: [
              'pokemon-base-set-v1.0-grass-energy--100',
              'pokemon-base-set-v1.0-grass-energy--100',
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: ['pokemon-base-set-v1.0-bulbasaur--46'], // Evolved from Bulbasaur
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      join(matchesDirectory, `${matchId}.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const ivysaurCardId = 'pokemon-base-set-v1.0-ivysaur--30';
    const bulbasaurCardId = 'pokemon-base-set-v1.0-bulbasaur--46';
    const grassEnergyCardId = 'pokemon-base-set-v1.0-grass-energy--100';

    // Player 1 attacks and knocks out evolved Ivysaur
    // Ponyta's Flame Tail does 30 damage, but Ivysaur has weakness to Fire, so 60 damage (knockout)
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${matchId}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Flame Tail attack
        },
      })
      .expect(200);

    // Verify opponent's active Pokemon is null (knocked out)
    expect(attackResponse.body.opponentState.activePokemon).toBeNull();

    // Verify discard pile contains Ivysaur + Bulbasaur (from evolution chain) + 2 energy cards
    const discardPile = attackResponse.body.opponentState.discardPile;
    expect(discardPile).toContain(ivysaurCardId);
    expect(discardPile).toContain(bulbasaurCardId); // From evolution chain
    expect(discardPile).toContain(grassEnergyCardId);

    // Count occurrences of grass energy in discard pile
    const grassEnergyCount = discardPile.filter(
      (id: string) => id === grassEnergyCardId,
    ).length;
    expect(grassEnergyCount).toBe(2); // Both attached energy cards should be in discard

    // Verify discard pile contains exactly 4 cards (Ivysaur + Bulbasaur + 2 energy)
    expect(discardPile.length).toBe(4);
  });

  it('should discard base card when Pokemon Breeder evolved Pokemon is knocked out', async () => {
    const matchId = `${MATCH_ID}-breeder-evolved`;
    const initialMatchState = {
      id: matchId,
      tournamentId: 'classic-tournament',
      player1Id: PLAYER1_ID,
      player2Id: PLAYER2_ID,
      player1DeckId: 'classic-fire-starter-deck',
      player2DeckId: 'classic-water-starter-deck',
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
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: [],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-water-energy--103'],
          hand: [],
          activePokemon: {
            instanceId: 'blastoise-instance-1',
            cardId: 'pokemon-base-set-v1.0-blastoise--2',
            position: 'ACTIVE',
            maxHp: 100,
            currentHp: 30, // Will be knocked out by attack (30 damage)
            attachedEnergy: [
              'pokemon-base-set-v1.0-water-energy--103',
              'pokemon-base-set-v1.0-water-energy--103',
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: ['pokemon-base-set-v1.0-squirtle--65'], // Evolved directly from Squirtle via Pokemon Breeder (NO Wartortle)
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-water-energy--103'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      join(matchesDirectory, `${matchId}.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const blastoiseCardId = 'pokemon-base-set-v1.0-blastoise--2';
    const squirtleCardId = 'pokemon-base-set-v1.0-squirtle--65';
    const wartortleCardId = 'pokemon-base-set-v1.0-wartortle--44';
    const waterEnergyCardId = 'pokemon-base-set-v1.0-water-energy--103';

    await writeFile(
      join(matchesDirectory, `${matchId}.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Player 1 attacks and knocks out Blastoise
    // Ponyta's Flame Tail does 30 damage (knockout at 30 HP)
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${matchId}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Flame Tail attack
        },
      })
      .expect(200);

    // Verify opponent's active Pokemon is null (knocked out)
    expect(attackResponse.body.opponentState.activePokemon).toBeNull();

    // Verify discard pile contains Blastoise + Squirtle (from evolution chain, NO Wartortle) + 2 energy cards
    const discardPile = attackResponse.body.opponentState.discardPile;
    expect(discardPile).toContain(blastoiseCardId);
    expect(discardPile).toContain(squirtleCardId); // From evolution chain (Pokemon Breeder evolution)
    expect(discardPile).not.toContain(wartortleCardId); // Should NOT be in discard (was never evolved)
    expect(discardPile).toContain(waterEnergyCardId);

    // Count occurrences of water energy in discard pile
    const waterEnergyCount = discardPile.filter(
      (id: string) => id === waterEnergyCardId,
    ).length;
    expect(waterEnergyCount).toBe(2); // Both attached energy cards should be in discard

    // Verify discard pile contains exactly 4 cards (Blastoise + Squirtle + 2 energy)
    expect(discardPile.length).toBe(4);
  });

  it('should discard full evolution chain when Stage 2 Pokemon is knocked out', async () => {
    const matchId = `${MATCH_ID}-stage2-evolved`;
    const initialMatchState = {
      id: matchId,
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
          deck: ['pokemon-base-set-v1.0-fire-energy--99'],
          hand: [],
          activePokemon: {
            instanceId: 'ponyta-instance-1',
            cardId: 'pokemon-base-set-v1.0-ponyta--62',
            position: 'ACTIVE',
            maxHp: 40,
            currentHp: 40,
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [],
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-fire-energy--99'),
          discardPile: [],
          hasAttachedEnergyThisTurn: true,
        },
        player2State: {
          deck: ['pokemon-base-set-v1.0-grass-energy--100'],
          hand: [],
          activePokemon: {
            instanceId: 'charizard-instance-1',
            cardId: 'pokemon-base-set-v1.0-charizard--4',
            position: 'ACTIVE',
            maxHp: 120,
            currentHp: 30, // Will be knocked out by attack (30 damage)
            attachedEnergy: [
              'pokemon-base-set-v1.0-fire-energy--99',
              'pokemon-base-set-v1.0-fire-energy--99',
            ],
            statusEffect: 'NONE',
            damageCounters: 0,
            evolutionChain: [
              'pokemon-base-set-v1.0-charmeleon--24', // Stage 1
              'pokemon-base-set-v1.0-charmander--48', // Basic
            ], // Full evolution chain: Charmander → Charmeleon → Charizard
          },
          bench: [],
          prizeCards: Array(6).fill('pokemon-base-set-v1.0-grass-energy--100'),
          discardPile: [],
          hasAttachedEnergyThisTurn: false,
        },
        turnNumber: 1,
        phase: 'MAIN_PHASE',
        currentPlayer: 'PLAYER1',
        lastAction: null,
        actionHistory: [],
      },
    };

    await writeFile(
      join(matchesDirectory, `${matchId}.json`),
      JSON.stringify(initialMatchState, null, 2),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const charizardCardId = 'pokemon-base-set-v1.0-charizard--4';
    const charmeleonCardId = 'pokemon-base-set-v1.0-charmeleon--24';
    const charmanderCardId = 'pokemon-base-set-v1.0-charmander--48';
    const fireEnergyCardId = 'pokemon-base-set-v1.0-fire-energy--99';

    // Player 1 attacks and knocks out Charizard
    // Ponyta's Flame Tail does 30 damage (knockout at 30 HP)
    const attackResponse = await request(server())
      .post(`/api/v1/matches/${matchId}/actions`)
      .send({
        playerId: PLAYER1_ID,
        actionType: 'ATTACK',
        actionData: {
          attackIndex: 1, // Flame Tail attack
        },
      })
      .expect(200);

    // Verify opponent's active Pokemon is null (knocked out)
    expect(attackResponse.body.opponentState.activePokemon).toBeNull();

    // Verify discard pile contains Charizard + Charmeleon + Charmander (full evolution chain) + 2 energy cards
    const discardPile = attackResponse.body.opponentState.discardPile;
    expect(discardPile).toContain(charizardCardId);
    expect(discardPile).toContain(charmeleonCardId); // From evolution chain
    expect(discardPile).toContain(charmanderCardId); // From evolution chain
    expect(discardPile).toContain(fireEnergyCardId);

    // Count occurrences of fire energy in discard pile
    const fireEnergyCount = discardPile.filter(
      (id: string) => id === fireEnergyCardId,
    ).length;
    expect(fireEnergyCount).toBe(2); // Both attached energy cards should be in discard

    // Verify discard pile contains exactly 5 cards (Charizard + Charmeleon + Charmander + 2 energy)
    expect(discardPile.length).toBe(5);
  });
});

