import { Injectable, Inject } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IFileReader } from '../../domain/ports/file-reader.interface';
import { CardFileMetadataDto } from '../dto/card-file-metadata.dto';
import { AvailableSetDto } from '../../presentation/dto/available-set.dto';
import { GetAvailableSetsResponseDto } from '../../presentation/dto/get-available-sets-response.dto';

/**
 * Get Available Sets Use Case
 * Retrieves all card sets available in the file system
 */
@Injectable()
export class GetAvailableSetsUseCase {
  constructor(
    @Inject(IFileReader)
    private readonly fileReader: IFileReader,
  ) {}

  async execute(): Promise<GetAvailableSetsResponseDto> {
    // Get all JSON files from the data/cards directory
    const files = await this.fileReader.listCardFiles();

    const sets: AvailableSetDto[] = [];

    // Read metadata from each file
    for (const filename of files) {
      try {
        const rawData = await this.fileReader.readCardFile(filename);

        // Extract metadata
        if (rawData && typeof rawData === 'object' && 'metadata' in rawData) {
          const metadataDto = plainToClass(
            CardFileMetadataDto,
            rawData.metadata,
          );

          // Validate metadata
          const errors = await validate(metadataDto, {
            whitelist: true,
            forbidNonWhitelisted: false,
          });

          if (errors.length === 0) {
            sets.push({
              author: metadataDto.author,
              setName: metadataDto.setName,
              version: metadataDto.version,
              totalCards: metadataDto.totalCards || 0,
              official: metadataDto.official,
              dateReleased: metadataDto.dateReleased,
              description: metadataDto.description,
              logoUrl: metadataDto.logoUrl,
              filename,
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read or parsed
        console.error(
          `Failed to read metadata from ${filename}:`,
          error.message,
        );
      }
    }

    return {
      sets,
      total: sets.length,
    };
  }
}
