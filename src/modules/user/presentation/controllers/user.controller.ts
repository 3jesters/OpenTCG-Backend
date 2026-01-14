import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { UserResponseDto } from '../dto/user-response.dto';

/**
 * User Controller
 * Handles HTTP requests for user operations
 */
@ApiTags('users')
@Controller('api/v1/users')
export class UserController {
  constructor(
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  /**
   * Get user profile by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.getUserByIdUseCase.execute(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return UserResponseDto.fromDomain(user);
  }
}
