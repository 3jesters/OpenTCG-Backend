import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Card Editor E2E (Phase 2)', () => {
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

  describe('POST /api/v1/cards/editor/create', () => {
    describe('Successful Card Creation', () => {
      it('should create a basic Pokemon card with minimal fields', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('instanceId');
            expect(res.body).toHaveProperty('cardId');
            expect(res.body).toHaveProperty('name', 'Pikachu');
            expect(res.body).toHaveProperty('pokemonNumber', '025');
            expect(res.body).toHaveProperty('hp', 60);
            expect(res.body).toHaveProperty('stage', 'BASIC');
            expect(res.body).toHaveProperty('pokemonType', 'ELECTRIC');
            expect(res.body).toHaveProperty('createdBy', 'test-user');
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body).toHaveProperty('isEditorCreated', true);
            expect(new Date(res.body.createdAt)).toBeInstanceOf(Date);
          });
      });

      it('should create a card with one attack', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              name: 'Fire Blast',
              energyCost: ['FIRE', 'FIRE', 'FIRE'],
              damage: '100',
              text: 'Discard 2 Energy attached to this Pokemon.',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('attacks');
            expect(res.body.attacks).toHaveLength(1);
            expect(res.body.attacks[0]).toHaveProperty('name', 'Fire Blast');
            expect(res.body.attacks[0]).toHaveProperty('energyCost');
            expect(res.body.attacks[0].energyCost).toEqual([
              'FIRE',
              'FIRE',
              'FIRE',
            ]);
            expect(res.body.attacks[0]).toHaveProperty('damage', '100');
            expect(res.body.attacks[0]).toHaveProperty('text');
          });
      });

      it('should create a card with two attacks (max allowed)', async () => {
        const createCardDto = {
          pokemonName: 'Blastoise',
          pokemonNumber: '009',
          hp: 100,
          stage: 'STAGE_2',
          pokemonType: 'WATER',
          attacks: [
            {
              name: 'Water Gun',
              energyCost: ['WATER'],
              damage: '30',
              text: 'Does 30 damage.',
            },
            {
              name: 'Hydro Pump',
              energyCost: ['WATER', 'WATER', 'WATER'],
              damage: '60',
              text: 'Does 60 damage.',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.attacks).toHaveLength(2);
          });
      });

      it('should create a card with an ability', async () => {
        const createCardDto = {
          pokemonName: 'Alakazam',
          pokemonNumber: '065',
          hp: 80,
          stage: 'STAGE_2',
          pokemonType: 'PSYCHIC',
          ability: {
            name: 'Damage Swap',
            text: "As often as you like during your turn, you may move 1 damage counter from 1 of your Pokemon to another as long as you don't Knock Out that Pokemon.",
            activationType: 'POKEMON_POWER',
            effects: [],
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('ability');
            expect(res.body.ability).toHaveProperty('name', 'Damage Swap');
            expect(res.body.ability).toHaveProperty('text');
            expect(res.body.ability).toHaveProperty(
              'activationType',
              'POKEMON_POWER',
            );
          });
      });

      it('should create a card with weakness and resistance', async () => {
        const createCardDto = {
          pokemonName: 'Scyther',
          pokemonNumber: '123',
          hp: 70,
          stage: 'BASIC',
          pokemonType: 'GRASS',
          weakness: {
            type: 'FIRE',
            modifier: '×2',
          },
          resistance: {
            type: 'FIGHTING',
            modifier: '-30',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('weakness');
            expect(res.body.weakness).toHaveProperty('type', 'FIRE');
            expect(res.body.weakness).toHaveProperty('modifier', '×2');
            expect(res.body).toHaveProperty('resistance');
            expect(res.body.resistance).toHaveProperty('type', 'FIGHTING');
            expect(res.body.resistance).toHaveProperty('modifier', '-30');
          });
      });

      it('should create a card with retreat cost', async () => {
        const createCardDto = {
          pokemonName: 'Snorlax',
          pokemonNumber: '143',
          hp: 90,
          stage: 'BASIC',
          pokemonType: 'COLORLESS',
          retreatCost: 4,
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('retreatCost', 4);
          });
      });

      it('should create a card with evolution chain', async () => {
        const createCardDto = {
          pokemonName: 'Venusaur',
          pokemonNumber: '003',
          hp: 100,
          stage: 'STAGE_2',
          pokemonType: 'GRASS',
          evolvesFrom: {
            name: 'Ivysaur',
            pokemonNumber: '002',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('evolvesFrom');
            expect(res.body.evolvesFrom).toHaveProperty('name', 'Ivysaur');
            expect(res.body.evolvesFrom).toHaveProperty('pokemonNumber', '002');
          });
      });

      it('should create a card with attack effects', async () => {
        const createCardDto = {
          pokemonName: 'Arbok',
          pokemonNumber: '024',
          hp: 60,
          stage: 'STAGE_1',
          pokemonType: 'GRASS',
          attacks: [
            {
              name: 'Poison Sting',
              energyCost: ['GRASS'],
              damage: '10',
              text: 'The Defending Pokemon is now Poisoned.',
              effects: [
                {
                  effectType: 'STATUS_CONDITION',
                  statusCondition: 'POISONED',
                  target: 'OPPONENT_ACTIVE',
                },
              ],
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.attacks[0]).toHaveProperty('effects');
            expect(res.body.attacks[0].effects).toHaveLength(1);
            expect(res.body.attacks[0].effects[0]).toHaveProperty(
              'effectType',
              'STATUS_CONDITION',
            );
            expect(res.body.attacks[0].effects[0]).toHaveProperty(
              'statusCondition',
              'POISONED',
            );
          });
      });

      it('should create a complete card with all optional fields', async () => {
        const createCardDto = {
          pokemonName: 'Dragonite',
          pokemonNumber: '149',
          hp: 100,
          stage: 'STAGE_2',
          pokemonType: 'COLORLESS',
          attacks: [
            {
              name: 'Slam',
              energyCost: ['COLORLESS', 'COLORLESS', 'COLORLESS'],
              damage: '40×',
              text: 'Flip 2 coins. This attack does 40 damage times the number of heads.',
            },
            {
              name: 'Hyper Beam',
              energyCost: ['COLORLESS', 'COLORLESS', 'COLORLESS', 'COLORLESS'],
              damage: '20',
              text: 'If the Defending Pokemon has any Energy cards attached to it, choose 1 of them and discard it.',
            },
          ],
          ability: {
            name: 'Step In',
            text: 'Once during your turn, you may switch this Pokemon with 1 of your Benched Pokemon.',
            activationType: 'POKEMON_POWER',
            effects: [],
          },
          weakness: {
            type: 'COLORLESS',
            modifier: '×2',
          },
          resistance: {
            type: 'FIGHTING',
            modifier: '-30',
          },
          retreatCost: 3,
          evolvesFrom: {
            name: 'Dragonair',
            pokemonNumber: '148',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('instanceId');
            expect(res.body).toHaveProperty('cardId');
            expect(res.body).toHaveProperty('name', 'Dragonite');
            expect(res.body).toHaveProperty('hp', 100);
            expect(res.body.attacks).toHaveLength(2);
            expect(res.body).toHaveProperty('ability');
            expect(res.body).toHaveProperty('weakness');
            expect(res.body).toHaveProperty('resistance');
            expect(res.body).toHaveProperty('retreatCost', 3);
            expect(res.body).toHaveProperty('evolvesFrom');
            expect(res.body).toHaveProperty('createdBy', 'test-user');
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body).toHaveProperty('isEditorCreated', true);
          });
      });
    });

    describe('Validation Errors - Required Fields', () => {
      it('should return 400 when pokemonName is missing', async () => {
        const createCardDto = {
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when pokemonNumber is missing', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when hp is missing', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when stage is missing', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when pokemonType is missing', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when createdBy is missing', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });
    });

    describe('Validation Errors - Pokemon Selection', () => {
      it('should return 422 when pokemonName is not from supported list', async () => {
        const createCardDto = {
          pokemonName: 'FakePokemon',
          pokemonNumber: '999',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when pokemonNumber does not match pokemonName', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '999', // Wrong number for Pikachu
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });
    });

    describe('Validation Errors - Attacks', () => {
      it('should return 400 when more than 2 attacks are provided', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              name: 'Attack 1',
              energyCost: ['FIRE'],
              damage: '30',
              text: 'Attack 1',
            },
            {
              name: 'Attack 2',
              energyCost: ['FIRE'],
              damage: '30',
              text: 'Attack 2',
            },
            {
              name: 'Attack 3',
              energyCost: ['FIRE'],
              damage: '30',
              text: 'Attack 3',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when attack is missing name', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              energyCost: ['FIRE'],
              damage: '30',
              text: 'Attack without name',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when attack is missing energyCost', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              name: 'Fire Blast',
              damage: '100',
              text: 'Attack without energy cost',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when attack is missing damage', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              name: 'Fire Blast',
              energyCost: ['FIRE'],
              text: 'Attack without damage',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when attack is missing text', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              name: 'Fire Blast',
              energyCost: ['FIRE'],
              damage: '100',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 422 when attack has invalid energy type', async () => {
        const createCardDto = {
          pokemonName: 'Charizard',
          pokemonNumber: '006',
          hp: 120,
          stage: 'STAGE_2',
          pokemonType: 'FIRE',
          attacks: [
            {
              name: 'Fire Blast',
              energyCost: ['INVALID_ENERGY'],
              damage: '100',
              text: 'Attack with invalid energy',
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when attack has invalid effect type', async () => {
        const createCardDto = {
          pokemonName: 'Arbok',
          pokemonNumber: '024',
          hp: 60,
          stage: 'STAGE_1',
          pokemonType: 'GRASS',
          attacks: [
            {
              name: 'Poison Sting',
              energyCost: ['GRASS'],
              damage: '10',
              text: 'The Defending Pokemon is now Poisoned.',
              effects: [
                {
                  effectType: 'INVALID_EFFECT',
                  statusCondition: 'POISONED',
                  target: 'OPPONENT_ACTIVE',
                },
              ],
            },
          ],
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });
    });

    describe('Validation Errors - Ability', () => {
      it('should return 400 when ability is missing name', async () => {
        const createCardDto = {
          pokemonName: 'Alakazam',
          pokemonNumber: '065',
          hp: 80,
          stage: 'STAGE_2',
          pokemonType: 'PSYCHIC',
          ability: {
            text: 'Ability without name',
            activationType: 'POKEMON_POWER',
            effects: [],
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when ability is missing text', async () => {
        const createCardDto = {
          pokemonName: 'Alakazam',
          pokemonNumber: '065',
          hp: 80,
          stage: 'STAGE_2',
          pokemonType: 'PSYCHIC',
          ability: {
            name: 'Damage Swap',
            activationType: 'POKEMON_POWER',
            effects: [],
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when ability is missing activationType', async () => {
        const createCardDto = {
          pokemonName: 'Alakazam',
          pokemonNumber: '065',
          hp: 80,
          stage: 'STAGE_2',
          pokemonType: 'PSYCHIC',
          ability: {
            name: 'Damage Swap',
            text: 'Ability text',
            effects: [],
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 422 when ability has invalid activationType', async () => {
        const createCardDto = {
          pokemonName: 'Alakazam',
          pokemonNumber: '065',
          hp: 80,
          stage: 'STAGE_2',
          pokemonType: 'PSYCHIC',
          ability: {
            name: 'Damage Swap',
            text: 'Ability text',
            activationType: 'INVALID_ACTIVATION',
            effects: [],
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when ability has invalid effect type', async () => {
        const createCardDto = {
          pokemonName: 'Alakazam',
          pokemonNumber: '065',
          hp: 80,
          stage: 'STAGE_2',
          pokemonType: 'PSYCHIC',
          ability: {
            name: 'Damage Swap',
            text: 'Ability text',
            activationType: 'POKEMON_POWER',
            effects: [
              {
                effectType: 'INVALID_EFFECT',
              },
            ],
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });
    });

    describe('Validation Errors - HP, Weakness, Resistance', () => {
      it('should return 400 when hp is not a positive integer', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: -10,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 400 when hp is zero', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 0,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(400);
      });

      it('should return 422 when weakness has invalid type', async () => {
        const createCardDto = {
          pokemonName: 'Scyther',
          pokemonNumber: '123',
          hp: 70,
          stage: 'BASIC',
          pokemonType: 'GRASS',
          weakness: {
            type: 'INVALID_TYPE',
            modifier: '×2',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when weakness has invalid modifier', async () => {
        const createCardDto = {
          pokemonName: 'Scyther',
          pokemonNumber: '123',
          hp: 70,
          stage: 'BASIC',
          pokemonType: 'GRASS',
          weakness: {
            type: 'FIRE',
            modifier: 'invalid',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when resistance has invalid type', async () => {
        const createCardDto = {
          pokemonName: 'Scyther',
          pokemonNumber: '123',
          hp: 70,
          stage: 'BASIC',
          pokemonType: 'GRASS',
          resistance: {
            type: 'INVALID_TYPE',
            modifier: '-30',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when resistance has invalid modifier', async () => {
        const createCardDto = {
          pokemonName: 'Scyther',
          pokemonNumber: '123',
          hp: 70,
          stage: 'BASIC',
          pokemonType: 'GRASS',
          resistance: {
            type: 'FIGHTING',
            modifier: 'invalid',
          },
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });
    });

    describe('Validation Errors - Stage and Type', () => {
      it('should return 422 when stage is invalid', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'INVALID_STAGE',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });

      it('should return 422 when pokemonType is invalid', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'INVALID_TYPE',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(422);
      });
    });

    describe('Metadata Tracking', () => {
      it('should set createdAt timestamp automatically', async () => {
        const beforeCreation = new Date();
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201);

        const afterCreation = new Date();
        const createdAt = new Date(response.body.createdAt);

        expect(createdAt.getTime()).toBeGreaterThanOrEqual(
          beforeCreation.getTime(),
        );
        expect(createdAt.getTime()).toBeLessThanOrEqual(
          afterCreation.getTime(),
        );
      });

      it('should set isEditorCreated to true', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.isEditorCreated).toBe(true);
          });
      });

      it('should preserve createdBy from request', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'custom-user-123',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.createdBy).toBe('custom-user-123');
          });
      });
    });

    describe('Response Structure', () => {
      it('should return CardEditorResponseDto with all expected fields', async () => {
        const createCardDto = {
          pokemonName: 'Pikachu',
          pokemonNumber: '025',
          hp: 60,
          stage: 'BASIC',
          pokemonType: 'ELECTRIC',
          createdBy: 'test-user',
        };

        return request(app.getHttpServer())
          .post('/api/v1/cards/editor/create')
          .send(createCardDto)
          .expect(201)
          .expect((res) => {
            // Identity fields
            expect(res.body).toHaveProperty('instanceId');
            expect(res.body).toHaveProperty('cardId');
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('pokemonNumber');
            expect(res.body).toHaveProperty('setName');
            expect(res.body).toHaveProperty('cardNumber');

            // Type fields
            expect(res.body).toHaveProperty('cardType');
            expect(res.body).toHaveProperty('pokemonType');
            expect(res.body).toHaveProperty('stage');

            // Battle stats
            expect(res.body).toHaveProperty('hp');

            // Metadata
            expect(res.body).toHaveProperty('createdBy');
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body).toHaveProperty('isEditorCreated');

            // Arrays should be present (may be empty)
            expect(res.body).toHaveProperty('attacks');
            expect(Array.isArray(res.body.attacks)).toBe(true);
          });
      });
    });
  });
});
