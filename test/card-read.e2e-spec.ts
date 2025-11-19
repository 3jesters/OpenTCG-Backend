import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Read API (e2e)', () => {
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

  describe('GET /api/v1/cards/sets', () => {
    it('should return empty array when no sets are loaded', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets')
        .expect(200)
        .expect((res) => {
          expect(res.body.sets).toEqual([]);
          expect(res.body.total).toBe(0);
        });
    });

    it('should return loaded sets after loading a set', async () => {
      // First, load a set
      await request(app.getHttpServer())
        .post('/api/v1/cards/load')
        .send({
          sets: [
            {
              author: 'pokemon',
              setName: 'Base Set',
              version: '1.0',
            },
          ],
        })
        .expect(200);

      // Then, check loaded sets
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets')
        .expect(200)
        .expect((res) => {
          expect(res.body.sets).toHaveLength(1);
          expect(res.body.total).toBe(1);
          expect(res.body.sets[0].author).toBe('pokemon');
          expect(res.body.sets[0].setName).toBe('Base Set');
          expect(res.body.sets[0].version).toBe('1.0');
          expect(res.body.sets[0].setIdentifier).toBe('base-set');
          expect(res.body.sets[0].totalCards).toBe(1);
        });
    });

    it('should filter by author', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets?author=pokemon')
        .expect(200)
        .expect((res) => {
          expect(res.body.sets).toHaveLength(1);
          expect(res.body.sets[0].author).toBe('pokemon');
        });
    });

    it('should filter by official status', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets?official=true')
        .expect(200)
        .expect((res) => {
          expect(res.body.sets).toHaveLength(1);
          expect(res.body.sets[0].official).toBe(true);
        });
    });
  });

  describe('GET /api/v1/cards/sets/:author/:setName/v:version', () => {
    it('should return 404 when set does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/pokemon/NonExistent/v1.0')
        .expect(404);
    });

    it('should return set metadata and cards', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/pokemon/Base%20Set/v1.0')
        .expect(200)
        .expect((res) => {
          expect(res.body.set).toBeDefined();
          expect(res.body.set.author).toBe('pokemon');
          expect(res.body.set.setName).toBe('Base Set');
          expect(res.body.set.version).toBe('1.0');
          expect(res.body.cards).toBeDefined();
          expect(Array.isArray(res.body.cards)).toBe(true);
          expect(res.body.count).toBeGreaterThan(0);
          
          // Check card structure
          const firstCard = res.body.cards[0];
          expect(firstCard).toHaveProperty('cardId');
          expect(firstCard).toHaveProperty('instanceId');
          expect(firstCard).toHaveProperty('name');
          expect(firstCard).toHaveProperty('cardNumber');
          expect(firstCard).toHaveProperty('setName');
          expect(firstCard).toHaveProperty('cardType');
        });
    });
  });

  describe('GET /api/v1/cards/:cardId', () => {
    it('should return 404 when card does not exist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/non-existent-card-id')
        .expect(404);
    });

    it('should return full card details', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/pokemon-base-set-v1.0-alakazam-1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('cardId');
          expect(res.body).toHaveProperty('instanceId');
          expect(res.body).toHaveProperty('name', 'Alakazam');
          expect(res.body).toHaveProperty('pokemonNumber', '065');
          expect(res.body).toHaveProperty('cardNumber', '1');
          expect(res.body).toHaveProperty('setName', 'Base Set');
          expect(res.body).toHaveProperty('hp', 80);
          expect(res.body).toHaveProperty('pokemonType', 'PSYCHIC');
          expect(res.body).toHaveProperty('rarity', 'RARE_HOLO');
          expect(res.body).toHaveProperty('artist', 'Ken Sugimori');
          
          // Check ability
          expect(res.body.ability).toBeDefined();
          expect(res.body.ability.name).toBe('Damage Swap');
          
          // Check attacks
          expect(res.body.attacks).toBeDefined();
          expect(Array.isArray(res.body.attacks)).toBe(true);
          expect(res.body.attacks.length).toBeGreaterThan(0);
          
          // Check weakness
          expect(res.body.weakness).toBeDefined();
          expect(res.body.weakness.type).toBe('PSYCHIC');
        });
    });
  });

  describe('GET /api/v1/cards/search', () => {
    it('should return all cards when no query parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search')
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toBeDefined();
          expect(Array.isArray(res.body.results)).toBe(true);
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.limit).toBe(50);
          expect(res.body.offset).toBe(0);
        });
    });

    it('should search by query', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search?query=Alakazam')
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results[0].name).toBe('Alakazam');
        });
    });

    it('should filter by cardType', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search?cardType=POKEMON')
        .expect(200)
        .expect((res) => {
          expect(res.body.results.length).toBeGreaterThan(0);
          res.body.results.forEach((card: any) => {
            expect(card.cardType).toBe('POKEMON');
          });
        });
    });

    it('should filter by pokemonType', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search?pokemonType=PSYCHIC')
        .expect(200)
        .expect((res) => {
          expect(res.body.results.length).toBeGreaterThan(0);
          res.body.results.forEach((card: any) => {
            expect(card.pokemonType).toBe('PSYCHIC');
          });
        });
    });

    it('should apply pagination with limit', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search?limit=1')
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.limit).toBe(1);
          expect(res.body.offset).toBe(0);
        });
    });

    it('should apply pagination with offset', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search?limit=1&offset=0')
        .expect(200)
        .then((res1) => {
          const firstCard = res1.body.results[0];
          
          return request(app.getHttpServer())
            .get('/api/v1/cards/search?limit=1&offset=1')
            .expect(200)
            .then((res2) => {
              const secondCard = res2.body.results[0];
              // Cards should be different
              if (res1.body.total > 1) {
                expect(firstCard.cardId).not.toBe(secondCard.cardId);
              }
            });
        });
    });

    it('should return empty results when no cards match', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/search?query=NonExistentCardName')
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toEqual([]);
          expect(res.body.total).toBe(0);
        });
    });
  });
});

