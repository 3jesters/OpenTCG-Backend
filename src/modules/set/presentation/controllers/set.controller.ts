import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateSetUseCase } from '../../application/use-cases/create-set.use-case';
import { GetSetsUseCase } from '../../application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from '../../application/use-cases/get-set-by-id.use-case';
import { UpdateSetUseCase } from '../../application/use-cases/update-set.use-case';
import { DeleteSetUseCase } from '../../application/use-cases/delete-set.use-case';
import { CreateSetDto } from '../../application/dto/create-set.dto';
import { UpdateSetDto } from '../../application/dto/update-set.dto';
import { SetResponseDto } from '../dto/set-response.dto';

/**
 * Set Controller
 * Handles HTTP requests for set management
 */
@Controller('api/v1/sets')
export class SetController {
  constructor(
    private readonly createSetUseCase: CreateSetUseCase,
    private readonly getSetsUseCase: GetSetsUseCase,
    private readonly getSetByIdUseCase: GetSetByIdUseCase,
    private readonly updateSetUseCase: UpdateSetUseCase,
    private readonly deleteSetUseCase: DeleteSetUseCase,
  ) {}

  /**
   * Create a new set
   * @param dto - Set creation data
   * @param userId - User ID from query parameter (placeholder for auth)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSetDto,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto> {
    // TODO: Replace with proper authentication when implemented
    if (!userId) {
      throw new Error('User ID is required. Provide ?userId=xxx for now.');
    }
    const set = await this.createSetUseCase.execute(dto, userId);
    return SetResponseDto.fromDomain(set, userId);
  }

  /**
   * Get all sets or filter by series, owner, or user access
   * @param series - Optional series filter
   * @param ownerId - Optional owner ID filter
   * @param userId - User ID from query parameter (for filtering accessible sets)
   */
  @Get()
  async getAll(
    @Query('series') series?: string,
    @Query('ownerId') ownerId?: string,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto[]> {
    const sets = await this.getSetsUseCase.execute(series, userId, ownerId);
    return SetResponseDto.fromDomainArray(sets, userId);
  }

  /**
   * Get a specific set by ID
   * @param id - Set ID
   * @param userId - User ID from query parameter (for canEdit calculation)
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto> {
    const set = await this.getSetByIdUseCase.execute(id);
    return SetResponseDto.fromDomain(set, userId);
  }

  /**
   * Update an existing set
   * @param id - Set ID
   * @param dto - Update data
   * @param userId - User ID from query parameter (placeholder for auth)
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSetDto,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto> {
    // TODO: Replace with proper authentication when implemented
    if (!userId) {
      throw new Error('User ID is required. Provide ?userId=xxx for now.');
    }
    const set = await this.updateSetUseCase.execute(id, userId, dto);
    return SetResponseDto.fromDomain(set, userId);
  }

  /**
   * Delete an existing set
   * @param id - Set ID
   * @param userId - User ID from query parameter (placeholder for auth)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<void> {
    // TODO: Replace with proper authentication when implemented
    if (!userId) {
      throw new Error('User ID is required. Provide ?userId=xxx for now.');
    }
    await this.deleteSetUseCase.execute(id, userId);
  }
}
