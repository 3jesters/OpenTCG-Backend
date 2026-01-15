# Cursor IDE Global Rules - NestJS Development

## AI Assistant Guidelines

When helping with NestJS projects:
1. Always follow clean architecture layers
2. Write tests first (TDD approach - Red-Green-Refactor cycle)
3. Use dependency injection for ALL dependencies (services, repositories, database, config)
4. Suggest interface-based designs for all external dependencies
5. Ensure business logic is testable (all dependencies must be mockable)
6. Follow NestJS conventions and decorators
7. Maintain type safety (avoid `any`)
8. Keep code simple and readable
9. ALL database access goes through injected repositories
10. Never hardcode database connections or configuration
11. Repository interfaces in domain layer, implementations in infrastructure layer
12. Update module docs/ folder only when business logic changes
13. Suggest meaningful variable and function names
14. **CRITICAL:** Mock ONLY external dependencies (repositories, APIs, file system) - NEVER mock business logic being tested (entities, use cases, validators, domain services)
15. **Environment-based DI**: Use dependency injection to switch implementations based on NODE_ENV or explicit config variables
16. **Type imports**: Use `import type` for types used in decorators to avoid isolatedModules issues
17. **Client API Discovery**: Expose configuration endpoints so clients can determine available features/methods

## Test-Driven Development (TDD)

### TDD Workflow
- Write tests BEFORE implementation (Red-Green-Refactor)
- Follow the TDD cycle:
  1. Write a failing test (Red)
  2. Write minimal code to pass (Green)
  3. Refactor while keeping tests green (Refactor)
- NEVER commit code without tests
- All business logic MUST be testable and tested

### Testing Best Practices
- Unit tests: Test in isolation with mocked dependencies
- Use Jest mocking capabilities extensively
- Test one behavior per test case
- Use descriptive test names: `describe('ClassName')` and `it('should do something when condition')`
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies (repositories, external APIs, etc.)
- Integration tests: Test module integration with real NestJS TestingModule
- E2E tests: Test complete user flows with real HTTP requests
- Use factories or builders for test data creation
- Keep tests independent (no shared state)

### CRITICAL: What to Mock vs What NOT to Mock

**✅ ALWAYS MOCK (External Dependencies):**
- Repository interfaces (IUserRepository, ICardCache, etc.)
- External APIs and services
- File system access
- Database connections
- HTTP clients
- Email services
- Third-party integrations
- ConfigService (when testing business logic)

**❌ NEVER MOCK (Business Logic):**
- Domain entities (User, Card, etc.)
- Value objects (Attack, Ability, Weakness, etc.)
- Domain services (validators, domain logic)
- Use cases (application logic)
- Business logic methods on the class you're testing

**WHY:** You must test the REAL business logic to ensure it works correctly. Mocking business logic defeats the purpose of testing - you'd be testing mocks, not your actual code.

**Example - CORRECT:**
```typescript
describe('GetCardByIdUseCase', () => {
  let useCase: GetCardByIdUseCase;
  let mockCardCache: jest.Mocked<ICardCache>; // ✅ Mock external dependency

  beforeEach(() => {
    mockCardCache = {
      getCard: jest.fn(),
      // ... other methods
    };
    useCase = new GetCardByIdUseCase(mockCardCache); // ✅ Test REAL use case
  });

  it('should throw NotFoundException when card does not exist', async () => {
    mockCardCache.getCard.mockReturnValue(null); // ✅ Mock returns data
    
    // ✅ Testing REAL business logic in use case
    await expect(useCase.execute('non-existent-id')).rejects.toThrow(
      NotFoundException
    );
  });
});
```

**Example - INCORRECT:**
```typescript
describe('GetCardByIdUseCase', () => {
  let useCase: GetCardByIdUseCase;
  
  beforeEach(() => {
    useCase = {
      execute: jest.fn(), // ❌ WRONG: Mocking the business logic itself!
    } as any;
  });

  it('should throw NotFoundException', async () => {
    useCase.execute.mockRejectedValue(new NotFoundException());
    
    // ❌ WRONG: Testing the mock, not real business logic
    await expect(useCase.execute('id')).rejects.toThrow();
  });
});
```

**Domain Entity Example - CORRECT:**
```typescript
describe('Card Entity', () => {
  it('should validate HP is positive', () => {
    const card = new Card(...); // ✅ Real entity instance
    
    // ✅ Testing REAL validation logic
    expect(() => card.setHp(-10)).toThrow('HP must be positive');
  });
});
```

**Domain Service Example - CORRECT:**
```typescript
describe('AbilityEffectValidator', () => {
  it('should validate heal amount', () => {
    // ✅ Testing REAL validator logic
    expect(() => {
      AbilityEffectValidator.validate({
        effectType: AbilityEffectType.HEAL,
        amount: 0
      });
    }).toThrow('Heal amount must be at least 1');
  });
});
```

### Test Example Structure
```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new CreateUserUseCase(userRepository);
  });

  describe('execute', () => {
    it('should create a user when valid data is provided', async () => {
      // Arrange
      const dto = { email: 'test@example.com', name: 'Test User' };
      userRepository.findByEmail.mockResolvedValue(null);
      
      // Act
      const result = await useCase.execute(dto);
      
      // Assert
      expect(result).toBeDefined();
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      const dto = { email: 'test@example.com', name: 'Test User' };
      userRepository.findByEmail.mockResolvedValue(new User());
      
      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow();
    });
  });
});
```

## Clean Code Practices

### SOLID Principles
- **Single Responsibility**: One class, one responsibility
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Many specific interfaces over one general interface
- **Dependency Inversion**: Depend on abstractions, not concretions

### Code Quality Rules
- Keep functions small (max 20 lines)
- Use meaningful and pronounceable variable names
- Avoid magic numbers and strings (use constants or enums)
- Maximum cyclomatic complexity: 10
- Write self-documenting code (clear naming, structure)
- Add comments ONLY when code cannot be self-explanatory

### Type Safety
- Enable strict mode in TypeScript
- Define explicit return types for all functions
- Use interfaces for contracts
- Use enums for fixed sets of values
- Avoid type assertions unless absolutely necessary
- No `any` types unless absolutely necessary

## NestJS Best Practices

### Dependency Injection
- ALL classes MUST use constructor injection
- Register all services in module providers
- Use interface-based injection with custom tokens when needed
- Example:
```typescript
// domain/repositories/user.repository.interface.ts
export interface IUserRepository {
  findById(id: string): Promise<User>;
}
export const IUserRepository = Symbol('IUserRepository');

// application/use-cases/get-user.use-case.ts
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}
}

// module.ts
@Module({
  providers: [
    {
      provide: IUserRepository,
      useClass: TypeOrmUserRepository,
    },
    GetUserUseCase,
  ],
})
```

### NestJS Patterns
- Use decorators appropriately (@Injectable, @Controller, @Module, etc.)
- Leverage NestJS dependency injection for ALL dependencies
- Use custom providers when needed (useClass, useValue, useFactory, useExisting)
- Implement proper module organization with feature modules
- Use ConfigModule for environment variables (never hardcode)
- Use ValidationPipe with class-validator for DTO validation
- Use ExceptionFilters for centralized error handling
- Use Interceptors for cross-cutting concerns (logging, transformation)
- Use Guards for authentication and authorization
- Use Pipes for data transformation and validation

## Environment-Based Dependency Injection

### Pattern: Conditional Provider Selection

When implementing features that need different implementations for dev/test vs production (e.g., authentication, repositories), use environment-based dependency injection:

```typescript
// At module level (outside @Module decorator)
const nodeEnv = process.env.NODE_ENV || 'dev';
const useDevImplementation = nodeEnv === 'dev' || nodeEnv === 'test' || process.env.FEATURE_FLAG === 'dev';

@Module({
  providers: [
    {
      provide: IFeatureService,
      useClass: useDevImplementation ? DevFeatureService : ProdFeatureService,
    },
    // Always provide both implementations (for DI to work)
    DevFeatureService,
    ProdFeatureService,
  ],
})
export class FeatureModule {}
```

### Example: Authentication Service Selection

```typescript
// auth.module.ts
const useUsernameAuth = nodeEnv === 'dev' || nodeEnv === 'test' || process.env.AUTH_METHOD === 'username';

@Module({
  providers: [
    {
      provide: IAuthService,
      useClass: useUsernameAuth ? UsernameAuthService : GoogleOAuthAuthService,
    },
    // Both implementations must be provided
    GoogleOAuthAuthService,
    UsernameAuthService,
  ],
})
export class AuthModule {}
```

### Best Practices
- **Always provide both implementations** in the providers array (required for DI)
- **Use environment variables** for explicit overrides (e.g., `AUTH_METHOD=username`)
- **Document the selection logic** in module comments
- **Validate required config** before selecting implementation (throw errors early)

## File-Based Repositories for Development

### Pattern: File System Storage in Dev/Test

For development and testing, use file-based repositories that store data in JSON files (similar to existing `FileSystemSetRepository`):

```typescript
// infrastructure/persistence/filesystem-user.repository.ts
@Injectable()
export class FileSystemUserRepository implements IUserRepository {
  private readonly dataDir = path.join(process.cwd(), 'data', 'users');

  async findById(id: string): Promise<User | null> {
    const filePath = path.join(this.dataDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return UserMapper.toDomain(data);
  }

  async save(user: User): Promise<User> {
    const filePath = path.join(this.dataDir, `${user.id}.json`);
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(UserMapper.toOrm(user), null, 2));
    return user;
  }
}
```

### Module Configuration

```typescript
// user.module.ts
const nodeEnv = process.env.NODE_ENV || 'dev';
const shouldInitializeDb = nodeEnv !== 'dev' && nodeEnv !== 'test';

@Module({
  imports: [
    // Always import TypeOrmModule.forFeature (even in dev)
    // This allows TypeORM repositories to be injected when needed
    TypeOrmModule.forFeature([UserOrmEntity]),
    // Conditionally import DatabaseModule (only initializes TypeORM root in staging/prod)
    ...(shouldInitializeDb ? [DatabaseModule] : []),
  ],
  providers: [
    {
      provide: IUserRepository,
      useClass:
        nodeEnv === 'dev' || nodeEnv === 'test'
          ? FileSystemUserRepository
          : TypeOrmUserRepository,
    },
  ],
})
export class UserModule {}
```

### Key Points
- **File-based repos store in `data/` directory** (e.g., `data/users/`, `data/tokens/`)
- **Always import `TypeOrmModule.forFeature`** even in dev (allows TypeORM entities to be available)
- **Conditionally import `DatabaseModule`** (only initializes TypeORM root connection in staging/prod)
- **Use mappers** to convert between domain entities and file storage format
- **Follow existing patterns** (check `FileSystemSetRepository` for reference)

## TypeORM Conditional Initialization

### Pattern: Avoid Database Connections in Dev/Test

The `DatabaseModule` should conditionally initialize TypeORM to prevent connection errors in development:

```typescript
// shared/infrastructure/database/database.module.ts
const nodeEnv = process.env.NODE_ENV || 'dev';
const shouldInitializeDb = nodeEnv !== 'dev' && nodeEnv !== 'test';

// Only create TypeORM root connection in staging/production
const typeOrmImports = shouldInitializeDb
  ? [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          // ... other config
        }),
      }),
    ]
  : [];

@Module({
  imports: typeOrmImports,
  exports: shouldInitializeDb ? [TypeOrmModule] : [],
})
export class DatabaseModule {}
```

### Important Notes
- **In dev/test**: `DatabaseModule` is imported but TypeORM root is NOT initialized (no connection attempts)
- **In staging/prod**: TypeORM root is initialized and PostgreSQL connection is established
- **Feature modules**: Always import `TypeOrmModule.forFeature([Entity])` regardless of environment
- **File-based repos**: Used automatically in dev/test when TypeORM root is not initialized

## TypeScript Type Handling

### Type Imports for Decorators

When using types in decorators (e.g., `@CurrentUser()`, `@Body()`), use `import type` to avoid `isolatedModules` errors:

```typescript
// ✅ CORRECT
import type { Request, Response } from 'express';
import type { JwtPayload } from '../infrastructure/services/jwt.service';

@Get()
async handler(@CurrentUser() user: JwtPayload, @Req() req: Request) {
  // ...
}

// ❌ INCORRECT (causes isolatedModules error)
import { Request, Response } from 'express';
import { JwtPayload } from '../infrastructure/services/jwt.service';
```

### Type Assertions for Third-Party Types

When dealing with third-party library types that don't match exactly (e.g., `StringValue` from 'ms' package), use type assertions with comments:

```typescript
// JWT expiresIn accepts string values like "15m", "7d" but TypeScript type is strict
const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m');
return {
  secret,
  signOptions: {
    expiresIn: expiresIn as any, // StringValue type from 'ms' package - valid time strings like "15m", "7d"
  },
};
```

**Always add comments** explaining why the type assertion is safe and what the runtime value will be.

## Client API Discovery

### Pattern: Expose Configuration to Clients

When implementing features that clients need to discover (e.g., available authentication methods, feature flags), create dedicated endpoints:

```typescript
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(IAuthService)
    private readonly authService: IAuthService,
  ) {}

  /**
   * Get available authentication method
   * Client uses this to determine which login UI to show
   */
  @Get('method')
  @ApiOperation({ summary: 'Get available authentication method' })
  getAuthMethod() {
    const method = this.authService.getAuthMethod();
    
    return {
      method,
      googleOAuthUrl: method === 'google-oauth' ? '/api/v1/auth/google' : null,
      usernameEndpoint: method === 'username' ? '/api/v1/auth/login/username' : null,
    };
  }
}
```

### Benefits
- **Client can adapt UI** based on available features
- **No hardcoded assumptions** about environment
- **Easier testing** (client can check endpoint instead of guessing)
- **Better developer experience** (clear API contract)

## Docker Environment Configuration

### Pattern: Pass Environment Variables to Containers

When using Docker Compose, explicitly pass environment variables from host `.env` to containers:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      NODE_ENV: staging # Docker should use production-like config
      # Explicitly pass all required env vars
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_TOKEN_EXPIRATION: ${JWT_ACCESS_TOKEN_EXPIRATION:-15m}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL}
      # Database config
      DB_HOST: ${DB_HOST:-postgres}
      DB_PORT: ${DB_PORT:-5432}
      DB_USERNAME: ${DB_USERNAME:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      DB_DATABASE: ${DB_DATABASE:-opentcg}
```

### Key Points
- **Use `${VAR}` syntax** to read from host `.env` file
- **Provide defaults** with `${VAR:-default}` syntax
- **Set NODE_ENV explicitly** in Docker (e.g., `staging` for production-like behavior)
- **Document required variables** in README or setup guide

## Backward Compatibility During Migration

### Pattern: Support Both Old and New Approaches

When migrating features (e.g., from query params to JWT auth), maintain backward compatibility:

```typescript
@Controller('api/v1/sets')
export class SetController {
  @Post()
  @UseGuards(JwtAuthGuard) // New: JWT auth required
  async create(
    @Body() dto: CreateSetDto,
    @CurrentUser() user?: User, // New: from JWT
    @Query('userId') userId?: string, // Old: query param (backward compat)
  ) {
    // Prefer JWT user, fallback to query param for backward compatibility
    const ownerId = user?.id || userId;
    
    if (!ownerId) {
      throw new UnauthorizedException('Authentication required');
    }
    
    // ... rest of implementation
  }
}
```

### Migration Strategy
1. **Add new approach** (JWT auth) as primary
2. **Keep old approach** (query params) as fallback
3. **Document deprecation** in API docs
4. **Remove old approach** in future major version

## Error Handling

### Exception Strategy
- Use NestJS built-in exceptions (BadRequestException, NotFoundException, etc.)
- Create custom domain exceptions for business rule violations
- Domain exceptions should be caught and transformed at the application layer
- Use exception filters for consistent error responses
- Always include meaningful error messages

### Example
```typescript
// domain/exceptions/user-already-exists.exception.ts
export class UserAlreadyExistsException extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsException';
  }
}

// application/use-cases/create-user.use-case.ts
try {
  await this.execute(dto);
} catch (error) {
  if (error instanceof UserAlreadyExistsException) {
    throw new ConflictException(error.message);
  }
  throw error;
}
```

## Database Best Practices

### Repository Pattern with DI
- All database access MUST go through repositories
- Repositories implement interfaces defined in domain layer
- Repository implementations are injected into use cases
- Repository methods should return domain entities, not ORM entities
- Map between ORM entities and domain entities in infrastructure layer

### Database Testing
- Mock repository interfaces in unit tests (never use real database)
- Use in-memory database (SQLite) for integration tests
- Create test database module with TestingModule
- All repositories must be mockable

## Git Workflow

### Commit Standards
- Use conventional commits: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep commits atomic and focused
- Write clear commit messages explaining "why", not "what"

### Branching Strategy
- main/master: production-ready code
- develop: integration branch
- feature/*: new features
- fix/*: bug fixes
- refactor/*: code refactoring

## Documentation Guidelines

### When to Document
- Create documentation for:
  - New business rules or domain logic
  - New use cases or workflows
  - Complex domain models or relationships
  - Architectural decisions (ADRs)
- Do NOT create documentation for:
  - Minor code changes
  - Refactoring that doesn't change behavior
  - Test additions
  - Style or formatting changes

### Documentation Format
- Use markdown for all documentation
- Keep documentation close to code
- Update documentation when business logic changes
- Include diagrams where helpful (use mermaid in markdown)

## Spec Coverage Report Maintenance

### Overview
The Spec Coverage Report (`docs/SPEC-COVERAGE-REPORT.md`) tracks test coverage of all business logic in the codebase. It must be kept up-to-date to ensure accurate visibility into test coverage gaps.

### When to Update the Report

**MUST update when:**
1. **Adding new business logic**:
   - New domain entity methods
   - New domain service methods
   - New use cases
   - New value objects with business logic
   - Add to "Business Logic Inventory" section

2. **Adding new specs/tests**:
   - New unit test files (`.spec.ts`)
   - New E2E test files (`.e2e-spec.ts`)
   - Add to "Spec Inventory" section

3. **Removing business logic**:
   - Removing methods from entities/services
   - Removing use cases
   - Remove from "Business Logic Inventory" section
   - Update coverage matrix

4. **Completing test coverage**:
   - When a previously missing test is added
   - Update "Coverage Matrix" to mark as covered
   - Update "Coverage Gaps" to remove from missing list

### Update Process

1. **Identify what changed**:
   - New business logic? → Add to inventory
   - New test? → Add to spec inventory
   - Coverage added? → Update matrix

2. **Update relevant sections**:
   - Business Logic Inventory: Add/remove components
   - Spec Inventory: Add/remove test files
   - Coverage Matrix: Update coverage status (✅/❌)
   - Coverage Gaps: Add new gaps or remove resolved ones

3. **Update metadata**:
   - Update "Last Updated" date at top of document
   - Update coverage statistics if significant changes

4. **Review recommendations**:
   - Update recommendations if priorities change
   - Add new recommendations for critical gaps

### Coverage Status Indicators

- ✅ = Covered (has unit test or E2E test)
- ❌ = Not covered (missing tests)
- **Missing** = Critical gap that needs attention
- Partial = Some coverage but not complete

### Example Update

**Scenario**: Adding unit tests for `MatchEntity.endMatch()`

1. Add test file to "Spec Inventory" if new file created
2. Update "Coverage Matrix" for `endMatch()`:
   - Change from ❌ to ✅ in "Unit Test" column
   - Update "Coverage Status" from "Missing" to "Covered"
3. Update "Coverage Gaps" section:
   - Remove `endMatch()` from "Critical Missing Coverage" list
4. Update "Last Updated" date

**CRITICAL**: The report must accurately reflect the current state of the codebase. Outdated reports are worse than no report - they provide false confidence.

## Security Best Practices

- Validate and sanitize all inputs
- Use helmet middleware for security headers
- Implement rate limiting
- Use CORS appropriately
- Never expose sensitive data in responses
- Hash passwords with bcrypt
- Use JWT for authentication
- Implement proper authorization checks
- Never commit secrets or sensitive data

## Performance Guidelines

- Use caching where appropriate (Redis, in-memory)
- Implement pagination for list endpoints
- Use database indexes on frequently queried fields
- Lazy load relationships when possible
- Use bulk operations for multiple records
- Profile and monitor performance regularly

