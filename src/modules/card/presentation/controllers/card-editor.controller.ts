import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { CreateCardRequestDto } from '../../application/dto/create-card-request.dto';
import { CardEditorResponseDto } from '../dto/card-editor-response.dto';
import { ICreateCardUseCase } from '../../application/ports/card-use-cases.interface';

/**
 * Card Editor Controller
 * Handles HTTP requests for card editor operations (create, update, etc.)
 */
@Controller('api/v1/cards/editor')
export class CardEditorController {
  constructor(
    @Inject(ICreateCardUseCase)
    private readonly createCardUseCase: ICreateCardUseCase,
  ) {}

  /**
   * Create a new card through the editor
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Body() createCardDto: CreateCardRequestDto,
  ): Promise<CardEditorResponseDto> {
    return await this.createCardUseCase.execute(createCardDto);
  }
}

