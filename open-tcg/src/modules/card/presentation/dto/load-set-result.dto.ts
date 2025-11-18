/**
 * Load Set Result DTO
 * Result for a single set load operation
 */
export class LoadSetResultDto {
  success: boolean;
  author: string;
  setName: string;
  version: string;
  loaded: number;
  filename: string;
  error?: string;
}

