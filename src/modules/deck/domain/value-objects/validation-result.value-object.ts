/**
 * ValidationResult Value Object
 * Contains the result of deck validation with detailed errors and warnings
 * Immutable value object
 */
export class ValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
    public readonly warnings: string[],
  ) {}

  /**
   * Create a successful validation result
   */
  static success(): ValidationResult {
    return new ValidationResult(true, [], []);
  }

  /**
   * Create a failed validation result with errors
   */
  static failure(errors: string[]): ValidationResult {
    if (errors.length === 0) {
      throw new Error('Failure result must have at least one error');
    }
    return new ValidationResult(false, errors, []);
  }

  /**
   * Create a validation result with warnings (still valid)
   */
  static withWarnings(warnings: string[]): ValidationResult {
    return new ValidationResult(true, [], warnings);
  }

  /**
   * Create a failed validation result with errors and warnings
   */
  static failureWithWarnings(
    errors: string[],
    warnings: string[],
  ): ValidationResult {
    if (errors.length === 0) {
      throw new Error('Failure result must have at least one error');
    }
    return new ValidationResult(false, errors, warnings);
  }

  /**
   * Add errors to the result
   */
  addErrors(newErrors: string[]): ValidationResult {
    return new ValidationResult(
      newErrors.length === 0 && this.isValid,
      [...this.errors, ...newErrors],
      this.warnings,
    );
  }

  /**
   * Add warnings to the result
   */
  addWarnings(newWarnings: string[]): ValidationResult {
    return new ValidationResult(this.isValid, this.errors, [
      ...this.warnings,
      ...newWarnings,
    ]);
  }

  /**
   * Merge two validation results
   */
  merge(other: ValidationResult): ValidationResult {
    return new ValidationResult(
      this.isValid && other.isValid,
      [...this.errors, ...other.errors],
      [...this.warnings, ...other.warnings],
    );
  }

  /**
   * Check if there are any issues (errors or warnings)
   */
  hasIssues(): boolean {
    return this.errors.length > 0 || this.warnings.length > 0;
  }
}
