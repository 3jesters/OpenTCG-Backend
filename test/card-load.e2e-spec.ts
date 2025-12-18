import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Available Sets (e2e)', () => {
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

  describe('GET /api/v1/cards/sets/available', () => {
    it('should return available sets from file system', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/available')
        .expect(200)
        .expect((res) => {
          expect(res.body.sets).toBeDefined();
          expect(Array.isArray(res.body.sets)).toBe(true);
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.sets.length).toBe(res.body.total);

          // Check set structure
          if (res.body.sets.length > 0) {
            const firstSet = res.body.sets[0];
            expect(firstSet).toHaveProperty('author');
            expect(firstSet).toHaveProperty('setName');
            expect(firstSet).toHaveProperty('version');
            expect(firstSet).toHaveProperty('totalCards');
            expect(firstSet).toHaveProperty('filename');
          }
        });
    });

    it('should return sets with valid metadata', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cards/sets/available')
        .expect(200)
        .expect((res) => {
          res.body.sets.forEach((set: any) => {
            expect(set.author).toBeDefined();
            expect(set.setName).toBeDefined();
            expect(set.version).toBeDefined();
            expect(typeof set.totalCards).toBe('number');
            expect(set.filename).toBeDefined();
          });
        });
    });
  });
});
