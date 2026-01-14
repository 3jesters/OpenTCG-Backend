import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

/**
 * Get User By ID Use Case
 * Retrieves a user by their ID
 */
@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }
}
