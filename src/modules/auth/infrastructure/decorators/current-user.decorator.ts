import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../user/domain/entities/user.entity';
import { JwtPayload } from '../services/jwt.service';

/**
 * Current User Decorator
 * Extracts user information from request
 * Can extract either User entity (from Google OAuth) or JwtPayload (from JWT)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User | JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
