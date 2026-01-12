import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { UpdateSetDto } from '../dto/update-set.dto';
import { Set } from '../../domain/entities/set.entity';

/**
 * Use Case: Update an existing set
 */
@Injectable()
export class UpdateSetUseCase {
  constructor(
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
  ) {}

  async execute(
    setId: string,
    userId: string,
    dto: UpdateSetDto,
  ): Promise<Set> {
    // Find the set
    const set = await this.setRepository.findById(setId);
    if (!set) {
      throw new NotFoundException(`Set with ID ${setId} not found`);
    }

    // Business rule: Cannot update global sets
    if (set.isGlobal()) {
      throw new ForbiddenException('Global sets cannot be edited');
    }

    // Check authorization: user must own the set
    if (!set.canEdit(userId)) {
      throw new ForbiddenException(
        `You do not have permission to edit set ${setId}`,
      );
    }

    // Update mutable fields if provided
    // Note: name, series, releaseDate are readonly and cannot be updated
    if (dto.description !== undefined) {
      set.setDescription(dto.description);
    }

    if (dto.symbolUrl !== undefined) {
      set.setSymbolUrl(dto.symbolUrl);
    }

    if (dto.logoUrl !== undefined) {
      set.setLogoUrl(dto.logoUrl);
    }

    // Save updated set
    return await this.setRepository.save(set);
  }
}
