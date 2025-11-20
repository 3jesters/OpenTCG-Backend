import { ValidationResult } from './validation-result.value-object';

describe('ValidationResult Value Object', () => {
  describe('constructor', () => {
    it('should create validation result with all properties', () => {
      const result = new ValidationResult(true, [], ['warning']);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual(['warning']);
    });
  });

  describe('success', () => {
    it('should create successful validation result', () => {
      const result = ValidationResult.success();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('failure', () => {
    it('should create failed validation result with errors', () => {
      const result = ValidationResult.failure(['error1', 'error2']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['error1', 'error2']);
      expect(result.warnings).toEqual([]);
    });

    it('should throw error if no errors provided', () => {
      expect(() => ValidationResult.failure([])).toThrow(
        'Failure result must have at least one error',
      );
    });
  });

  describe('withWarnings', () => {
    it('should create valid result with warnings', () => {
      const result = ValidationResult.withWarnings(['warning1', 'warning2']);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual(['warning1', 'warning2']);
    });

    it('should allow empty warnings array', () => {
      const result = ValidationResult.withWarnings([]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('failureWithWarnings', () => {
    it('should create failed result with errors and warnings', () => {
      const result = ValidationResult.failureWithWarnings(
        ['error1'],
        ['warning1', 'warning2'],
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['error1']);
      expect(result.warnings).toEqual(['warning1', 'warning2']);
    });

    it('should throw error if no errors provided', () => {
      expect(() => ValidationResult.failureWithWarnings([], ['warning'])).toThrow(
        'Failure result must have at least one error',
      );
    });
  });

  describe('addErrors', () => {
    it('should add errors to existing result', () => {
      const result = ValidationResult.failure(['error1']);
      const updated = result.addErrors(['error2', 'error3']);

      expect(updated.errors).toEqual(['error1', 'error2', 'error3']);
      expect(updated.isValid).toBe(false);
      expect(result.errors).toEqual(['error1']); // Original unchanged
    });

    it('should make valid result invalid when adding errors', () => {
      const result = ValidationResult.success();
      const updated = result.addErrors(['error1']);

      expect(updated.isValid).toBe(false);
      expect(updated.errors).toEqual(['error1']);
    });

    it('should keep result valid when adding empty errors', () => {
      const result = ValidationResult.success();
      const updated = result.addErrors([]);

      expect(updated.isValid).toBe(true);
      expect(updated.errors).toEqual([]);
    });
  });

  describe('addWarnings', () => {
    it('should add warnings to existing result', () => {
      const result = ValidationResult.withWarnings(['warning1']);
      const updated = result.addWarnings(['warning2', 'warning3']);

      expect(updated.warnings).toEqual(['warning1', 'warning2', 'warning3']);
      expect(updated.isValid).toBe(true);
      expect(result.warnings).toEqual(['warning1']); // Original unchanged
    });

    it('should not affect validity when adding warnings', () => {
      const result = ValidationResult.success();
      const updated = result.addWarnings(['warning1']);

      expect(updated.isValid).toBe(true);
      expect(updated.warnings).toEqual(['warning1']);
    });
  });

  describe('merge', () => {
    it('should merge two successful results', () => {
      const result1 = ValidationResult.success();
      const result2 = ValidationResult.success();
      const merged = result1.merge(result2);

      expect(merged.isValid).toBe(true);
      expect(merged.errors).toEqual([]);
      expect(merged.warnings).toEqual([]);
    });

    it('should merge success with failure', () => {
      const result1 = ValidationResult.success();
      const result2 = ValidationResult.failure(['error1']);
      const merged = result1.merge(result2);

      expect(merged.isValid).toBe(false);
      expect(merged.errors).toEqual(['error1']);
    });

    it('should combine errors from both results', () => {
      const result1 = ValidationResult.failure(['error1']);
      const result2 = ValidationResult.failure(['error2']);
      const merged = result1.merge(result2);

      expect(merged.isValid).toBe(false);
      expect(merged.errors).toEqual(['error1', 'error2']);
    });

    it('should combine warnings from both results', () => {
      const result1 = ValidationResult.withWarnings(['warning1']);
      const result2 = ValidationResult.withWarnings(['warning2']);
      const merged = result1.merge(result2);

      expect(merged.isValid).toBe(true);
      expect(merged.warnings).toEqual(['warning1', 'warning2']);
    });

    it('should merge all errors and warnings', () => {
      const result1 = ValidationResult.failureWithWarnings(['error1'], ['warning1']);
      const result2 = ValidationResult.failureWithWarnings(['error2'], ['warning2']);
      const merged = result1.merge(result2);

      expect(merged.isValid).toBe(false);
      expect(merged.errors).toEqual(['error1', 'error2']);
      expect(merged.warnings).toEqual(['warning1', 'warning2']);
    });
  });

  describe('hasIssues', () => {
    it('should return false for success with no warnings', () => {
      const result = ValidationResult.success();
      expect(result.hasIssues()).toBe(false);
    });

    it('should return true for result with errors', () => {
      const result = ValidationResult.failure(['error1']);
      expect(result.hasIssues()).toBe(true);
    });

    it('should return true for result with warnings', () => {
      const result = ValidationResult.withWarnings(['warning1']);
      expect(result.hasIssues()).toBe(true);
    });

    it('should return true for result with both errors and warnings', () => {
      const result = ValidationResult.failureWithWarnings(['error1'], ['warning1']);
      expect(result.hasIssues()).toBe(true);
    });
  });
});

