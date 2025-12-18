import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Match Spec Cleanup (e2e)', () => {
  let app: INestApplication;
  const matchesDirectory = join(process.cwd(), 'data', 'matches');

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

  it('should create a match with spec-match-1 ID', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/matches')
      .send({
        id: 'spec-match-1',
        tournamentId: 'classic-tournament',
        player1Id: 'test-player-1',
        player1DeckId: 'classic-fire-starter-deck',
      })
      .expect(201);

    expect(response.body.id).toBe('spec-match-1');
    expect(response.body.tournamentId).toBe('classic-tournament');
    expect(response.body.player1Id).toBe('test-player-1');

    // Verify the file was created
    const filePath = join(matchesDirectory, 'spec-match-1.json');
    try {
      const content = await readFile(filePath, 'utf-8');
      const matchData = JSON.parse(content);
      expect(matchData.id).toBe('spec-match-1');
    } catch (error) {
      throw new Error(`Spec match file not found: ${error}`);
    }
  });

  it('should create a match with spec-match-2 ID', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/matches')
      .send({
        id: 'spec-match-2',
        tournamentId: 'classic-tournament',
        player1Id: 'test-player-2',
        player1DeckId: 'classic-fire-starter-deck',
      })
      .expect(201);

    // Should be the provided ID
    expect(response.body.id).toBe('spec-match-2');
    expect(response.body.id).not.toBe('spec-match-1');
    expect(response.body.tournamentId).toBe('classic-tournament');
    expect(response.body.player1Id).toBe('test-player-2');
  });
});
