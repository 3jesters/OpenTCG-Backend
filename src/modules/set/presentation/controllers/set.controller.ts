import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateSetUseCase } from '../../application/use-cases/create-set.use-case';
import { GetSetsUseCase } from '../../application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from '../../application/use-cases/get-set-by-id.use-case';
import { CreateSetDto } from '../../application/dto/create-set.dto';
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
  ) {}

  /**
   * Create a new set
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSetDto): Promise<SetResponseDto> {
    const set = await this.createSetUseCase.execute(dto);
    return SetResponseDto.fromDomain(set);
  }

  /**
   * Get all sets or filter by series
   */
  @Get()
  async getAll(@Query('series') series?: string): Promise<SetResponseDto[]> {
    const sets = await this.getSetsUseCase.execute(series);
    return SetResponseDto.fromDomainArray(sets);
  }

  /**
   * Get a specific set by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<SetResponseDto> {
    const set = await this.getSetByIdUseCase.execute(id);
    return SetResponseDto.fromDomain(set);
  }
}

