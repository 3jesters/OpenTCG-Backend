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
  UseGuards,
} from '@nestjs/common';
import { CreateSetUseCase } from '../../application/use-cases/create-set.use-case';
import { GetSetsUseCase } from '../../application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from '../../application/use-cases/get-set-by-id.use-case';
import { UpdateSetUseCase } from '../../application/use-cases/update-set.use-case';
import { DeleteSetUseCase } from '../../application/use-cases/delete-set.use-case';
import { CreateSetDto } from '../../application/dto/create-set.dto';
import { UpdateSetDto } from '../../application/dto/update-set.dto';
import { SetResponseDto } from '../dto/set-response.dto';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/infrastructure/services/jwt.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Set Controller
 * Handles HTTP requests for set management
 */
@ApiTags('sets')
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
   * @param user - Authenticated user from JWT token
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new card set' })
  @ApiResponse({ status: 201, description: 'Set created successfully', type: SetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSetDto,
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string, // Keep for backward compatibility
  ): Promise<SetResponseDto> {
    // Use authenticated user ID, fallback to query param for backward compatibility
    const effectiveUserId = user?.sub || userId;
    if (!effectiveUserId) {
      throw new Error('User ID is required. Please authenticate or provide ?userId=xxx for backward compatibility.');
    }
    const set = await this.createSetUseCase.execute(dto, effectiveUserId);
    return SetResponseDto.fromDomain(set, effectiveUserId);
  }

  /**
   * Get all sets or filter by series, owner, or user access
   * @param series - Optional series filter
   * @param ownerId - Optional owner ID filter
   * @param user - Authenticated user from JWT token (optional)
   * @param userId - User ID from query parameter (for backward compatibility)
   */
  @Get()
  async getAll(
    @Query('series') series?: string,
    @Query('ownerId') ownerId?: string,
    @CurrentUser() user?: JwtPayload,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto[]> {
    // Use authenticated user ID if available, fallback to query param
    const effectiveUserId = user?.sub || userId;
    const sets = await this.getSetsUseCase.execute(series, effectiveUserId, ownerId);
    return SetResponseDto.fromDomainArray(sets, effectiveUserId);
  }

  /**
   * Get a specific set by ID
   * @param id - Set ID
   * @param user - Authenticated user from JWT token (optional)
   * @param userId - User ID from query parameter (for backward compatibility)
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto> {
    const effectiveUserId = user?.sub || userId;
    const set = await this.getSetByIdUseCase.execute(id);
    return SetResponseDto.fromDomain(set, effectiveUserId);
  }

  /**
   * Update an existing set
   * @param id - Set ID
   * @param dto - Update data
   * @param user - Authenticated user from JWT token
   * @param userId - User ID from query parameter (for backward compatibility)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an existing set' })
  @ApiResponse({ status: 200, description: 'Set updated successfully', type: SetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSetDto,
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
  ): Promise<SetResponseDto> {
    const effectiveUserId = user?.sub || userId;
    if (!effectiveUserId) {
      throw new Error('User ID is required. Please authenticate or provide ?userId=xxx for backward compatibility.');
    }
    const set = await this.updateSetUseCase.execute(id, effectiveUserId, dto);
    return SetResponseDto.fromDomain(set, effectiveUserId);
  }

  /**
   * Delete an existing set
   * @param id - Set ID
   * @param user - Authenticated user from JWT token
   * @param userId - User ID from query parameter (for backward compatibility)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an existing set' })
  @ApiResponse({ status: 204, description: 'Set deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
  ): Promise<void> {
    const effectiveUserId = user?.sub || userId;
    if (!effectiveUserId) {
      throw new Error('User ID is required. Please authenticate or provide ?userId=xxx for backward compatibility.');
    }
    await this.deleteSetUseCase.execute(id, effectiveUserId);
  }
}
