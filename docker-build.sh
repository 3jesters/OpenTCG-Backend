#!/bin/bash
# Helper script to build Docker images with BuildKit enabled for faster builds

# Enable BuildKit for cache mounts
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Run docker-compose with the provided arguments
docker-compose "$@"









