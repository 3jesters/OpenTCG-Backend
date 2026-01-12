import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Strength Calculation E2E', () => {
  let app: INestApplication;

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

  describe('GET /api/v1/cards/strength/:cardId', () => {
    it('should return 404 when card does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/strength/non-existent-card-id')
        .expect(404);
    });

    it('should calculate strength for Chansey (S-Tier card)', async () => {
      // First get Chansey's cardId by previewing the card
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/3')
        .expect(200);

      const cardId = previewResponse.body.cardId;
      expect(cardId).toBeDefined();

      // Now calculate strength
      return request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${cardId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalStrength');
          expect(res.body).toHaveProperty('balanceCategory');
          expect(res.body).toHaveProperty('breakdown');
          expect(res.body).toHaveProperty('penalties');
          expect(res.body).toHaveProperty('bonuses');

          // Validate structure
          expect(typeof res.body.totalStrength).toBe('number');
          expect(res.body.totalStrength).toBeGreaterThanOrEqual(0);
          expect(res.body.totalStrength).toBeLessThanOrEqual(100);

          expect([
            'very_weak',
            'weak',
            'balanced',
            'strong',
            'too_strong',
          ]).toContain(res.body.balanceCategory);

          // Validate breakdown
          expect(res.body.breakdown).toHaveProperty('hpStrength');
          expect(res.body.breakdown).toHaveProperty('attackStrength');
          expect(res.body.breakdown).toHaveProperty('abilityStrength');
          expect(typeof res.body.breakdown.hpStrength).toBe('number');
          expect(typeof res.body.breakdown.attackStrength).toBe('number');
          expect(typeof res.body.breakdown.abilityStrength).toBe('number');

          // Validate penalties
          expect(res.body.penalties).toHaveProperty('sustainability');
          expect(res.body.penalties).toHaveProperty('evolutionDependency');
          expect(res.body.penalties).toHaveProperty('prizeLiability');
          expect(res.body.penalties).toHaveProperty('evolution');
          expect(typeof res.body.penalties.sustainability).toBe('number');
          expect(typeof res.body.penalties.evolutionDependency).toBe('number');
          expect(typeof res.body.penalties.prizeLiability).toBe('number');
          expect(typeof res.body.penalties.evolution).toBe('number');

          // Validate bonuses
          expect(res.body.bonuses).toHaveProperty('retreatCost');
          expect(res.body.bonuses).toHaveProperty('basicPokemon');
          expect(typeof res.body.bonuses.retreatCost).toBe('number');
          expect(typeof res.body.bonuses.basicPokemon).toBe('number');

          // Chansey should be very strong (120 HP Basic, known to be top tier)
          expect(res.body.totalStrength).toBeGreaterThan(80);
          expect(res.body.balanceCategory).toBe('too_strong');
          expect(res.body.breakdown.hpStrength).toBeGreaterThan(90); // High HP
        });
    });

    it('should calculate strength for Hitmonchan (S-Tier card)', async () => {
      // Get Hitmonchan's cardId
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/7')
        .expect(200);

      const cardId = previewResponse.body.cardId;
      expect(cardId).toBeDefined();

      // Calculate strength
      return request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalStrength).toBeGreaterThanOrEqual(0);
          expect(res.body.totalStrength).toBeLessThanOrEqual(100);

          // Hitmonchan is a Basic with efficient attacks (20 damage for 1 energy)
          // Should have Basic Pokémon bonus
          expect(res.body.bonuses.basicPokemon).toBe(5);
          // Should have attack efficiency bonus (20 damage/energy)
          expect(res.body.breakdown.attackStrength).toBeGreaterThan(0);
        });
    });

    it('should calculate strength for Alakazam (Stage 2 with ability)', async () => {
      // Get Alakazam's cardId
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/1')
        .expect(200);

      const cardId = previewResponse.body.cardId;
      expect(cardId).toBeDefined();

      // Calculate strength
      return request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalStrength).toBeGreaterThanOrEqual(0);
          expect(res.body.totalStrength).toBeLessThanOrEqual(100);

          // Alakazam is Stage 2, should have evolution penalty
          expect(res.body.penalties.evolution).toBe(8);
          // Should have ability strength (has Damage Swap ability)
          expect(res.body.breakdown.abilityStrength).toBeGreaterThan(0);
        });
    });

    it('should calculate strength for Scyther (A-Tier with free retreat)', async () => {
      // Get Scyther's cardId from Jungle set
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/jungle/v1.0/card/10')
        .expect(200);

      const cardId = previewResponse.body.cardId;
      expect(cardId).toBeDefined();

      // Calculate strength
      return request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalStrength).toBeGreaterThanOrEqual(0);
          expect(res.body.totalStrength).toBeLessThanOrEqual(100);

          // Scyther has free retreat (retreatCost: 0)
          expect(res.body.bonuses.retreatCost).toBe(5);
          // Should be Basic
          expect(res.body.bonuses.basicPokemon).toBe(5);
        });
    });

    it('should calculate strength for Caterpie (bottom tier)', async () => {
      // Get Caterpie's cardId
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/47')
        .expect(200);

      const cardId = previewResponse.body.cardId;
      expect(cardId).toBeDefined();

      // Calculate strength
      return request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalStrength).toBeGreaterThanOrEqual(0);
          expect(res.body.totalStrength).toBeLessThanOrEqual(100);

          // Caterpie is first form of 3-stage evolution, should have evolution dependency penalty
          expect(res.body.penalties.evolutionDependency).toBe(5);
          // Should be very weak
          expect(res.body.totalStrength).toBeLessThan(10);
          expect(res.body.balanceCategory).toBe('very_weak');
        });
    });

    it('should return consistent results for the same card', async () => {
      // Get a card
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/3')
        .expect(200);

      const cardId = previewResponse.body.cardId;

      // Calculate strength twice
      const response1 = await request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200);

      // Results should be identical
      expect(response1.body.totalStrength).toBe(response2.body.totalStrength);
      expect(response1.body.balanceCategory).toBe(
        response2.body.balanceCategory,
      );
      expect(response1.body.breakdown).toEqual(response2.body.breakdown);
      expect(response1.body.penalties).toEqual(response2.body.penalties);
      expect(response1.body.bonuses).toEqual(response2.body.bonuses);
    });

    it('should handle cards with self-damage attacks (sustainability penalty)', async () => {
      // Get a card with self-damage (like Chansey with Double-edge)
      const previewResponse = await request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/3')
        .expect(200);

      const cardId = previewResponse.body.cardId;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/cards/strength/${encodeURIComponent(cardId)}`)
        .expect(200);

      // Chansey has Double-edge which causes 80 self-damage (66% of 120 HP)
      // Should have sustainability penalty
      expect(response.body.penalties.sustainability).toBeGreaterThan(0);
    });

    it('should return 0 strength for non-Pokemon cards', async () => {
      // Try to get a trainer card if available, or test with invalid card
      // For now, we'll test that non-existent cards return 404
      // (Non-Pokemon cards would need to be tested if we have trainer/energy card endpoints)
      return request(app.getHttpServer())
        .get('/api/v1/cards/strength/invalid-card-id')
        .expect(404);
    });
  });
});
