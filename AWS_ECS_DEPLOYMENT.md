# AWS ECS Deployment Guide

This guide provides step-by-step instructions for deploying the OpenTCG Backend to AWS ECS (Elastic Container Service) using Fargate.

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- Docker installed and running
- AWS account with appropriate permissions
- Basic knowledge of AWS services (ECS, ECR, RDS, Secrets Manager, IAM)

## Architecture Overview

The deployment consists of:
- **ECR (Elastic Container Registry)**: Stores Docker images
- **ECS Fargate**: Runs containers without managing servers
- **RDS PostgreSQL**: Managed database service
- **Secrets Manager**: Stores sensitive configuration
- **CloudWatch Logs**: Application logging
- **VPC**: Network isolation (optional but recommended)

## Step-by-Step Deployment

### Step 1: Set Up Environment Variables

```bash
export AWS_REGION=eu-north-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/opentcg-backend
```

### Step 2: Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name opentcg-backend \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true
```

### Step 3: Build and Push Docker Image

Use the provided script:

```bash
chmod +x deploy-to-ecr.sh
./deploy-to-ecr.sh
```

Or manually:

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REPO_URI

# Build and tag
docker build -t opentcg-backend .
docker tag opentcg-backend:latest "${ECR_REPO_URI}:latest"

# Push
docker push "${ECR_REPO_URI}:latest"
```

### Step 4: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/opentcg-backend \
  --region $AWS_REGION
```

### Step 5: Set Up IAM Roles

Run the IAM setup script:

```bash
chmod +x setup-iam-roles.sh
./setup-iam-roles.sh
```

This creates:
- `ecsTaskExecutionRole`: For pulling images and writing logs
- `ecsTaskRole`: For application-level permissions
- Attaches necessary policies for ECR, CloudWatch Logs, and Secrets Manager

### Step 6: Create Secrets in AWS Secrets Manager

Run the secrets setup script:

```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

This will prompt you for:
- Database host (RDS endpoint)
- Database username
- Database password
- JWT secret
- Google OAuth credentials
- Frontend URL

**Note**: You'll need to create the RDS database first (see Step 7) to get the database host endpoint.

### Step 7: Create RDS PostgreSQL Database

#### Option A: Using AWS Console

1. Go to RDS → Databases → Create database
2. Choose **PostgreSQL** (version 15 or higher)
3. Template: **Free tier** (for testing) or **Production**
4. Settings:
   - DB instance identifier: `opentcg-db`
   - Master username: `postgres`
   - Master password: (choose a strong password - save this for Step 6)
5. Instance configuration: Choose appropriate size
6. Storage: Default settings
7. Connectivity:
   - VPC: Choose your VPC (or default)
   - Public access: **Yes** (for initial setup, restrict later)
   - Security group: Create new or use existing
8. Database name: `opentcg`
9. Create database

#### Option B: Using AWS CLI

```bash
# Create DB subnet group (if needed)
aws rds create-db-subnet-group \
  --db-subnet-group-name opentcg-subnet-group \
  --db-subnet-group-description "Subnet group for OpenTCG database" \
  --subnet-ids subnet-xxx subnet-yyy \
  --region $AWS_REGION

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier opentcg-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --db-name opentcg \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name opentcg-subnet-group \
  --publicly-accessible \
  --region $AWS_REGION
```

**Important**: Note the endpoint (e.g., `opentcg-db.xxxxx.eu-north-1.rds.amazonaws.com`) - you'll need this for the secrets.

### Step 8: Update Security Groups

Ensure your RDS security group allows inbound connections from your ECS tasks:

```bash
# Get your ECS security group ID (you'll create this in Step 10)
# Then add rule to RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id <rds-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-security-group-id> \
  --region $AWS_REGION
```

### Step 9: Register ECS Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION
```

Verify it was created:

```bash
aws ecs describe-task-definition \
  --task-definition opentcg-backend \
  --region $AWS_REGION
```

### Step 10: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name opentcg-cluster \
  --region $AWS_REGION
```

### Step 11: Set Up VPC and Networking

You need:
- A VPC (or use default)
- At least 2 subnets in different availability zones
- A security group for ECS tasks

#### Get Default VPC and Subnets

```bash
# Get default VPC
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $AWS_REGION)
echo "VPC ID: $VPC_ID"

# Get subnets
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region $AWS_REGION)
echo "Subnet IDs: $SUBNET_IDS"
```

#### Create Security Group

```bash
# Create security group for ECS tasks
SG_ID=$(aws ec2 create-security-group \
  --group-name opentcg-ecs-sg \
  --description "Security group for OpenTCG ECS tasks" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' --output text)

echo "Security Group ID: $SG_ID"

# Allow inbound HTTP traffic (if using ALB, restrict to ALB security group)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION
```

### Step 12: Create ECS Service

```bash
# Convert subnet IDs to array format
SUBNET_1=$(echo $SUBNET_IDS | cut -d' ' -f1)
SUBNET_2=$(echo $SUBNET_IDS | cut -d' ' -f2)

aws ecs create-service \
  --cluster opentcg-cluster \
  --service-name opentcg-backend \
  --task-definition opentcg-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region $AWS_REGION
```

### Step 13: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster opentcg-cluster \
  --services opentcg-backend \
  --region $AWS_REGION

# Get task details
TASK_ARN=$(aws ecs list-tasks \
  --cluster opentcg-cluster \
  --service-name opentcg-backend \
  --region $AWS_REGION \
  --query 'taskArns[0]' --output text)

aws ecs describe-tasks \
  --cluster opentcg-cluster \
  --tasks $TASK_ARN \
  --region $AWS_REGION

# View logs
aws logs tail /ecs/opentcg-backend --follow --region $AWS_REGION
```

### Step 14: (Optional) Set Up Application Load Balancer

For production, set up an ALB:

1. Create ALB in AWS Console
2. Create target group pointing to port 3000
3. Update ECS service to use ALB
4. Configure health checks

## Troubleshooting

### Container Fails to Start

1. Check CloudWatch Logs:
   ```bash
   aws logs tail /ecs/opentcg-backend --follow
   ```

2. Check task status:
   ```bash
   aws ecs describe-tasks --cluster opentcg-cluster --tasks <task-arn>
   ```

3. Common issues:
   - Missing secrets in Secrets Manager
   - Incorrect IAM role permissions
   - Database connection issues (check security groups)
   - Health check failures

### Database Connection Issues

1. Verify RDS endpoint is correct in secrets
2. Check security groups allow traffic from ECS to RDS
3. Verify database credentials in Secrets Manager
4. Test connection from ECS task (use AWS Systems Manager Session Manager)

### Image Pull Errors

1. Verify ECR repository exists
2. Check IAM role has `ecr:GetAuthorizationToken` and `ecr:BatchGetImage` permissions
3. Verify image was pushed successfully

## Updating the Deployment

### Update Docker Image

```bash
# Build and push new image
./deploy-to-ecr.sh

# Force new deployment
aws ecs update-service \
  --cluster opentcg-cluster \
  --service opentcg-backend \
  --force-new-deployment \
  --region $AWS_REGION
```

### Update Task Definition

1. Edit `task-definition.json`
2. Register new revision:
   ```bash
   aws ecs register-task-definition \
     --cli-input-json file://task-definition.json \
     --region $AWS_REGION
   ```
3. Update service to use new revision:
   ```bash
   aws ecs update-service \
     --cluster opentcg-cluster \
     --service opentcg-backend \
     --task-definition opentcg-backend \
     --region $AWS_REGION
   ```

## Cost Estimation

Approximate monthly costs (varies by region and usage):

- **ECS Fargate**: ~$15-30/month (512 CPU, 1GB RAM, 1 task)
- **RDS PostgreSQL**: ~$15-50/month (db.t3.micro, depends on storage)
- **ECR**: ~$0.10/month (storage)
- **CloudWatch Logs**: ~$0.50/month (first 5GB free)
- **Secrets Manager**: ~$0.40/month per secret

**Total**: ~$30-80/month for basic setup

## Security Best Practices

1. **Use private subnets** for ECS tasks (with NAT Gateway)
2. **Restrict RDS access** to ECS security group only
3. **Enable encryption** for RDS and Secrets Manager
4. **Use least privilege** IAM roles
5. **Enable VPC Flow Logs** for monitoring
6. **Regularly rotate secrets**
7. **Use AWS WAF** if exposing via ALB
8. **Enable CloudTrail** for audit logging

## Next Steps

- Set up CI/CD pipeline (GitHub Actions, AWS CodePipeline)
- Configure auto-scaling
- Set up monitoring and alerts (CloudWatch Alarms)
- Configure custom domain with Route 53
- Set up SSL/TLS certificate (ACM)
- Configure backup strategy for RDS

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
