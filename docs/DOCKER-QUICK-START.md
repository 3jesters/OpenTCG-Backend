# Docker Quick Start Guide

## Prerequisites

1. **Docker Desktop** must be installed and running
   - Check if running: `docker ps`
   - If not running, start Docker Desktop application

2. **Create environment file** (`.env.staging`)

## Step-by-Step Setup

### 1. Create `.env.staging` file

Create a file named `.env.staging` in the project root:

```bash
# Copy this content to .env.staging
cat > .env.staging << 'EOF'
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=opentcg

# Application Configuration
NODE_ENV=staging
PORT=3000
EOF
```

Or manually create `.env.staging` with:

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=opentcg

# Application Configuration
NODE_ENV=staging
PORT=3000
```

### 2. Stop any existing containers

```bash
docker-compose down
```

### 3. Build and start services

```bash
docker-compose up -d --build
```

This will:
- Build the application Docker image
- Start PostgreSQL database
- Start the application
- Wait for database to be healthy before starting app

### 4. Check status

```bash
# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# View database logs only
docker-compose logs -f postgres
```

### 5. Verify it's working

```bash
# Check if app is responding
curl http://localhost:3000

# Or check in browser
open http://localhost:3000
```

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes data)
```bash
docker-compose down -v
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Access database
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d opentcg

# Or from your local machine (if psql is installed)
psql -h localhost -p 5432 -U postgres -d opentcg
```

### Restart a specific service
```bash
docker-compose restart app
docker-compose restart postgres
```

## Troubleshooting

### Port already in use

If port 3000 or 5432 is already in use:

1. Change ports in `.env.staging`:
   ```env
   PORT=3001
   DB_PORT=5433
   ```

2. Update `docker-compose.yml` port mappings accordingly

3. Restart: `docker-compose up -d`

### Application won't start

1. Check logs: `docker-compose logs app`
2. Rebuild: `docker-compose up -d --build`
3. Check if database is healthy: `docker-compose ps`

### Database connection issues

1. Verify database is running: `docker-compose ps postgres`
2. Check database logs: `docker-compose logs postgres`
3. Test connection: `docker-compose exec postgres pg_isready -U postgres`

### Clean start (removes all data)

```bash
# Stop and remove everything
docker-compose down -v

# Remove images (optional)
docker-compose rm -f

# Start fresh
docker-compose up -d --build
```

## What's Running?

When Docker Compose is running, you'll have:

- **PostgreSQL** on `localhost:5432`
- **Application** on `localhost:3000`
- **Docker network** connecting them internally

The application automatically uses `TypeOrmMatchRepository` (PostgreSQL) because `NODE_ENV=staging`.

