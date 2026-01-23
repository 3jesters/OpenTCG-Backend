#!/bin/bash

# Setup IAM Roles for ECS Deployment
# This script creates the necessary IAM roles for ECS Fargate tasks

set -e

AWS_REGION=eu-north-1
AWS_ACCOUNT_ID=766050776668

echo "🔐 Setting up IAM roles for ECS deployment..."

# Step 1: Create ECS Task Execution Role
echo "📝 Creating ECS Task Execution Role..."

# Create trust policy for ECS tasks
cat > /tmp/ecs-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
  2>&1 | grep -q "EntityAlreadyExists" && echo "  ⚠️  Role ecsTaskExecutionRole already exists" || echo "  ✅ Created ecsTaskExecutionRole"

# Attach AWS managed policy for ECS task execution
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

echo "  ✅ Attached AmazonECSTaskExecutionRolePolicy"

# Step 2: Create ECS Task Role (for application permissions)
echo "📝 Creating ECS Task Role..."

# Create the task role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
  2>&1 | grep -q "EntityAlreadyExists" && echo "  ⚠️  Role ecsTaskRole already exists" || echo "  ✅ Created ecsTaskRole"

# Create a policy for Secrets Manager access
cat > /tmp/secrets-manager-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:opentcg/*"
    }
  ]
}
EOF

# Create and attach custom policy for Secrets Manager
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document file:///tmp/secrets-manager-policy.json

echo "  ✅ Attached Secrets Manager access policy to ecsTaskExecutionRole"

# Clean up temp files
rm -f /tmp/ecs-trust-policy.json /tmp/secrets-manager-policy.json

echo ""
echo "✅ IAM roles setup complete!"
echo ""
echo "Role ARNs:"
echo "  Execution Role: arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole"
echo "  Task Role: arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole"
echo ""
echo "These ARNs are already configured in your task-definition.json"
