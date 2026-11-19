# AWS deployment

This deployment keeps the React site on private S3 behind CloudFront and runs the Express API as a single ECS/Fargate task behind an HTTPS Application Load Balancer. MongoDB Atlas is the production database. AWS resources must be provisioned in the target account before enabling the GitHub Actions workflow; the workflow deploys application artifacts but does not create a VPC, domains, certificates, or databases.

## Required AWS resources

1. **Network and API**
   - A VPC with public ALB subnets and private ECS subnets.
   - An HTTPS ALB listener with an ACM certificate and an HTTP listener that redirects to HTTPS.
   - An ECS/Fargate cluster and service with `desiredCount=1`, target port `5000`, and target health check path `/api/health`.
   - Configure the service deployment maximum to one task (`maximumPercent=100`, `minimumHealthyPercent=0`). The app uses an in-process repository cache and process-local transaction queue; multiple backend tasks are not currently safe. This setting trades a short deployment interruption for data consistency.
   - Restrict task ingress on port `5000` to the ALB security group. Allow task egress only to required dependencies, including MongoDB Atlas and EFS.
2. **Persistent local snapshot**
   - An encrypted EFS filesystem and access point mounted by the task at `/app/data`.
   - Configure the access point owner and permissions for UID/GID `1000`, matching the container's unprivileged `node` user.
   - Permit NFS port `2049` from the ECS task security group. Enable EFS transit encryption and IAM authorization.
   - EFS preserves the encrypted JSON snapshot and queued writes if MongoDB is temporarily unavailable and ECS replaces the task. The app's queue is not distributed; keep one backend task.
3. **MongoDB**
   - A TLS-enabled MongoDB replica set (MongoDB Atlas is supported) because the app uses multi-collection transactions.
   - Store the URI in AWS Secrets Manager. If Atlas uses IP access lists, route private subnet egress through a NAT Gateway with a stable Elastic IP and allowlist only that address.
4. **Static frontend**
   - A private, dedicated S3 bucket and CloudFront distribution using Origin Access Control (OAC); do not enable public S3 access.
   - Configure CloudFront to use `index.html` for the default root and SPA fallback (403/404 to `/index.html` with a 200 response) so client-side routes work.
   - Use a CloudFront HTTPS domain or custom domain for the site and a separate HTTPS API domain on the ALB.
   - Attach a CloudFront response headers policy for CSP, HSTS, frame/content-type protection, referrer policy, and permissions policy. Its `connect-src` must include the API origin; `style-src`, `font-src`, and `img-src` must allow the external font, Leaflet, OpenStreetMap tile, and Unsplash origins listed in `backend/middleware/securityHeaders.js`.
5. **Logs and IAM**
   - Create CloudWatch log group `/ecs/fds-api` with an appropriate retention period and encryption.
   - The ECS task execution role needs ECR pull, CloudWatch Logs write, and permission to read the five configured Secrets Manager secrets.
   - The ECS task role needs `elasticfilesystem:ClientMount` and `elasticfilesystem:ClientWrite` scoped to the EFS access point.
   - Configure a GitHub Actions OIDC provider and a deployment role restricted to this repository and the `main` branch. Grant it only the required ECR push, ECS task/service deploy, `iam:PassRole`, S3 sync, and CloudFront invalidation permissions.

## Runtime configuration

Create these Secrets Manager values (store each value as a plain secret string):

- `MONGODB_URI`: replica-set connection string.
- `JWT_SECRET`: unique random value of at least 32 bytes.
- `DATA_ENCRYPTION_KEY`: base64-encoded random 32-byte key.
- `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`: credentials for the single provisioned platform administrator. The password must be 12-72 UTF-8 bytes.

The ECS task definition sets `NODE_ENV=production`, `PORT=5000`, and `TRUST_PROXY=1`. This trusts the single ALB hop; do not expose the task directly to the internet. The health endpoint is permitted over the private target connection so ECS and the ALB can probe it; public user traffic must enter through the HTTPS listener.

Set:

- `FRONTEND_ORIGIN` to the exact CloudFront/site origin, including `https://` and no path.
- `VITE_API_BASE_URL` to the API origin, e.g. `https://api.example.com`, with no `/api` suffix. The frontend appends `/api`.

The task health check uses `/api/health`, and the application responds `426` to production requests that do not arrive securely (except health probes). Configure the ALB to terminate TLS and forward the original protocol header.

## GitHub Actions configuration

The workflow at `.github/workflows/deploy-aws.yml` runs backend tests and the frontend build on pushes to `main`. After they pass, it pushes a backend image to ECR, deploys the ECS task definition, uploads the frontend to S3, and invalidates CloudFront. It can also be started manually with `workflow_dispatch`.

Add the following repository/environment **variables**:

`AWS_REGION`, `AWS_ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_EXECUTION_ROLE_ARN`, `ECS_TASK_ROLE_ARN`, `EFS_FILESYSTEM_ID`, `EFS_ACCESS_POINT_ID`, `FRONTEND_ORIGIN`, `MONGODB_URI_SECRET_ARN`, `JWT_SECRET_ARN`, `DATA_ENCRYPTION_KEY_SECRET_ARN`, `PLATFORM_ADMIN_EMAIL_SECRET_ARN`, `PLATFORM_ADMIN_PASSWORD_SECRET_ARN`, `VITE_API_BASE_URL`, `S3_BUCKET`, and `CLOUDFRONT_DISTRIBUTION_ID`.

Add the OIDC role ARN as the GitHub Actions **secret** `AWS_DEPLOY_ROLE_ARN`. Do not put database credentials, admin passwords, encryption keys, or AWS access keys in repository files or build variables. The S3 bucket must be dedicated to this app because deployment sync uses `--delete`.

## Monitoring and operations

Use CloudWatch Logs for application errors. The template at `deploy/aws/monitoring-alarms.yaml` creates alarms for ECS CPU/memory, ALB target 5xx responses, p95 target latency, and healthy target count. Create an SNS topic first, then deploy the template with the ECS cluster/service names and ALB/target-group dimension values. Tune the latency threshold to an agreed SLA; the default is an example, not a measured guarantee. Also alert on EFS throughput/burst-credit exhaustion.

The app exposes `/api/health` for target health checks, but this endpoint does not measure end-to-end MongoDB readiness. Validate MongoDB replica-set health separately and test backup restoration before production use.

The existing in-memory cache, in-process transaction serialization, and rate limiter prevent safe horizontal scaling. A multi-task high-availability deployment requires moving domain reads/writes and coordination to shared, database-atomic services first. Do not increase ECS desired count until that work is complete.
