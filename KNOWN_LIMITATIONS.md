# Known Limitations and Future Improvements

This document tracks known limitations, missing features, and planned improvements for the OpenTCG Backend project.

## Authentication & Authorization

### Current State
- **No authentication system implemented**
- User ID is passed as query parameter (`?userId=xxx`) for testing
- No JWT tokens, sessions, or OAuth
- No role-based access control (RBAC)

### Affected Endpoints
- `POST /api/v1/sets?userId=xxx` - Create set
- `PUT /api/v1/sets/:id?userId=xxx` - Update set
- `DELETE /api/v1/sets/:id?userId=xxx` - Delete set
- `POST /api/v1/cards/editor/create?userId=xxx` - Create card

### Planned Implementation
- [ ] JWT-based authentication
- [ ] User registration and login endpoints
- [ ] Password hashing with bcrypt
- [ ] Role-based access control (admin, user, guest)
- [ ] Auth guards for protected routes
- [ ] Refresh token mechanism

### Workaround
For testing, append `?userId=<any-string>` to requests that require user identification.

---

## AI Player Features

### Current State
- Basic AI action generation implemented
- Simple decision-making logic

### Limitations
- **Ability evaluation**: AI doesn't fully evaluate card abilities when making decisions
  - Location: `src/modules/match/infrastructure/ai/ai-action-generator.service.ts:1040`
- **Switch/Retreat strategy**: Incomplete evaluation logic for switching Pokémon
  - Location: `src/modules/match/infrastructure/ai/services/trainer-card-analyzer.service.ts`
- **Bench knockout analysis**: Not yet implemented
  - Location: `src/modules/match/infrastructure/ai/services/opponent-analysis.service.ts:420`
- **Energy attachment prevention**: Abilities that prevent energy attachment not checked
  - Location: `src/modules/match/infrastructure/ai/services/energy-attachment-analyzer.service.ts:434`

### Planned Improvements
- [ ] Advanced ability evaluation system
- [ ] Strategic switch/retreat decision-making
- [ ] Bench threat assessment
- [ ] Energy attachment ability checking
- [ ] Difficulty levels (easy, medium, hard)
- [ ] Learning AI using machine learning

---

## Card System

### Current State
- Full card loading and management
- Card strength calculation algorithm
- Card editor API (in progress)

### Limitations
- **Condition value conversion**: String to ConditionValue conversion not fully implemented
  - Location: `src/modules/card/application/use-cases/preview-card.use-case.ts:286`
  - Location: `src/modules/card/application/use-cases/preview-set.use-case.ts:235`

### Planned Improvements
- [ ] Complete condition system implementation
- [ ] Card validation improvements
- [ ] Card image upload and storage
- [ ] Card versioning system
- [ ] Card balance suggestions

---

## Match System

### Current State
- Complete match gameplay implementation
- Turn-based mechanics
- Attack, ability, and trainer card support

### Limitations
- **Energy selection logic**: Energy cost payment could be more sophisticated
  - Location: `src/modules/match/application/handlers/handlers/attack-action-handler.ts:480`
- **Coin flip energy counting**: Doesn't filter by energy type
  - Location: `src/modules/match/domain/services/coin-flip/coin-flip-resolver.service.ts:70`

### Planned Improvements
- [ ] Smart energy selection (consider type effectiveness)
- [ ] Energy type filtering in coin flip calculations
- [ ] Match replay system
- [ ] Match spectator mode
- [ ] Match history and statistics

---

## Real-Time Features

### Current State
- REST API only
- Polling required for match updates

### Planned Implementation
- [ ] WebSocket support for real-time gameplay
- [ ] Live match updates
- [ ] Real-time notifications
- [ ] Multiplayer matchmaking
- [ ] Chat system

---

## Frontend

### Current State
- Backend API only
- No frontend application

### Planned Implementation
- [ ] React/Next.js frontend
- [ ] Card collection viewer
- [ ] Deck builder UI
- [ ] Match gameplay interface
- [ ] Tournament brackets visualization
- [ ] Admin dashboard

---

## API Documentation

### Current State
- Swagger/OpenAPI configured
- Basic endpoint documentation

### Improvements Needed
- [ ] Add @ApiTags decorators to all controllers
- [ ] Add @ApiOperation descriptions
- [ ] Add @ApiResponse examples
- [ ] Document all DTOs with @ApiProperty
- [ ] Add authentication decorators when implemented

---

## Testing

### Current State
- 80%+ test coverage
- Comprehensive E2E tests
- Unit tests for business logic

### Gaps
- Some AI service methods need more test coverage
- Integration tests for database layer
- Performance testing
- Load testing

### Planned Improvements
- [ ] Increase coverage to 90%+
- [ ] Add integration tests for all repositories
- [ ] Performance benchmarks
- [ ] Load testing suite
- [ ] Mutation testing

---

## Database

### Current State
- PostgreSQL with TypeORM
- JSON file fallback for dev/test
- Migration scripts available

### Limitations
- **Synchronize mode**: Currently uses `synchronize: true` in staging
  - Should use proper migrations in production
- No database seeding scripts
- No backup/restore utilities

### Planned Improvements
- [ ] Proper TypeORM migrations
- [ ] Database seeding scripts
- [ ] Backup and restore commands
- [ ] Database performance optimization
- [ ] Query optimization and indexing

---

## Security

### Current State
- Basic input validation with class-validator
- CORS enabled for all origins

### Improvements Needed
- [ ] Authentication and authorization
- [ ] Rate limiting
- [ ] Helmet middleware for security headers
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection
- [ ] API key management
- [ ] Audit logging

---

## Performance

### Current State
- Basic implementation
- No caching layer

### Planned Improvements
- [ ] Redis caching for frequently accessed data
- [ ] Database query optimization
- [ ] Pagination for large result sets
- [ ] Lazy loading for relationships
- [ ] CDN for static assets
- [ ] Response compression

---

## Deployment

### Current State
- Docker Compose for local development
- Basic Dockerfile

### Planned Improvements
- [ ] Kubernetes deployment manifests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production environment configuration
- [ ] Health check endpoints
- [ ] Monitoring and logging (Prometheus, Grafana)
- [ ] Error tracking (Sentry)
- [ ] Environment-specific configurations

---

## Documentation

### Current State
- README with setup instructions
- API documentation (Swagger)
- Module-level docs/ folders
- Architecture documentation

### Improvements Needed
- [ ] API usage examples
- [ ] Video tutorials
- [ ] Architecture diagrams
- [ ] Deployment guides
- [ ] Troubleshooting guide
- [ ] FAQ section

---

## Contributing

If you'd like to help address any of these limitations, please:

1. Check if there's an existing GitHub issue
2. If not, create a new issue referencing this document
3. Follow the [Contributing Guidelines](CONTRIBUTING.md)
4. Submit a pull request

---

## Priority Levels

### High Priority (Should implement soon)
- Authentication and authorization
- WebSocket support for real-time gameplay
- Proper database migrations
- Security improvements (rate limiting, helmet)

### Medium Priority (Nice to have)
- AI improvements
- Frontend application
- Performance optimizations
- Advanced testing

### Low Priority (Future enhancements)
- Machine learning AI
- Advanced analytics
- Mobile app
- Internationalization

---

**Last Updated**: January 2026

For questions or suggestions, please open a GitHub issue.
