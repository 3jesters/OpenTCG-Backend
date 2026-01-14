import { UserResponseDto } from '../../../user/presentation/dto/user-response.dto';

/**
 * Auth Response DTO
 * Response format for authentication endpoints
 */
export class AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

/**
 * Token Refresh Response DTO
 */
export class TokenRefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}
