# MyMedic Deployment Guide

## Tech Stack Summary

**Backend:**
- Node.js 18+ (TypeScript, Express)
- PostgreSQL 15+ (Event-sourced CQRS)
- Event store with monthly partitioning

**Frontend:**
- React 18 + Vite
- TailwindCSS, Zustand, React Router

---

## Recommended Deployment Strategy

### 🏆 **Best Overall: Hybrid Approach (Recommended)**

| Component | Platform | Cost (est.) | Why |
|-----------|----------|-------------|-----|
| **Frontend** | Vercel/Netlify | Free - $20/mo | Zero-config React deployment, CDN, automatic SSL |
| **Backend** | Railway/Render | $5-10/mo | Easy Node.js hosting, auto-deploy from Git |
| **Database** | Railway Postgres | $5-10/mo | Managed PostgreSQL 15+, auto-backups |

**Total: $10-30/month**

### Setup Steps:

#### 1. **Frontend → Vercel** (Free tier sufficient)
```bash
# Install Vercel CLI
npm i -g vercel

# From frontend directory
cd frontend
vercel --prod
```

**Configuration:**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: Set `VITE_API_URL` to backend URL

---

#### 2. **Backend + Database → Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# From backend directory
cd backend
railway login
railway init
railway up
```

**Add PostgreSQL:**
```bash
railway add --database postgresql
```

**Environment Variables (Railway Dashboard):**
```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-injected
JWT_SECRET=<generate-strong-secret>
PORT=3000
LOG_LEVEL=info

# Event Sourcing
SNAPSHOT_FREQUENCY=100
PROJECTION_BATCH_SIZE=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Run schema migration:**
```bash
railway run psql $DATABASE_URL -f ../schema.sql
```

---

## Alternative Options

### 🚀 **If Scaling is Priority: AWS/GCP**

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel/Cloudflare Pages | Free - $20 |
| Backend | AWS App Runner / GCP Cloud Run | ~$15-30 |
| Database | AWS RDS PostgreSQL / GCP Cloud SQL | ~$25-50 |
| **Total** | | **$40-100/month** |

**Pros:** Better for HIPAA compliance, more control, autoscaling
**Cons:** More complex setup, higher cost

---

### 💰 **Ultra-Budget: All-in-One PaaS**

**Render (One Platform for Everything):**
- Static site (Frontend): Free
- Web service (Backend): $7/mo
- PostgreSQL: $7/mo
- **Total: $14/month**

**Setup:**
```yaml
# render.yaml (in root)
services:
  - type: web
    name: mymedic-backend
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mymedic-db
          property: connectionString
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: LOG_LEVEL
        value: info

  - type: web
    name: mymedic-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://mymedic-backend.onrender.com

databases:
  - name: mymedic-db
    databaseName: mymedic_prod
    user: mymedic
```

---

## Important Considerations for Medical Applications

### 1. **HIPAA Compliance** (if required)
- Use **AWS** or **GCP** with BAA (Business Associate Agreement)
- Recommended: AWS RDS + Elastic Beanstalk or GCP Cloud SQL + Cloud Run
- Cost: ~$100-200/month minimum for compliant infrastructure

**HIPAA-Compliant Setup:**
- **AWS**: RDS (encrypted at rest), VPC, CloudTrail, KMS
- **GCP**: Cloud SQL (encrypted), VPC Service Controls, Audit Logs
- **Azure**: Azure Database for PostgreSQL, Azure App Service with compliance

### 2. **Database Performance**
Your event-sourced architecture needs:
- ✅ PostgreSQL 15+ (all options support this)
- ✅ Good disk I/O (for event store partitions)
- ✅ Regular backups (critical for medical data)

**Railway/Render**: Adequate for small-medium clinics (<1000 patients)
**AWS RDS**: Better for large hospitals (>1000 patients, high write volume)

### 3. **Event Store Partitioning**
Your schema has monthly partitions. Ensure:
```sql
-- Automate partition creation
-- Add to cron or Railway scheduled job
SELECT ensure_event_store_partitions();
```

Set up a **Railway Cron Plugin** or **AWS EventBridge** to run this monthly.

**Railway Cron Setup:**
```bash
# Create a cron service in Railway
railway add --service cron

# Add to package.json scripts:
"cron:partitions": "ts-node src/scripts/ensure-partitions.ts"

# Railway will run this on schedule
```

---

## Deployment Recommendations by Scale

### **For MVP/Small Clinic (1-5 doctors)**
```
Frontend: Vercel (Free)
Backend: Railway ($7/mo)
Database: Railway Postgres ($7/mo)
Total: $14/month + free tier

Estimated capacity:
- 50-100 patients
- 10-20 appointments/day
- 1-5 concurrent users
```

### **For Growing Practice (5-20 doctors)**
```
Frontend: Vercel Pro ($20/mo)
Backend: Railway Pro ($20/mo)
Database: Railway Postgres with backups ($20/mo)
Total: $60/month

Estimated capacity:
- 500-1000 patients
- 50-100 appointments/day
- 5-20 concurrent users
```

### **For Hospital/Compliance Required**
```
Frontend: Cloudflare Pages (Free) or AWS S3+CloudFront ($5-10)
Backend: AWS App Runner or ECS Fargate ($30-50)
Database: AWS RDS PostgreSQL with Multi-AZ ($50-100)
Monitoring: AWS CloudWatch ($10-20)
Backups: AWS Backup ($10-20)
Total: $100-200/month

Estimated capacity:
- 5000+ patients
- 200-500 appointments/day
- 20-100 concurrent users
- HIPAA compliance ready
```

---

## Quick Start Commands

### Option 1: Vercel + Railway (Recommended)

**Frontend (Vercel):**
```bash
cd frontend
echo "VITE_API_URL=https://your-backend.railway.app" > .env.production
vercel --prod
```

**Backend + Database (Railway):**
```bash
cd backend
railway login
railway init
railway add --database postgresql

# Deploy
railway up

# Run migration
railway run psql $DATABASE_URL -f ../schema.sql

# Create test user
railway run psql $DATABASE_URL -f scripts/create-test-user.sql
```

---

### Option 2: Render (All-in-One)

**Create render.yaml in project root:**
```bash
# Deploy everything with one command
render deploy
```

---

### Option 3: AWS (Production/HIPAA)

**Prerequisites:**
```bash
# Install AWS CLI
brew install awscli
aws configure

# Install CDK (Infrastructure as Code)
npm install -g aws-cdk
```

**Deploy with CDK:**
```bash
cd infrastructure
cdk bootstrap
cdk deploy MyMedicStack
```

---

## Environment Variables

### Backend (.env.production)
```env
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=<from-railway-or-aws-rds>
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_IDLE_TIMEOUT=30000

# Security
JWT_SECRET=<generate-strong-secret-key>
JWT_EXPIRES_IN=24h

# Event Sourcing
SNAPSHOT_FREQUENCY=100
PROJECTION_BATCH_SIZE=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring (optional)
ENABLE_METRICS=true
METRICS_PORT=9090

# CORS (set to your frontend URL)
CORS_ORIGIN=https://your-app.vercel.app
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend.railway.app
```

---

## Database Setup Checklist

- [ ] Create production database
- [ ] Run schema migration (`schema.sql`)
- [ ] Create initial hospital/user (`create-test-user.sql`)
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Enable SSL connections
- [ ] Set up monthly partition creation cron
- [ ] Create read replicas (for scale)
- [ ] Configure monitoring/alerts

---

## Security Checklist

- [ ] Change default JWT_SECRET to strong random value
- [ ] Enable HTTPS (automatic on Vercel/Railway/Render)
- [ ] Configure CORS for production domains only
- [ ] Set up rate limiting (already in code)
- [ ] Enable security headers with Helmet (already in code)
- [ ] Regular security audits (`npm audit`)
- [ ] Database backup strategy (daily recommended)
- [ ] Monitor for suspicious activity
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Enable database encryption at rest
- [ ] Implement API request logging
- [ ] Set up SSL certificate monitoring

---

## Monitoring & Maintenance

### Recommended Monitoring Tools

**Free/Low Cost:**
- **Better Uptime** (uptime monitoring): Free - $10/mo
- **Sentry** (error tracking): Free tier available
- **LogTail** (log aggregation): Free - $5/mo

**For Production:**
- **DataDog** (full observability): ~$15/host/mo
- **New Relic** (APM): ~$25/mo
- **AWS CloudWatch** (if on AWS): ~$10-20/mo

### Database Monitoring Queries

**Check projection lag:**
```sql
SELECT * FROM check_projection_lag();
```

**Monitor event store growth:**
```sql
SELECT
  date_trunc('month', event_timestamp) as month,
  COUNT(*) as event_count,
  pg_size_pretty(pg_total_relation_size('event_store')) as size
FROM event_store
GROUP BY month
ORDER BY month DESC;
```

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('mymedic_prod'));
```

---

## Backup Strategy

### Railway/Render
- Automatic daily backups included
- Point-in-time recovery available on paid plans
- Export weekly backups to S3 for extra safety

### AWS RDS
```bash
# Automated backups (configure in RDS console)
# Retention: 7-30 days
# Backup window: Off-peak hours (2-4 AM)

# Manual snapshot before major changes
aws rds create-db-snapshot \
  --db-snapshot-identifier mymedic-manual-backup-$(date +%Y%m%d) \
  --db-instance-identifier mymedic-prod
```

### Manual Backup Script
```bash
#!/bin/bash
# backup.sh - Run weekly via cron

BACKUP_DIR="/backups/mymedic"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump $DATABASE_URL > "$BACKUP_DIR/mymedic_$TIMESTAMP.sql"

# Compress
gzip "$BACKUP_DIR/mymedic_$TIMESTAMP.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/mymedic_$TIMESTAMP.sql.gz" \
  s3://mymedic-backups/database/

# Delete local backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

---

## CI/CD Setup

### GitHub Actions (Recommended)

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy Backend
        run: |
          cd backend
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Deploy to Vercel
        run: |
          cd frontend
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## Cost Optimization Tips

1. **Use connection pooling** (already configured in code)
2. **Enable database query caching** where appropriate
3. **Optimize images** with CDN (Cloudflare/Vercel)
4. **Use read replicas** for heavy read operations
5. **Archive old events** to cheaper storage after 1 year
6. **Monitor and optimize slow queries**
7. **Use serverless for background jobs** (AWS Lambda/Vercel Functions)
8. **Implement API response caching** for static data

---

## Troubleshooting

### Common Issues

**1. Database connection errors**
```bash
# Check connection
railway run psql $DATABASE_URL -c "SELECT version();"

# Check pool exhaustion
# Add to your code: monitor activeConnections
```

**2. Frontend can't connect to backend**
- Verify `VITE_API_URL` is set correctly
- Check CORS settings in backend
- Verify backend is running: `curl https://your-backend.railway.app/health`

**3. Projection lag increasing**
```sql
-- Check projection status
SELECT * FROM check_projection_lag();

-- Rebuild projection if needed
SELECT reset_projection('patients_projection');
```

**4. Out of memory errors**
- Increase Railway/Render instance size
- Optimize event batch processing
- Add pagination to large queries

---

## Next Steps After Deployment

1. **Set up monitoring** (Sentry, Better Uptime)
2. **Configure automated backups**
3. **Set up SSL/HTTPS** (automatic on most platforms)
4. **Add custom domain** (buy from Namecheap, configure DNS)
5. **Enable error tracking**
6. **Set up log aggregation**
7. **Create staging environment** (clone Railway/Render service)
8. **Document runbooks** for common operations
9. **Set up on-call rotation** (PagerDuty/Opsgenie)
10. **Plan disaster recovery** procedures

---

## Support Resources

- **Railway**: https://railway.app/docs
- **Vercel**: https://vercel.com/docs
- **Render**: https://render.com/docs
- **AWS**: https://docs.aws.amazon.com/
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## Estimated Costs Summary

| Setup | Monthly Cost | Best For |
|-------|-------------|----------|
| **Vercel + Railway** | $15-30 | Small clinics, MVP |
| **Render All-in-One** | $14-20 | Budget-conscious startups |
| **Vercel + Railway Pro** | $60-80 | Growing practices |
| **AWS Full Stack** | $100-200 | Large hospitals, HIPAA |
| **AWS + HIPAA + HA** | $300-500 | Enterprise healthcare |

---

**Made with ❤️ for healthcare providers**
