# Quick Deploy Guide - Free Tier 🚀

**Total Time: ~30 minutes**
**Total Cost: $0/month** (free tiers only)

---

## ✅ Prerequisites

Make sure you have these installed:
```bash
node --version  # Should be 18+
npm --version   # Should be 9+
git --version
```

---

## 🗂️ Step 1: Supabase (5 min)

### Create Database
1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. **New Project**:
   - Name: `mymedic-mvp`
   - Password: Generate strong password (save it!)
   - Region: Choose closest to you
3. Wait 2-3 minutes for provisioning

### Get Connection String
1. **Settings** → **Database** → **Connection string**
2. Copy the **URI** format:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
3. **Replace `[PASSWORD]`** with your actual password
4. **Save this securely!**

### Run Schema
1. **SQL Editor** → **New query**
2. Open `schema.sql` from your project
3. Copy entire file → Paste in editor
4. Click **Run**
5. Wait 10-30 seconds → Should see "Success"

### Create Test User
1. **SQL Editor** → **New query**
2. Copy and run this:
```sql
-- Test hospital
INSERT INTO hospitals (hospital_id, hospital_name, contact_email, phone, address, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Clinic',
  'admin@test.com',
  '+1234567890',
  jsonb_build_object('line1', '123 Test St', 'city', 'Test City', 'state', 'Test', 'postal_code', '12345'),
  '{}'::jsonb
);

-- Test user (password: password123)
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

✅ **Supabase is ready!**

---

## 🚁 Step 2: Deploy Backend to Fly.io (10 min)

### Install Fly CLI
```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Login
```bash
fly auth signup  # New user
# OR
fly auth login   # Existing user
```

### Deploy
```bash
cd backend

# Launch app (don't deploy yet)
fly launch --no-deploy

# When prompted:
# - App name: [press Enter or type your own]
# - Region: [choose closest to Supabase]
# - Postgres: NO
# - Redis: NO
# - Deploy: NO

# Set environment variables (replace with your values!)
fly secrets set DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set NODE_ENV=production
fly secrets set LOG_LEVEL=info

# Deploy!
fly deploy
```

### Test
```bash
fly status
curl https://YOUR-APP-NAME.fly.dev/health
```

You should see: `{"status":"healthy",...}`

**Save your backend URL**: `https://YOUR-APP-NAME.fly.dev`

✅ **Backend is live!**

---

## ⚡ Step 3: Deploy Frontend to Vercel (10 min)

### Install Vercel CLI
```bash
npm install -g vercel
```

### Login
```bash
vercel login
# Check your email for verification
```

### Configure & Deploy
```bash
cd ../frontend

# Create production env file
echo "VITE_API_URL=https://YOUR-APP-NAME.fly.dev" > .env.production

# Deploy!
vercel --prod

# When prompted:
# - Set up and deploy: Y
# - Link to existing: N
# - Project name: [press Enter]
# - Directory: [press Enter]
# - Override settings: N
```

### Update Backend CORS
```bash
cd ../backend

# Set CORS to allow your frontend
fly secrets set CORS_ORIGIN=https://your-app-name.vercel.app

# Redeploy
fly deploy --ha=false
```

✅ **Frontend is live!**

---

## 🧪 Step 4: Test (5 min)

1. **Open your Vercel URL**: `https://your-app.vercel.app`
2. **Login with**:
   - Email: `test.doctor@example.com`
   - Password: `password123`
3. **Try creating a patient**:
   - Go to Patients page
   - Click "Register New Patient"
   - Fill in form
   - Submit

✅ **If patient appears, you're done!** 🎉

---

## 🔧 Troubleshooting

### Backend not connecting to database
```bash
cd backend
fly logs  # Check for connection errors

# If DATABASE_URL is wrong:
fly secrets set DATABASE_URL="correct-url"
fly deploy --ha=false
```

### Frontend can't reach backend
1. Check `.env.production` has correct backend URL
2. Check browser console for CORS errors
3. Verify backend CORS_ORIGIN:
```bash
cd backend
fly secrets list  # Check CORS_ORIGIN
```

### Deploy fails
```bash
# Check build locally first
cd backend
npm run build

cd ../frontend
npm run build
```

---

## 📊 Your URLs

After deployment, save these:

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.fly.dev
- **Database**: Supabase dashboard

---

## 💰 Costs

| Service | Free Tier Limits |
|---------|------------------|
| Supabase | 500MB DB, 1GB storage, 50 connections |
| Fly.io | 256MB RAM, 3 shared VMs, 160GB bandwidth |
| Vercel | 100GB bandwidth, unlimited requests |

**When to upgrade:**
- Database > 400MB → Supabase Pro ($25/mo)
- More than 10 concurrent users → Fly.io paid ($5-10/mo)

---

## 🎯 Next Steps

1. **Custom domain** (optional): $10-15/year
   - Add to Vercel: Settings → Domains
   - Add to Fly.io: `fly certs add yourdomain.com`

2. **Monitoring** (free):
   - [Better Uptime](https://betteruptime.com) - uptime monitoring
   - [Sentry](https://sentry.io) - error tracking

3. **Backup** (automated):
   - Supabase has daily backups (7 days)
   - Set up weekly exports (see DEPLOYMENT_GUIDE.md)

---

## 📚 Resources

- Detailed guide: `DEPLOYMENT_STEPS.md`
- Strategy: `DEPLOYMENT_STRATEGY.md`
- Full guide: `DEPLOYMENT_GUIDE.md`

---

**Questions?** Check the troubleshooting section or refer to the detailed guides.

**Congratulations! Your app is live!** 🚀
