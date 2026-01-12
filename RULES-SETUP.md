# Cursor Rules Setup Guide

This project uses a two-tier rules system to guide AI-assisted development:

## 📁 Files Overview

### 1. `cursor-global-rules.md` - Cursor IDE Global Rules
**Location**: Can be placed anywhere (recommended: keep in project root for reference)

**Purpose**: General NestJS development practices that apply across all your NestJS projects

**Contains**:
- AI Assistant Guidelines (TDD, DI, testing approach)
- Clean Code Practices (SOLID, type safety)
- NestJS Best Practices (decorators, patterns, DI)
- Database Best Practices (repository pattern, testing)
- Error Handling patterns
- Git Workflow standards
- Documentation guidelines
- Security best practices
- Performance guidelines

**How to Use**: 
1. Open Cursor IDE Settings
2. Go to "Cursor Settings" → "Rules for AI"
3. Copy the entire content of `cursor-global-rules.md`
4. Paste it into the global rules section

This will apply these practices to all your NestJS projects in Cursor.

---

### 2. `.cursorrules` - Project-Specific Rules
**Location**: `.cursorrules` (project root)

**Purpose**: Specific to the OpenTCG project architecture and structure

**Contains**:
- OpenTCG project overview
- Specific clean architecture layer definitions
- Exact project structure and folder organization
- Module documentation requirements (docs/ folder)
- Database entity separation patterns (domain vs ORM)
- Complete code examples for this project
- API design specifics for this backend
- Monolith architecture guidelines
- Configuration management
- Project-specific checklist

**How to Use**: 
- Already in place at project root
- Cursor IDE automatically reads `.cursorrules` from the project root
- No additional setup needed

---

## 🚀 Setup Instructions

### Step 1: Set Up Global Rules (One-time setup)
1. Open Cursor IDE
2. Go to **Settings** (Cmd/Ctrl + ,)
3. Search for **"Rules for AI"** or navigate to **Cursor Settings → Rules for AI**
4. Open `cursor-global-rules.md`
5. Copy the entire content
6. Paste into the Cursor global rules text area
7. Save

### Step 2: Verify Project Rules (Already done)
1. Confirm `.cursorrules` exists in project root: ✅
2. This file is automatically detected by Cursor

### Step 3: Start Coding!
When you use Cursor's AI features, it will now:
- Apply **global rules** (general NestJS best practices)
- Apply **project rules** (OpenTCG-specific architecture)

---

## 🎯 How It Works

When you interact with Cursor's AI in this project:

```
Your Request
     ↓
Cursor AI reads:
  1. Global Rules (cursor-global-rules.md - from IDE settings)
  2. Project Rules (.cursorrules - from project root)
     ↓
AI Response (following both rule sets)
```

### Example:
**You ask**: "Create a User module"

**AI will**:
- Follow TDD (write tests first) - from **global rules**
- Use dependency injection - from **global rules**
- Create the exact folder structure - from **project rules**:
  ```
  src/modules/user/
  ├── domain/
  ├── application/
  ├── infrastructure/
  ├── presentation/
  └── docs/
  ```
- Separate domain entities from ORM entities - from **project rules**
- Create repository interfaces in domain layer - from **project rules**
- Mock repositories in tests - from **global rules**

---

## 📝 Maintenance

### When to Update Global Rules
- When you learn new NestJS best practices
- When you want to change your general coding standards
- When adopting new testing patterns

### When to Update Project Rules (.cursorrules)
- When OpenTCG architecture changes
- When adding new module patterns
- When changing folder structure
- When updating API conventions for this project

---

## 🔍 Quick Test

To verify the rules are working:

1. Open any file in the project
2. Ask Cursor AI: "Create a new Product module with create and find operations"
3. Check if AI:
   - ✅ Writes tests first
   - ✅ Creates the correct folder structure (domain/application/infrastructure/presentation/docs)
   - ✅ Separates domain entities from ORM entities
   - ✅ Uses dependency injection
   - ✅ Creates repository interfaces

---

## 📚 Additional Notes

- **Global rules** are stored in Cursor's settings (apply to all projects)
- **Project rules** (`.cursorrules`) are stored in Git (apply to this project only)
- Both rule sets work together - they don't conflict, they complement each other
- You can have different `.cursorrules` files in different projects
- Team members should add the same global rules to their Cursor IDE for consistency

---

## ✅ You're All Set!

Your Cursor IDE is now configured to help you build the OpenTCG project following:
- ✅ Clean Architecture
- ✅ Test-Driven Development (TDD)
- ✅ Dependency Injection throughout
- ✅ NestJS Best Practices
- ✅ Open Source Standards

Happy coding! 🚀

