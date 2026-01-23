#!/bin/bash

# Setup AWS Secrets Manager for ECS Deployment
# This script creates all required secrets in AWS Secrets Manager

set -e

AWS_REGION=eu-north-1
AWS_ACCOUNT_ID=766050776668

echo "🔐 Setting up AWS Secrets Manager secrets..."
echo ""

# Function to create or update secret
create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2
  local description=$3
  
  echo "📝 Processing secret: $secret_name"
  
  # Check if secret exists
  if aws secretsmanager describe-secret --secret-id "opentcg/$secret_name" --region $AWS_REGION &>/dev/null; then
    echo "  ⚠️  Secret already exists, updating..."
    aws secretsmanager update-secret \
      --secret-id "opentcg/$secret_name" \
      --secret-string "$secret_value" \
      --region $AWS_REGION > /dev/null
    echo "  ✅ Updated secret: opentcg/$secret_name"
  else
    echo "  ➕ Creating new secret..."
    aws secretsmanager create-secret \
      --name "opentcg/$secret_name" \
      --secret-string "$secret_value" \
      --description "$description" \
      --region $AWS_REGION > /dev/null
    echo "  ✅ Created secret: opentcg/$secret_name"
  fi
  echo ""
}

# Prompt for secrets (with option to skip if already set)
echo "Please provide the following secrets. Press Enter to skip if already created."
echo ""

# Database Configuration
read -p "Enter RDS Database Host (e.g., opentcg-db.xxxxx.eu-north-1.rds.amazonaws.com): " DB_HOST
if [ -n "$DB_HOST" ]; then
  create_or_update_secret "db-host" "$DB_HOST" "RDS PostgreSQL database host endpoint"
fi

read -p "Enter Database Username (default: postgres): " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-postgres}
create_or_update_secret "db-username" "$DB_USERNAME" "RDS PostgreSQL database username"

read -sp "Enter Database Password: " DB_PASSWORD
echo ""
if [ -n "$DB_PASSWORD" ]; then
  create_or_update_secret "db-password" "$DB_PASSWORD" "RDS PostgreSQL database password"
fi

# JWT Secret
read -sp "Enter JWT Secret (generate a strong random string): " JWT_SECRET
echo ""
if [ -n "$JWT_SECRET" ]; then
  create_or_update_secret "jwt-secret" "$JWT_SECRET" "JWT signing secret for authentication tokens"
fi

# Google OAuth Configuration
read -p "Enter Google OAuth Client ID: " GOOGLE_CLIENT_ID
if [ -n "$GOOGLE_CLIENT_ID" ]; then
  create_or_update_secret "google-client-id" "$GOOGLE_CLIENT_ID" "Google OAuth 2.0 Client ID"
fi

read -sp "Enter Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
echo ""
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  create_or_update_secret "google-client-secret" "$GOOGLE_CLIENT_SECRET" "Google OAuth 2.0 Client Secret"
fi

read -p "Enter Google OAuth Callback URL (e.g., https://api.yourdomain.com/api/v1/auth/google/callback): " GOOGLE_CALLBACK_URL
if [ -n "$GOOGLE_CALLBACK_URL" ]; then
  create_or_update_secret "google-callback-url" "$GOOGLE_CALLBACK_URL" "Google OAuth callback URL"
fi

# Frontend URL
read -p "Enter Frontend URL (e.g., https://yourdomain.com): " FRONTEND_URL
if [ -n "$FRONTEND_URL" ]; then
  create_or_update_secret "frontend-url" "$FRONTEND_URL" "Frontend application URL for CORS and OAuth redirects"
fi

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "All secrets are stored in AWS Secrets Manager with the prefix: opentcg/"
echo "Secret ARNs (for reference):"
echo "  DB Host: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/db-host"
echo "  DB Username: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/db-username"
echo "  DB Password: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/db-password"
echo "  JWT Secret: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/jwt-secret"
echo "  Google Client ID: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/google-client-id"
echo "  Google Client Secret: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/google-client-secret"
echo "  Google Callback URL: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/google-callback-url"
echo "  Frontend URL: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/frontend-url"
echo ""
echo "Note: These ARNs are already configured in your task-definition.json"
