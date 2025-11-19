import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Load (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Add validation pipe as in production
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

  describe('/api/v1/cards/load (POST)', () => {
    it('should load cards from a valid file', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cards/load')
        .send({
          sets: [
            {
              author: 'pokemon',
              setName: 'base-set',
              version: '1.0',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.totalLoaded).toBe(1);
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results[0].success).toBe(true);
          expect(res.body.results[0].author).toBe('pokemon');
          expect(res.body.results[0].setName).toBe('Base Set');
          expect(res.body.results[0].version).toBe('1.0');
          expect(res.body.results[0].loaded).toBe(1);
          expect(res.body.results[0].filename).toBe('pokemon-base-set-v1.0.json');
        });
    });

    it('should handle non-existent file', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cards/load')
        .send({
          sets: [
            {
              author: 'pokemon',
              setName: 'non-existent-set',
              version: '1.0',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.totalLoaded).toBe(0);
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results[0].success).toBe(false);
          expect(res.body.results[0].error).toBeDefined();
        });
    });

    it('should reject invalid request body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cards/load')
        .send({
          sets: 'invalid',
        })
        .expect(400);
    });

    it('should reject missing sets array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cards/load')
        .send({})
        .expect(400);
    });

    it('should reject empty sets array', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cards/load')
        .send({
          sets: [],
        })
        .expect(400);
    });
  });
});

