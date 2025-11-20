import { ValidationResult } from '../../domain';

/**
 * Validation Response DTO
 * Response for deck validation against tournament rules
 */
export class ValidationResponseDto {
  isValid: boolean;
  errors: string[];
  warnings: string[];

  static fromDomain(result: ValidationResult): ValidationResponseDto {
    const dto = new ValidationResponseDto();
    dto.isValid = result.isValid;
    dto.errors = result.errors;
    dto.warnings = result.warnings;
    return dto;
  }
}

