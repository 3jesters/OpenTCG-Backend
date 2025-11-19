# Testing Pattern Validation

## Overview

This document validates that all tests in the OpenTCG Backend follow the **critical testing principle**: 

> **Mock ONLY external dependencies - NEVER mock the business logic being tested**

---

## Validation Results ✅

### ✅ Domain Entity Tests (100% Compliant)

**File:** `src/modules/card/domain/entities/card.entity.spec.ts`

```typescript
describe('Card Entity', () => {
  let card: Card;

  beforeEach(() => {
    // ✅ Creating REAL Card entity instance
    card = new Card(...);
  });

  it('should set card rules successfully', () => {
    const rules = [CardRuleFactory.cannotRetreat()];
    
    // ✅ Testing REAL business logic method
    card.setCardRules(rules);
    
    expect(card.cardRules).toHaveLength(1);
  });
});
```

**Validation:** ✅ PASS
- Creates real Card entity instances
- Tests real business logic methods directly
- No mocking of business logic

---

### ✅ Domain Service Tests (100% Compliant)

**File:** `src/modules/card/domain/services/ability-effect.validator.spec.ts`

```typescript
describe('AbilityEffectValidator', () => {
  it('should validate heal amount', () => {
    // ✅ Testing REAL validator logic directly
    expect(() => {
      AbilityEffectValidator.validate({
        effectType: AbilityEffectType.HEAL,
        target: TargetType.SELF,
        amount: 0
      });
    }).toThrow('Heal amount must be at least 1');
  });
});
```

**Validation:** ✅ PASS
- Tests real validator service directly
- No mocking of validation logic
- Validates real business rules

---

### ✅ Use Case Tests (100% Compliant)

**File:** `src/modules/card/application/use-cases/get-card-by-id.use-case.spec.ts`

```typescript
describe('GetCardByIdUseCase', () => {
  let useCase: GetCardByIdUseCase;
  let mockCardCache: jest.Mocked<ICardCache>; // ✅ Mock external dependency

  beforeEach(() => {
    mockCardCache = {
      getCard: jest.fn(),
      getAllCards: jest.fn(),
      // ... other interface methods
    };
    
    // ✅ Create REAL use case instance with mocked dependencies
    useCase = new GetCardByIdUseCase(mockCardCache);
  });

  it('should throw NotFoundException when card does not exist', async () => {
    // ✅ Mock returns data from external dependency
    mockCardCache.getCard.mockReturnValue(null);
    
    // ✅ Test REAL business logic in use case
    await expect(useCase.execute('non-existent-id')).rejects.toThrow(
      NotFoundException
    );
  });

  it('should return card details for existing card', async () => {
    // ✅ Mock returns real domain entity
    const mockCard = Card.createPokemonCard(...);
    mockCardCache.getCard.mockReturnValue(mockCard);
    
    // ✅ Test REAL use case logic
    const result = await useCase.execute('pokemon-base-set-v1.0-pikachu-25');
    
    expect(result.card.cardId).toBe('pokemon-base-set-v1.0-pikachu-25');
  });
});
```

**Validation:** ✅ PASS
- Mocks ONLY external dependencies (ICardCache interface)
- Creates REAL use case instances
- Tests REAL business logic in the use case
- Uses REAL domain entities for test data

---

**File:** `src/modules/card/application/use-cases/load-cards-from-file.use-case.spec.ts`

```typescript
describe('LoadCardsFromFileUseCase', () => {
  let useCase: LoadCardsFromFileUseCase;
  let mockFileReader: jest.Mocked<IFileReader>;     // ✅ Mock file system
  let mockCardCache: jest.Mocked<ICardCache>;       // ✅ Mock cache

  beforeEach(() => {
    mockFileReader = {
      readCardFile: jest.fn(),
      fileExists: jest.fn(),
    };

    mockCardCache = {
      loadCards: jest.fn(),
      isSetLoaded: jest.fn(),
      // ...
    };

    // ✅ Create REAL use case with mocked dependencies
    useCase = new LoadCardsFromFileUseCase(mockFileReader, mockCardCache);
  });

  it('should load cards from a valid file', async () => {
    mockFileReader.readCardFile.mockResolvedValue(mockFileData);
    mockCardCache.isSetLoaded.mockReturnValue(false);

    // ✅ Test REAL business logic
    const result = await useCase.execute('pokemon', 'base-set', '1.0');

    expect(result.success).toBe(true);
    expect(result.loaded).toBe(1);
  });
});
```

**Validation:** ✅ PASS
- Mocks ONLY external dependencies (file reader, cache)
- Creates REAL use case instances
- Tests REAL business logic

---

### ✅ Controller Tests (100% Compliant)

**File:** `src/modules/card/presentation/controllers/card.controller.spec.ts`

```typescript
describe('CardController', () => {
  let controller: CardController;
  let mockLoadCardsUseCase: jest.Mocked<LoadCardsFromFileUseCase>;
  let mockGetCardByIdUseCase: jest.Mocked<GetCardByIdUseCase>;
  // ... other use cases

  beforeEach(() => {
    // ✅ Mock use case dependencies (presentation layer mocks application layer)
    mockLoadCardsUseCase = {
      execute: jest.fn(),
    } as any;

    // ✅ Create REAL controller with mocked use cases
    controller = new CardController(
      mockLoadCardsUseCase,
      mockGetLoadedSetsUseCase,
      mockGetCardsFromSetUseCase,
      mockGetCardByIdUseCase,
      mockSearchCardsUseCase,
    );
  });

  it('should load cards successfully', async () => {
    const request = { sets: [{ author: 'pokemon', setName: 'Base Set', version: '1.0' }] };
    mockLoadCardsUseCase.execute.mockResolvedValue({...});

    // ✅ Test REAL controller logic
    const result = await controller.loadCards(request);

    expect(result.success).toBe(true);
  });
});
```

**Validation:** ✅ PASS
- Mocks ONLY use case dependencies (application layer)
- Creates REAL controller instances
- Tests REAL HTTP handling logic

**NOTE:** Controllers can mock use cases because controllers are the presentation layer testing how they delegate to the application layer. The use cases themselves must not be mocked in their own tests.

---

## Testing Pattern Summary

### What We Mock (External Dependencies)

| Dependency Type | Example | Why Mock? |
|----------------|---------|-----------|
| Repository Interfaces | `ICardCache`, `IUserRepository` | Database access - external I/O |
| File System | `IFileReader` | File system access - external I/O |
| External APIs | HTTP clients, third-party services | Network calls - external I/O |
| Config | `ConfigService` | Environment-specific |

### What We DON'T Mock (Business Logic)

| Component Type | Example | Why NOT Mock? |
|---------------|---------|---------------|
| Domain Entities | `Card`, `User` | Contains business logic we must test |
| Value Objects | `Attack`, `Ability`, `Weakness` | Contains validation logic we must test |
| Domain Services | `AbilityEffectValidator` | Contains domain rules we must test |
| Use Cases | `GetCardByIdUseCase` | Contains application logic we must test |

---

## Testing Anti-Patterns to Avoid ❌

### ❌ Anti-Pattern 1: Mocking the Class Under Test

```typescript
// ❌ WRONG
describe('GetCardByIdUseCase', () => {
  let useCase: jest.Mocked<GetCardByIdUseCase>;

  beforeEach(() => {
    useCase = {
      execute: jest.fn(), // ❌ Mocking the business logic!
    } as any;
  });

  it('should return card', async () => {
    useCase.execute.mockResolvedValue({ card: {...} });
    
    // ❌ You're testing the mock, not the real logic!
    const result = await useCase.execute('id');
    expect(result.card).toBeDefined();
  });
});
```

**Why it's wrong:** You're testing the mock's behavior, not your actual business logic. If your real implementation has bugs, these tests won't catch them.

---

### ❌ Anti-Pattern 2: Mocking Domain Entity Methods

```typescript
// ❌ WRONG
describe('Card Entity', () => {
  it('should set HP', () => {
    const card = {
      setHp: jest.fn(), // ❌ Mocking business logic method!
    } as any;

    card.setHp(100);
    
    // ❌ You're not testing the real validation!
    expect(card.setHp).toHaveBeenCalledWith(100);
  });
});
```

**Why it's wrong:** The real `setHp` method might have validation logic (e.g., HP must be positive). This test doesn't validate that logic.

---

### ❌ Anti-Pattern 3: Mocking Domain Services

```typescript
// ❌ WRONG
describe('AbilityEffectValidator', () => {
  it('should validate', () => {
    const validator = {
      validate: jest.fn(), // ❌ Mocking the validator!
    };

    validator.validate(effect);
    
    // ❌ You're not testing real validation rules!
    expect(validator.validate).toHaveBeenCalled();
  });
});
```

**Why it's wrong:** You're not testing the actual validation rules. The validator might have bugs that go undetected.

---

## How to Validate Your Tests

### Checklist for Every Test File:

1. **Identify external dependencies**
   - [ ] Database/repository interfaces?
   - [ ] File system access?
   - [ ] External API calls?
   - [ ] Third-party services?

2. **Mock external dependencies ONLY**
   - [ ] Created mock interfaces with `jest.fn()`
   - [ ] Mocks return realistic test data
   - [ ] No mocks of the class being tested

3. **Test real business logic**
   - [ ] Real instance of class under test created
   - [ ] Real methods called (not mocked)
   - [ ] Real validation/business rules exercised
   - [ ] Real exceptions thrown and caught

4. **Verify test value**
   - [ ] Test would fail if business logic is broken
   - [ ] Test would fail if validation is removed
   - [ ] Test would fail if edge cases aren't handled

---

## Quick Test Review Commands

```bash
# Find all test files
find src -name "*.spec.ts"

# Search for potential anti-patterns (mocking use cases in their own tests)
grep -r "jest.Mocked<.*UseCase>" src/modules/**/use-cases/*.spec.ts

# Search for potential anti-patterns (mocking entities in their own tests)
grep -r "jest.Mocked<.*Entity>" src/modules/**/entities/*.spec.ts

# Verify we're creating real instances
grep -r "new.*UseCase" src/modules/**/use-cases/*.spec.ts
```

---

## Conclusion

✅ **All tests in OpenTCG Backend follow the correct pattern:**

1. Mock ONLY external dependencies (repositories, file system, APIs)
2. Test REAL business logic (entities, services, use cases)
3. Use REAL domain objects for test data
4. Validate REAL business rules and edge cases

This ensures our tests have **real value** and will catch actual bugs in our business logic.

---

**Last Validated:** November 19, 2025

**Status:** ✅ ALL TESTS COMPLIANT

**Test Files Reviewed:** 15+
- Domain entity tests: ✅
- Domain service tests: ✅
- Use case tests: ✅
- Controller tests: ✅
- Infrastructure tests: ✅

