import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateTournamentDto } from '../../application/dto/create-tournament.dto';
import { UpdateTournamentDto } from '../../application/dto/update-tournament.dto';
import { CreateTournamentUseCase } from '../../application/use-cases/create-tournament.use-case';
import { GetTournamentByIdUseCase } from '../../application/use-cases/get-tournament-by-id.use-case';
import { GetAllTournamentsUseCase } from '../../application/use-cases/get-all-tournaments.use-case';
import { UpdateTournamentUseCase } from '../../application/use-cases/update-tournament.use-case';
import { DeleteTournamentUseCase } from '../../application/use-cases/delete-tournament.use-case';
import { TournamentResponseDto } from '../dto/tournament-response.dto';
import { TournamentListResponseDto } from '../dto/tournament-list-response.dto';

/**
 * Tournament Controller
 * Handles HTTP requests for tournament management
 */
@Controller('api/v1/tournaments')
export class TournamentController {
  constructor(
    private readonly createTournamentUseCase: CreateTournamentUseCase,
    private readonly getTournamentByIdUseCase: GetTournamentByIdUseCase,
    private readonly getAllTournamentsUseCase: GetAllTournamentsUseCase,
    private readonly updateTournamentUseCase: UpdateTournamentUseCase,
    private readonly deleteTournamentUseCase: DeleteTournamentUseCase,
  ) {}

  /**
   * POST /api/v1/tournaments
   * Create a new tournament
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTournamentDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.createTournamentUseCase.execute(dto);
    return TournamentResponseDto.fromDomain(tournament);
  }

  /**
   * GET /api/v1/tournaments
   * Get all tournaments
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<TournamentListResponseDto> {
    const tournaments = await this.getAllTournamentsUseCase.execute();
    return TournamentListResponseDto.fromDomain(tournaments);
  }

  /**
   * GET /api/v1/tournaments/:id
   * Get tournament by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<TournamentResponseDto> {
    const tournament = await this.getTournamentByIdUseCase.execute(id);
    return TournamentResponseDto.fromDomain(tournament);
  }

  /**
   * PUT /api/v1/tournaments/:id
   * Update tournament
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.updateTournamentUseCase.execute(id, dto);
    return TournamentResponseDto.fromDomain(tournament);
  }

  /**
   * DELETE /api/v1/tournaments/:id
   * Delete tournament
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteTournamentUseCase.execute(id);
  }
}
