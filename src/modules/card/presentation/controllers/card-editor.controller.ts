import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { CreateCardRequestDto } from '../../application/dto/create-card-request.dto';
import { CardEditorResponseDto } from '../dto/card-editor-response.dto';
import { ICreateCardUseCase } from '../../application/ports/card-use-cases.interface';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/infrastructure/services/jwt.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Card Editor Controller
 * Handles HTTP requests for card editor operations (create, update, etc.)
 */
@ApiTags('cards')
@Controller('api/v1/cards/editor')
export class CardEditorController {
  constructor(
    @Inject(ICreateCardUseCase)
    private readonly createCardUseCase: ICreateCardUseCase,
  ) {}

  /**
   * Create a new card through the editor
   * @param createCardDto - Card creation data
   * @param user - Authenticated user from JWT token
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new card through the editor' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Body() createCardDto: CreateCardRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CardEditorResponseDto> {
    // Override createdBy with authenticated user's email or name
    createCardDto.createdBy = user.email || user.name || user.sub;
    return await this.createCardUseCase.execute(createCardDto);
  }
}
