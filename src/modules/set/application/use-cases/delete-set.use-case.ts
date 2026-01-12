import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';

/**
 * Use Case: Delete an existing set
 */
@Injectable()
export class DeleteSetUseCase {
  constructor(
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
  ) {}

  async execute(setId: string, userId: string): Promise<void> {
    // Find the set
    const set = await this.setRepository.findById(setId);
    if (!set) {
      throw new NotFoundException(`Set with ID ${setId} not found`);
    }

    // Business rule: Cannot delete global sets
    if (set.isGlobal()) {
      throw new ForbiddenException('Global sets cannot be deleted');
    }

    // Check authorization: user must own the set
    if (!set.canEdit(userId)) {
      throw new ForbiddenException(
        `You do not have permission to delete set ${setId}`,
      );
    }

    // Delete the set
    await this.setRepository.delete(setId);
  }
}
