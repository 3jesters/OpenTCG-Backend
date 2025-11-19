# OpenTCG Documentation Index

Complete guide to all documentation in this project.

---

## 📚 Overview

This project contains comprehensive documentation for both the **backend API** and the **frontend application** (to be built).

---

## 🔧 Backend Documentation

### [API.md](./API.md)
**Complete REST API reference for the OpenTCG Backend**

**Contains:**
- All 5 API endpoints with examples
- Request/response formats
- Data structures and enums
- Error handling
- Client implementation guide
- Example workflows

**Use this when:**
- Implementing API calls in the frontend
- Testing API endpoints
- Understanding backend capabilities
- Debugging API issues

**Quick Example:**
```bash
# Search for Pikachu cards
curl "http://localhost:3000/api/v1/cards/search?query=pikachu"
```

---

## 🎨 Frontend Documentation

### [FRONTEND-APP.md](./FRONTEND-APP.md)
**Complete guide for building the frontend application**

**Contains:**
- Application purpose and features
- All entities and TypeScript interfaces
- API integration details
- Architecture recommendations
- Component structure
- User flows
- Technical best practices

**Use this when:**
- Planning the frontend architecture
- Understanding data models
- Designing user flows
- Setting up the project
- Making architectural decisions

**Covers:**
- 9 core entities (CardSummary, CardDetail, CardSet, etc.)
- 5 API endpoints with TypeScript examples
- Complete project structure
- React Query integration
- State management strategies

**File Size:** ~26 KB (comprehensive guide)

---

### [FRONTEND-QUICK-REFERENCE.md](./FRONTEND-QUICK-REFERENCE.md)
**Quick reference for frontend developers**

**Contains:**
- Condensed entity definitions
- One-line API endpoint descriptions
- Code snippets ready to copy
- Color scheme recommendations
- Common enums
- Quick examples

**Use this when:**
- You need a quick lookup
- Copying type definitions
- Getting color values
- Finding endpoint URLs
- During active development

**Covers:**
- 3 core entities (simplified)
- 5 API endpoints (condensed)
- Type colors and rarity colors
- React Query hooks examples

**File Size:** ~4 KB (quick reference)

---

### [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md)
**Visual and code guide for UI components**

**Contains:**
- Component structures (ASCII art)
- Complete component code examples
- Styling with Tailwind CSS
- Layout examples
- Animation examples
- Responsive design patterns
- Accessibility checklist

**Use this when:**
- Building UI components
- Implementing designs
- Need component code templates
- Creating responsive layouts
- Ensuring accessibility

**Covers:**
- 8 major components (CardItem, CardDetail, SearchBar, etc.)
- 5 page layouts
- Responsive breakpoints
- CSS animations
- Accessibility requirements

**File Size:** ~16 KB (component guide)

---

## 📊 Documentation Comparison

| Document | Purpose | Size | Best For |
|----------|---------|------|----------|
| **API.md** | Backend API reference | Large | API integration, testing |
| **FRONTEND-APP.md** | Complete frontend guide | Large | Architecture, planning |
| **FRONTEND-QUICK-REFERENCE.md** | Developer cheat sheet | Small | Quick lookups, active dev |
| **FRONTEND-COMPONENT-GUIDE.md** | UI component guide | Medium | Building components, design |

---

## 🎯 Quick Start Guide

### For Backend Developers
1. Read [API.md](./API.md) to understand endpoints
2. Test endpoints with curl/Postman
3. Reference entity structures for responses

### For Frontend Developers (Planning Phase)
1. Start with [FRONTEND-APP.md](./FRONTEND-APP.md) - Read sections:
   - Purpose
   - Application Overview
   - Entities & Data Models
   - Backend API Integration
   - Frontend Architecture
2. Review [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) for UI design
3. Keep [FRONTEND-QUICK-REFERENCE.md](./FRONTEND-QUICK-REFERENCE.md) open during dev

### For Frontend Developers (Active Development)
1. Keep [FRONTEND-QUICK-REFERENCE.md](./FRONTEND-QUICK-REFERENCE.md) open
2. Reference [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) when building components
3. Use [API.md](./API.md) when implementing API calls

### For Designers
1. Read [FRONTEND-APP.md](./FRONTEND-APP.md) - Sections:
   - Application Overview (features)
   - User Flows
2. Review [FRONTEND-COMPONENT-GUIDE.md](./FRONTEND-COMPONENT-GUIDE.md) for component specs
3. Use type/rarity colors from FRONTEND-QUICK-REFERENCE.md

---

## 🗂️ What Each Document Covers

### API Endpoints (in API.md)
```
1. POST   /api/v1/cards/load                    - Load card sets
2. GET    /api/v1/cards/sets                    - List available sets
3. GET    /api/v1/cards/sets/:author/:name/v:v  - Get set cards
4. GET    /api/v1/cards/search                  - Search cards
5. GET    /api/v1/cards/:cardId                 - Get card details
```

### Core Entities (in all frontend docs)
```
1. CardSummary    - Lightweight card for grids/lists
2. CardDetail     - Full card information
3. CardSet        - Card set metadata
4. Ability        - Pokemon ability
5. Attack         - Pokemon attack
6. Weakness       - Type weakness
7. Resistance     - Type resistance
8. SearchFilters  - Search parameters
9. Enums          - CardType, PokemonType, Rarity, etc.
```

### UI Components (in FRONTEND-COMPONENT-GUIDE.md)
```
1. CardItem       - Card in grid
2. CardDetail     - Full card view
3. SearchBar      - Search input
4. FilterSidebar  - Filter options
5. SetCard        - Set display
6. TypeIcon       - Pokemon type icon
7. EnergyIcon     - Energy cost icon
8. RarityBadge    - Rarity indicator
```

### User Flows (in FRONTEND-APP.md)
```
1. Browse a Card Set    - Sets → Set Detail → Card Detail
2. Search for Cards     - Search → Filter → View Card
3. Load a New Set       - Admin: Load Set form
4. Filter by Type       - Search → Apply Filters → Results
```

---

## 📖 Reading Order by Role

### Product Manager
1. **FRONTEND-APP.md** - Sections:
   - Purpose
   - Application Overview
   - User Flows
2. **API.md** - Overview section

### Technical Architect
1. **FRONTEND-APP.md** - Sections:
   - Architecture
   - Technical Recommendations
2. **API.md** - Full read
3. **FRONTEND-COMPONENT-GUIDE.md** - Architecture patterns

### Frontend Developer
1. **FRONTEND-APP.md** - Full read (1st pass)
2. **FRONTEND-QUICK-REFERENCE.md** - Keep handy
3. **FRONTEND-COMPONENT-GUIDE.md** - Reference during implementation
4. **API.md** - Reference for API calls

### UI/UX Designer
1. **FRONTEND-APP.md** - Sections:
   - Application Overview
   - User Flows
2. **FRONTEND-COMPONENT-GUIDE.md** - Full read
3. **FRONTEND-QUICK-REFERENCE.md** - Color schemes

---

## 💡 Key Takeaways

### The Application
- **Type:** Web app for browsing TCG cards
- **Backend:** NestJS REST API (already built)
- **Frontend:** To be built (React or Next.js recommended)
- **Data:** Card sets loaded from JSON files

### The Entities
- **3 main entities:** CardSummary, CardDetail, CardSet
- **All entities** are TypeScript interfaces matching backend
- **9 enums** for types, rarity, stages, etc.

### The APIs
- **5 REST endpoints** for all operations
- **Base URL:** `http://localhost:3000/api/v1/cards`
- **No authentication** currently required
- **JSON responses** with standard error format

### The UI
- **8 core components** to build
- **5 main pages:** Home, Set Browser, Set Detail, Card Detail, Search
- **Responsive design** (mobile-first)
- **Type-based colors** for visual consistency
- **Accessibility** built-in

---

## 🔍 Search This Documentation

### Find by Topic

**Want to know about...**

| Topic | Look in |
|-------|---------|
| API endpoints | API.md |
| Entity structures | FRONTEND-APP.md or FRONTEND-QUICK-REFERENCE.md |
| Component code | FRONTEND-COMPONENT-GUIDE.md |
| User flows | FRONTEND-APP.md |
| Colors & styling | FRONTEND-QUICK-REFERENCE.md or FRONTEND-COMPONENT-GUIDE.md |
| Architecture | FRONTEND-APP.md |
| Quick lookups | FRONTEND-QUICK-REFERENCE.md |
| Layouts | FRONTEND-COMPONENT-GUIDE.md |

### Find by Keyword

**Search for these keywords:**

- `CardSummary` - Entity for card lists (in all frontend docs)
- `CardDetail` - Full card entity (in all frontend docs)
- `search` - Search endpoint or SearchBar component
- `filter` - FilterSidebar component or search filters
- `TypeIcon` - Type icon component
- `API` - API.md or API Integration sections
- `React Query` - FRONTEND-APP.md and FRONTEND-QUICK-REFERENCE.md
- `responsive` - FRONTEND-COMPONENT-GUIDE.md layouts
- `animation` - FRONTEND-COMPONENT-GUIDE.md animations
- `accessibility` - FRONTEND-COMPONENT-GUIDE.md checklist

---

## 🚀 Next Steps

### For Starting Frontend Development

1. **Set up project:**
   ```bash
   # Option 1: Vite + React
   npm create vite@latest opentcg-frontend -- --template react-ts
   
   # Option 2: Next.js
   npx create-next-app@latest opentcg-frontend --typescript
   ```

2. **Install dependencies:**
   ```bash
   npm install @tanstack/react-query axios
   npm install -D tailwindcss
   ```

3. **Copy type definitions** from FRONTEND-APP.md to `src/types/`

4. **Implement API client** using examples from FRONTEND-QUICK-REFERENCE.md

5. **Build components** using FRONTEND-COMPONENT-GUIDE.md

6. **Test with backend:**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run start:dev
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

---

## 📝 Updating This Documentation

### When to Update

**Update API.md when:**
- Adding/changing API endpoints
- Modifying request/response formats
- Adding new query parameters
- Changing error handling

**Update FRONTEND-APP.md when:**
- Adding new features
- Changing architecture
- Adding new entities
- Modifying user flows

**Update FRONTEND-QUICK-REFERENCE.md when:**
- API endpoints change
- Entity structures change
- Adding new enums
- Updating color schemes

**Update FRONTEND-COMPONENT-GUIDE.md when:**
- Adding new components
- Changing component APIs
- Updating layout patterns
- Adding new animations

---

## 🤝 Contributing

When contributing to this documentation:

1. **Keep it accurate** - Update docs when code changes
2. **Keep it consistent** - Follow existing format and style
3. **Keep it complete** - Include examples and explanations
4. **Keep it organized** - Use proper headings and structure

---

## 📞 Support

For questions or issues:

1. Check this index for the right document
2. Search within the document for your topic
3. Review code examples in FRONTEND-COMPONENT-GUIDE.md
4. Test endpoints with examples in API.md

---

**Last Updated:** November 19, 2025

**Documentation Version:** 1.0

**Backend Version:** Compatible with OpenTCG Backend v1.0

