# MyMedic Deployment Steps - Free Tier (MVP)

This guide will walk you through deploying MyMedic using free tiers:
- **Frontend**: Vercel (Free)
- **Backend**: Fly.io (Free - 256MB RAM, 3 shared VMs)
- **Database**: Supabase (Free - 500MB storage, 50 direct connections)

**Total Cost**: $0-1/month (domain optional)

---

## Prerequisites

Before starting, make sure you have:
- [x] Node.js 18+ installed
- [ ] Git installed
- [ ] A GitHub account (for easy deployment)
- [ ] Command line access

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization (free tier)

### 1.2 Create Database Project

1. Click "New Project"
2. Fill in details:
   - **Name**: `mymedic-mvp` (or your choice)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose closest to you (Singapore for Asia, US East for Americas, etc.)
   - **Pricing Plan**: Free
3. Click "Create new project"
4. Wait 2-3 minutes for database provisioning

### 1.3 Get Database Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. **Save this securely** - you'll need it later

### 1.4 Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the contents of `schema.sql` from your project
4. Paste into the SQL editor
5. Click **Run** (bottom right)
6. Wait for execution (should take 10-30 seconds)
7. You should see "Success. No rows returned"

### 1.5 Create Initial Test User

1. Still in SQL Editor, click **New query**
2. Paste this SQL:
   ```sql
   -- Create test hospital
   INSERT INTO hospitals (hospital_id, hospital_name, contact_email, phone, address, settings)
   VALUES (
     '00000000-0000-0000-0000-000000000001',
     'Test Clinic',
     'admin@test.com',
     '+1234567890',
     jsonb_build_object(
       'line1', '123 Test Street',
       'city', 'Test City',
       'state', 'Test State',
       'postal_code', '12345'
     ),
     '{}'::jsonb
   );

   -- Create test user (password: password123)
   INSERT INTO users (user_id, hospital_id, email, password_hash, full_name, role)
   VALUES (
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001',
     'test.doctor@example.com',
     '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
     'Dr. Test User',
     'doctor'
   );
   ```
3. Click **Run**
4. You should see "Success"

### 1.6 Verify Setup

1. In SQL Editor, run:
   ```sql
   SELECT * FROM hospitals;
   SELECT user_id, email, full_name, role FROM users;
   ```
2. You should see your test hospital and user

**✅ Step 1 Complete!** Database is ready.

---

## Step 2: Deploy Backend to Fly.io

### 2.1 Install Fly CLI

**macOS/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### 2.2 Authenticate with Fly.io

```bash
fly auth signup  # If new user
# OR
fly auth login   # If existing user
```

This will open a browser for authentication.

### 2.3 Launch Backend Application

Navigate to backend directory:
```bash
cd backend
```

Initialize Fly app:
```bash
fly launch --no-deploy
```

When prompted:
- **App name**: Press Enter to accept suggested name (or type your own like `mymedic-backend-yourname`)
- **Region**: Choose closest to your Supabase region
- **Set up Postgres**: **No** (we're using Supabase)
- **Set up Redis**: **No**
- **Deploy now**: **No**

### 2.4 Set Environment Variables

```bash
# Set DATABASE_URL from Supabase
fly secrets set DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

# Generate and set JWT secret
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"

# Set other environment variables
fly secrets set NODE_ENV=production
fly secrets set LOG_LEVEL=info
fly secrets set PORT=8080

# Event sourcing configuration
fly secrets set SNAPSHOT_FREQUENCY=100
fly secrets set PROJECTION_BATCH_SIZE=1000

# Rate limiting
fly secrets set RATE_LIMIT_WINDOW_MS=60000
fly secrets set RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Replace `[PASSWORD]` and database host in DATABASE_URL with your actual values from Step 1.3.

### 2.5 Deploy Backend

```bash
fly deploy
```

This will:
- Build Docker image
- Push to Fly.io registry
- Deploy to your region
- Start the application

Wait 2-3 minutes for deployment.

### 2.6 Verify Backend Deployment

```bash
# Check status
fly status

# Test health endpoint
curl https://YOUR-APP-NAME.fly.dev/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T...",
  "database": "connected"
}
```

**Save your backend URL**: `https://YOUR-APP-NAME.fly.dev`

**✅ Step 2 Complete!** Backend is live.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Authenticate with Vercel

```bash
vercel login
```

Follow the email verification process.

### 3.3 Configure Frontend Environment

Navigate to frontend directory:
```bash
cd ../frontend
```

Create production environment file:
```bash
# Create .env.production file
echo "VITE_API_URL=https://YOUR-APP-NAME.fly.dev" > .env.production
```

**Replace `YOUR-APP-NAME.fly.dev`** with your actual Fly.io backend URL from Step 2.6.

### 3.4 Deploy Frontend

```bash
vercel --prod
```

When prompted:
- **Set up and deploy**: **Y**
- **Which scope**: Select your account
- **Link to existing project**: **N**
- **Project name**: Press Enter (or type custom name)
- **Directory**: Press Enter (current directory is correct)
- **Override settings**: **N**

Wait 1-2 minutes for deployment.

### 3.5 Verify Frontend Deployment

Vercel will output your deployment URL:
```
https://your-app-name.vercel.app
```

Open this URL in your browser.

### 3.6 Update Backend CORS

Your backend needs to allow requests from your frontend domain.

Edit `backend/src/index.ts` to update CORS configuration:

Find the CORS section and update:
```typescript
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'https://your-app-name.vercel.app',
    credentials: true,
  })
);
```

Then set the environment variable in Fly.io:
```bash
cd ../backend
fly secrets set CORS_ORIGIN=https://your-app-name.vercel.app
```

Redeploy backend:
```bash
fly deploy
```

**✅ Step 3 Complete!** Frontend is live.

---

## Step 4: Test Your Deployment

### 4.1 Access Your Application

1. Open your Vercel URL: `https://your-app-name.vercel.app`
2. You should see the MyMedic login page

### 4.2 Test Login

Use the test credentials you created:
- **Email**: `test.doctor@example.com`
- **Password**: `password123`

Click "Login" or use the "🧪 Test Login" button.

### 4.3 Verify Dashboard

After login, you should see:
- Dashboard with statistics (0 patients, 0 appointments initially)
- Navigation menu working
- No console errors

### 4.4 Test Creating a Patient

1. Go to **Patients** page
2. Click **Register New Patient**
3. Fill in test data:
   - MRN: `TEST-001`
   - Full Name: `Test Patient`
   - DOB: Any date
   - Gender: Male/Female
   - Phone: Any number
   - Email: `test@example.com`
4. Click **Register Patient**
5. You should see success message
6. Patient should appear in the list

**✅ Step 4 Complete!** Application is working end-to-end.

---

## Troubleshooting

### Backend Issues

**Check logs:**
```bash
cd backend
fly logs
```

**Common issues:**
- **Database connection failed**: Check DATABASE_URL is correct
- **Port binding failed**: Ensure PORT=8080 is set
- **Build failed**: Check Node.js version in Dockerfile

### Frontend Issues

**Check Vercel logs:**
```bash
cd frontend
vercel logs
```

**Common issues:**
- **API calls fail**: Check VITE_API_URL is correct
- **CORS errors**: Ensure backend CORS_ORIGIN includes your Vercel domain
- **Build failed**: Run `npm run build` locally first to check for errors

### Database Issues

**Check Supabase logs:**
1. Go to Supabase dashboard
2. Click **Logs** in sidebar
3. Select **Postgres Logs**

**Common issues:**
- **Connection limit exceeded**: You're on free tier with 50 connections max
- **Out of storage**: Free tier has 500MB limit
- **Query timeout**: Check for slow queries

---

## Monitoring Your Free Tier Limits

### Supabase Limits
- **Database Size**: 500MB
- **Bandwidth**: 2GB/month
- **Connections**: 50 direct, 200 via pooler

**Check usage:**
1. Go to Supabase dashboard
2. Click **Settings** → **Billing**
3. View current usage

### Fly.io Limits
- **RAM**: 256MB per VM (3 VMs free)
- **Bandwidth**: 160GB outbound/month
- **Always-on**: 3 machines free

**Check usage:**
```bash
fly dashboard
```

### Vercel Limits
- **Bandwidth**: 100GB/month
- **Build minutes**: 100 hours/month
- **Serverless function executions**: 100GB-hrs/month

**Check usage:**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Usage**

---

## Next Steps

Now that your app is deployed:

1. **Custom Domain** (Optional)
   - Buy domain from Namecheap/Google Domains ($10-15/year)
   - Add to Vercel: Settings → Domains
   - Add to Fly.io: `fly certs add yourdomain.com`

2. **Set up Monitoring**
   - [Better Uptime](https://betteruptime.com) - Free uptime monitoring
   - [Sentry](https://sentry.io) - Free error tracking (5K events/month)

3. **Enable Backups**
   - Supabase has automatic daily backups (7 day retention)
   - Set up weekly manual exports (see DEPLOYMENT_GUIDE.md)

4. **Add SSL/HTTPS**
   - Already enabled! Both Fly.io and Vercel provide automatic SSL

5. **Invite Users**
   - Create new users via SQL or build admin interface
   - Share your Vercel URL with team

---

## Cost Summary

| Service | Tier | Cost | Capacity |
|---------|------|------|----------|
| Supabase | Free | $0 | 500MB DB, 1GB storage, 50 connections |
| Fly.io | Free | $0 | 256MB RAM, 160GB bandwidth |
| Vercel | Free | $0 | 100GB bandwidth, unlimited requests |
| **Total** | | **$0/month** | ~100-500 patients, 5-10 concurrent users |

**When to upgrade:**
- Database exceeds 400MB → Supabase Pro ($25/month)
- More than 5 concurrent users → Fly.io paid ($5-10/month)
- More than 1000 patients → Consider Phase 2 infrastructure

---

## Support

If you run into issues:

1. Check the troubleshooting section above
2. Review logs from each service
3. Consult platform documentation:
   - [Supabase Docs](https://supabase.com/docs)
   - [Fly.io Docs](https://fly.io/docs)
   - [Vercel Docs](https://vercel.com/docs)

---

**Congratulations!** 🎉 Your MyMedic application is now live and accessible on the internet!
