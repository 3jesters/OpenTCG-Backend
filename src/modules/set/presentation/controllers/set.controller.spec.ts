import { Test, TestingModule } from '@nestjs/testing';
import { SetController } from './set.controller';
import { CreateSetUseCase } from '../../application/use-cases/create-set.use-case';
import { GetSetsUseCase } from '../../application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from '../../application/use-cases/get-set-by-id.use-case';
import { UpdateSetUseCase } from '../../application/use-cases/update-set.use-case';
import { DeleteSetUseCase } from '../../application/use-cases/delete-set.use-case';
import { CreateSetDto } from '../../application/dto/create-set.dto';
import { Set } from '../../domain/entities/set.entity';
import { JwtPayload } from '../../../auth/infrastructure/services/jwt.service';

describe('SetController', () => {
  let controller: SetController;
  let createSetUseCase: jest.Mocked<CreateSetUseCase>;
  let getSetsUseCase: jest.Mocked<GetSetsUseCase>;
  let getSetByIdUseCase: jest.Mocked<GetSetByIdUseCase>;
  let updateSetUseCase: jest.Mocked<UpdateSetUseCase>;
  let deleteSetUseCase: jest.Mocked<DeleteSetUseCase>;

  beforeEach(async () => {
    const mockCreateSetUseCase = {
      execute: jest.fn(),
    };

    const mockGetSetsUseCase = {
      execute: jest.fn(),
    };

    const mockGetSetByIdUseCase = {
      execute: jest.fn(),
    };

    const mockUpdateSetUseCase = {
      execute: jest.fn(),
    };

    const mockDeleteSetUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [
        {
          provide: CreateSetUseCase,
          useValue: mockCreateSetUseCase,
        },
        {
          provide: GetSetsUseCase,
          useValue: mockGetSetsUseCase,
        },
        {
          provide: GetSetByIdUseCase,
          useValue: mockGetSetByIdUseCase,
        },
        {
          provide: UpdateSetUseCase,
          useValue: mockUpdateSetUseCase,
        },
        {
          provide: DeleteSetUseCase,
          useValue: mockDeleteSetUseCase,
        },
      ],
    }).compile();

    controller = module.get<SetController>(SetController);
    createSetUseCase = module.get(CreateSetUseCase);
    getSetsUseCase = module.get(GetSetsUseCase);
    getSetByIdUseCase = module.get(GetSetByIdUseCase);
    updateSetUseCase = module.get(UpdateSetUseCase);
    deleteSetUseCase = module.get(DeleteSetUseCase);
  });

  describe('create', () => {
    it('should create a set with JWT authentication (username auth mode)', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
      };

      const set = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'user-123',
      );
      createSetUseCase.execute.mockResolvedValue(set);

      // Mock JWT payload from username auth
      const mockUser: JwtPayload = {
        sub: 'user-123',
        email: 'testuser',
        name: 'testuser',
      };

      const result = await controller.create(dto, mockUser, undefined);

      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(createSetUseCase.execute).toHaveBeenCalledWith(dto, 'user-123');
    });

    it('should create a set with JWT authentication (Google OAuth mode)', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
      };

      const set = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'google-user-456',
      );
      createSetUseCase.execute.mockResolvedValue(set);

      // Mock JWT payload from Google OAuth
      const mockUser: JwtPayload = {
        sub: 'google-user-456',
        email: 'user@gmail.com',
        name: 'Google User',
      };

      const result = await controller.create(dto, mockUser, undefined);

      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(createSetUseCase.execute).toHaveBeenCalledWith(dto, 'google-user-456');
    });

    it('should fallback to userId query parameter when user is not authenticated', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
      };

      const set = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'fallback-user',
      );
      createSetUseCase.execute.mockResolvedValue(set);

      // No user in request (undefined)
      const result = await controller.create(dto, undefined, 'fallback-user');

      expect(result.id).toBe('base-set');
      expect(createSetUseCase.execute).toHaveBeenCalledWith(dto, 'fallback-user');
    });
  });

  describe('getAll', () => {
    it('should return all sets when no series query provided', async () => {
      const sets = [
        new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102, 'system'),
        new Set('jungle', 'Jungle', 'pokemon', '1999-06-16', 64, 'system'),
      ];

      getSetsUseCase.execute.mockResolvedValue(sets);

      const result = await controller.getAll(undefined, undefined, undefined, undefined);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('base-set');
      expect(result[1].id).toBe('jungle');
      expect(getSetsUseCase.execute).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
    });

    it('should return filtered sets when series query provided', async () => {
      const sets = [
        new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102, 'system'),
      ];

      getSetsUseCase.execute.mockResolvedValue(sets);

      const result = await controller.getAll('pokemon', undefined, undefined, undefined);

      expect(result).toHaveLength(1);
      expect(result[0].series).toBe('pokemon');
      expect(getSetsUseCase.execute).toHaveBeenCalledWith(
        'pokemon',
        undefined,
        undefined,
      );
    });
  });

  describe('getById', () => {
    it('should return a set by ID', async () => {
      const set = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      getSetByIdUseCase.execute.mockResolvedValue(set);

      const result = await controller.getById('base-set', undefined, undefined);

      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(getSetByIdUseCase.execute).toHaveBeenCalledWith('base-set');
    });
  });
});
