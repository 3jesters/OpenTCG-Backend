#!/bin/bash

# AWS ECR Deployment Script for OpenTCG Backend
# This script builds, tags, and pushes the Docker image to AWS ECR

set -e  # Exit on error

# Configuration
AWS_REGION=eu-north-1
AWS_ACCOUNT_ID=766050776668
REPOSITORY_NAME=opentcg-backend
IMAGE_NAME=opentcg-backend

# Set ECR repository URI
ECR_REPO_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPOSITORY_NAME}

echo "🚀 Starting ECR deployment..."
echo "Repository URI: ${ECR_REPO_URI}"

# Step 1: Get ECR login token
echo "📝 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REPO_URI} || {
  echo "⚠️  Docker credential helper error (this is common on macOS)"
  echo "   The login may still work. Continuing..."
}

# Step 2: Build the Docker image
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Step 3: Tag the image
echo "🏷️  Tagging image..."
docker tag ${IMAGE_NAME}:latest "${ECR_REPO_URI}:latest"

# Step 4: Push the image
echo "📤 Pushing image to ECR..."
docker push "${ECR_REPO_URI}:latest"

echo "✅ Successfully pushed ${ECR_REPO_URI}:latest"
echo ""
echo "Next steps:"
echo "1. Create/update your ECS task definition with this image"
echo "2. Update your ECS service to use the new task definition"
