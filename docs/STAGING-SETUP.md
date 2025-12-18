# Staging Environment Setup Guide

This guide explains how to set up and deploy the OpenTCG backend in a staging environment using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Access to the repository

## Environment Variables

Create a `.env.staging` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_DATABASE=opentcg

# Application Configuration
NODE_ENV=staging
PORT=3000
```

**Important**: Never commit `.env.staging` to version control. Use `.env.staging.example` as a template.

## Docker Deployment

### Starting Services

1. Ensure you have the `.env.staging` file configured
2. Build and start all services:

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database container
- Build and start the application container
- Set up networking between services
- Create persistent volumes for database data

### Stopping Services

```bash
docker-compose down
```

To also remove volumes (⚠️ this deletes database data):

```bash
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Rebuilding After Code Changes

```bash
docker-compose up -d --build
```

## Database Access

The PostgreSQL database is accessible at:
- **Host**: `localhost` (from host machine) or `postgres` (from Docker network)
- **Port**: `5432` (or value from `DB_PORT` in `.env.staging`)
- **Database**: `opentcg` (or value from `DB_DATABASE` in `.env.staging`)

### Connecting from Host Machine

```bash
psql -h localhost -p 5432 -U postgres -d opentcg
```

### Database Migrations

TypeORM will automatically synchronize the schema when `NODE_ENV=staging` (synchronize is enabled for staging). For production, you should use proper migrations.

## Repository Strategy

The application automatically uses:
- **FileSystemMatchRepository** when `NODE_ENV=dev` or `NODE_ENV=test`
- **TypeOrmMatchRepository** when `NODE_ENV=staging` or `NODE_ENV=production`

In staging, matches are stored in PostgreSQL using the `TypeOrmMatchRepository`.

## Troubleshooting

### Database Connection Issues

1. Check that PostgreSQL container is healthy:
   ```bash
   docker-compose ps
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify environment variables are set correctly:
   ```bash
   docker-compose exec app env | grep DB_
   ```

### Application Won't Start

1. Check application logs:
   ```bash
   docker-compose logs app
   ```

2. Verify the application can connect to the database:
   ```bash
   docker-compose exec app node -e "console.log(process.env.DB_HOST)"
   ```

### Port Already in Use

If port 3000 is already in use, change the `PORT` value in `.env.staging` and update the port mapping in `docker-compose.yml`.

## Data Persistence

Database data is persisted in a Docker volume named `postgres_data`. This volume persists even when containers are stopped or removed (unless you use `docker-compose down -v`).

To backup the database:

```bash
docker-compose exec postgres pg_dump -U postgres opentcg > backup.sql
```

To restore:

```bash
docker-compose exec -T postgres psql -U postgres opentcg < backup.sql
```

