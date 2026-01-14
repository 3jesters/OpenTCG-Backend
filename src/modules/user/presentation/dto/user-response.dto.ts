import { User } from '../../domain/entities/user.entity';

/**
 * User Response DTO
 * Response format for user data
 */
export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
