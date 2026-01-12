# Contributing to OpenTCG Backend

Thank you for your interest in contributing to OpenTCG Backend! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Architecture](#project-architecture)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm v9 or higher
- Git
- PostgreSQL v15 (optional, for database testing)
- Docker (optional, for containerized development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/OpenTCG-Backend.git
   cd OpenTCG-Backend
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/YOUR_USERNAME/OpenTCG-Backend.git
   ```

### Setup Development Environment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run start:dev
   ```

4. Run tests to verify setup:
   ```bash
   npm test
   ```

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or fixes

### 2. Make Your Changes

- Follow the [Coding Standards](#coding-standards)
- Write tests for your changes (TDD approach)
- Keep commits atomic and focused
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Check test coverage
npm run test:cov

# Lint your code
npm run lint

# Format your code
npm run format
```

### 4. Commit Your Changes

Follow the [Commit Guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Keep Your Branch Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript Style

- **Strict Mode**: Always use TypeScript strict mode
- **No `any`**: Avoid `any` types unless absolutely necessary
- **Explicit Types**: Define explicit return types for functions
- **Interfaces**: Use interfaces for contracts and DTOs

### Clean Architecture

This project follows clean architecture principles:

```
module/
├── domain/           # Business entities, value objects, interfaces
├── application/      # Use cases, application DTOs
├── infrastructure/   # Database, external APIs, implementations
└── presentation/     # Controllers, HTTP DTOs, guards
```

**Rules**:
- Domain layer has NO dependencies on other layers
- Application layer depends only on domain
- Infrastructure implements domain interfaces
- Presentation depends on application layer

### Dependency Injection

- **ALL** dependencies must be injected
- Use constructor injection
- Define interfaces for all external dependencies
- Repository interfaces in domain, implementations in infrastructure

Example:
```typescript
// domain/repositories/user.repository.interface.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
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
```

### Code Quality

- **Functions**: Keep functions small (max 20 lines)
- **Complexity**: Maximum cyclomatic complexity of 10
- **Naming**: Use clear, descriptive names
- **Comments**: Only when code cannot be self-explanatory
- **Magic Numbers**: Use constants or enums

### ESLint and Prettier

All code must pass ESLint and Prettier checks:

```bash
npm run lint    # Check and fix linting issues
npm run format  # Format code
```

## Testing Requirements

### Test-Driven Development (TDD)

This project follows TDD practices:

1. **Write test first** (Red)
2. **Write minimal code to pass** (Green)
3. **Refactor** while keeping tests green

### Test Coverage Requirements

- **Domain layer**: 100% coverage (all business logic)
- **Application layer**: 100% coverage (all use cases)
- **Infrastructure layer**: 70%+ coverage
- **Controllers**: 70%+ coverage
- **Overall project**: 80%+ coverage

### What to Test

**✅ DO Test**:
- Domain entities and their business logic
- Use cases and application workflows
- Domain services and validators
- Value objects
- Repository implementations (integration tests)
- Controllers (E2E tests)

**❌ DON'T Mock**:
- The class/function you're testing
- Domain entities
- Value objects
- Business logic

**✅ DO Mock**:
- Repository interfaces
- External APIs
- File system access
- Database connections
- Third-party services

### Test Structure

```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new CreateUserUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create user when valid data provided', async () => {
      // Arrange
      const dto = { email: 'test@example.com', name: 'Test' };
      mockRepository.findByEmail.mockResolvedValue(null);
      
      // Act
      const result = await useCase.execute(dto);
      
      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e

# Specific test file
npm test -- user.entity.spec.ts
```

## Commit Guidelines

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `perf`: Performance improvements

### Examples

```bash
feat(card): add card strength calculation algorithm

fix(match): resolve coin flip probability issue

docs(readme): update installation instructions

test(deck): add unit tests for deck validation

refactor(tournament): extract match creation logic
```

### Commit Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep subject line under 50 characters
- Capitalize subject line
- No period at the end of subject line
- Separate subject from body with blank line
- Wrap body at 72 characters
- Explain what and why, not how

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm test` and `npm run test:e2e`)
2. ✅ Code is linted (`npm run lint`)
3. ✅ Code is formatted (`npm run format`)
4. ✅ Test coverage meets requirements
5. ✅ Documentation is updated
6. ✅ Commits follow conventional commits
7. ✅ Branch is up to date with main

### PR Title

Use conventional commit format:

```
feat(module): add new feature
fix(module): resolve bug
docs: update contributing guide
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests passing
- [ ] Test coverage maintained/improved

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Dependent changes merged
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. All review comments must be resolved
4. Branch must be up to date with main

### After Approval

- Maintainers will merge using "Squash and merge"
- Your commits will be squashed into one
- Delete your branch after merge

## Project Architecture

### Module Structure

Each module follows this structure:

```
module/
├── domain/
│   ├── entities/          # Business entities
│   ├── value-objects/     # Immutable value objects
│   ├── repositories/      # Repository interfaces
│   └── services/          # Domain services
├── application/
│   ├── use-cases/         # Application workflows
│   └── dto/               # Application DTOs
├── infrastructure/
│   ├── persistence/       # Database implementations
│   │   ├── entities/      # ORM entities
│   │   ├── mappers/       # Domain ↔ ORM mappers
│   │   └── repositories/  # Repository implementations
│   └── external/          # Third-party integrations
├── presentation/
│   ├── controllers/       # HTTP controllers
│   ├── dto/               # Request/response DTOs
│   ├── guards/            # Auth guards
│   └── pipes/             # Validation pipes
└── docs/
    ├── business-rules.md  # Domain rules
    ├── use-cases.md       # Use case documentation
    └── domain-model.md    # Entity relationships
```

### Adding a New Module

1. Create module structure following the template above
2. Define domain entities and interfaces first
3. Write tests for domain logic
4. Implement use cases
5. Add infrastructure implementations
6. Create controllers and DTOs
7. Update module documentation in `docs/`
8. Register module in `app.module.ts`

### Documentation Requirements

Update documentation when:
- Adding new business rules or domain logic
- Creating new use cases or workflows
- Changing domain models or relationships
- Making architectural decisions

Do NOT document:
- Minor code changes
- Refactoring without behavior changes
- Test additions
- Style or formatting changes

## Questions?

- 📫 Open an issue for questions
- 💬 Start a discussion on GitHub Discussions
- 📖 Check existing documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License with the educational disclaimer as specified in the [LICENSE](LICENSE) file.

---

Thank you for contributing to OpenTCG Backend! 🎉
