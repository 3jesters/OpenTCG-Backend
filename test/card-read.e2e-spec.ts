import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Preview API (e2e)', () => {
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

  describe('GET /api/v1/cards/sets/available', () => {
    it('should return available sets from file system', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/available')
        .expect(200)
        .expect((res) => {
          expect(res.body.sets).toBeDefined();
          expect(Array.isArray(res.body.sets)).toBe(true);
          expect(res.body.total).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /api/v1/cards/sets/preview/:author/:setName/v:version', () => {
    it('should return 404 when set does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/NonExistent/v1.0')
        .expect(404);
    });

    it('should return set metadata and cards', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0')
        .expect(200)
        .expect((res) => {
          expect(res.body.set).toBeDefined();
          expect(res.body.set.author).toBe('pokemon');
          expect(res.body.set.setName).toBe('base-set');
          expect(res.body.set.version).toBe('1.0');
          expect(res.body.cards).toBeDefined();
          expect(Array.isArray(res.body.cards)).toBe(true);
          expect(res.body.count).toBeGreaterThan(0);
          
          // Check card structure
          if (res.body.cards.length > 0) {
            const firstCard = res.body.cards[0];
            expect(firstCard).toHaveProperty('cardId');
            expect(firstCard).toHaveProperty('instanceId');
            expect(firstCard).toHaveProperty('name');
            expect(firstCard).toHaveProperty('cardNumber');
            expect(firstCard).toHaveProperty('setName');
            expect(firstCard).toHaveProperty('cardType');
          }
        });
    });
  });

  describe('GET /api/v1/cards/sets/preview/:author/:setName/v:version/card/:cardNumber', () => {
    it('should return 404 when card does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/Base%20Set/v1.0/card/99999')
        .expect(404);
    });

    it('should return full card details', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('cardId');
          expect(res.body).toHaveProperty('instanceId');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('cardNumber', '1');
          expect(res.body).toHaveProperty('setName');
          // setName format may vary, just check it exists
        });
    });

    it('should include ability (Pokemon power) in card details when present', () => {
      // Alakazam (card 1) has "Damage Swap" ability in the card data
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/preview/pokemon/base-set/v1.0/card/1')
        .expect(200)
        .expect((res) => {
          // Abilities should now be included even without structured effects
          expect(res.body.ability).toBeDefined();
          expect(res.body.ability).toHaveProperty('name');
          expect(res.body.ability.name).toBe('Damage Swap');
          expect(res.body.ability).toHaveProperty('text');
          expect(res.body.ability.text).toContain('move 1 damage counter');
          expect(res.body.ability).toHaveProperty('activationType');
          expect(res.body.ability.activationType).toBe('ACTIVATED');
          expect(res.body.ability).toHaveProperty('usageLimit');
          expect(res.body.ability.usageLimit).toBe('UNLIMITED');
        });
    });
  });
});
