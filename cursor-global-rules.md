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
14. Mock repository interfaces in unit tests (no real database in unit tests)

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

