# Custom Domain Setup for MyMedic

## Your Domains
- **Frontend**: https://mymedic.healthcare
- **Backend API**: https://api.mymedic.healthcare

---

## GoDaddy DNS Configuration

Go to: **GoDaddy → My Products → mymedic.healthcare → Manage DNS**

### DNS Records to Add:

#### 1. Backend API (api.mymedic.healthcare)

**A Record:**
- Type: `A`
- Name: `api`
- Value: `66.241.124.180`
- TTL: `600` seconds

**AAAA Record:**
- Type: `AAAA`
- Name: `api`
- Value: `2a09:8280:1::c6:4f49:0`
- TTL: `600` seconds

#### 2. Frontend (mymedic.healthcare)

**A Record:**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`
- TTL: `600` seconds

**CNAME Record:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`
- TTL: `600` seconds

---

## After Adding DNS Records

### 1. Wait 5-10 minutes for DNS propagation

### 2. Check DNS is working:
```bash
# Check backend
dig api.mymedic.healthcare

# Check frontend
dig mymedic.healthcare
```

### 3. Verify SSL certificates:
```bash
# Backend (Fly.io)
fly certs check api.mymedic.healthcare

# Frontend (Vercel)
# Go to Vercel dashboard → Settings → Domains
```

---

## What Happens After DNS Setup

1. ✅ Fly.io will automatically provision SSL certificate for api.mymedic.healthcare
2. ✅ Vercel will automatically provision SSL certificate for mymedic.healthcare
3. ✅ Both will have HTTPS enabled automatically
4. ✅ Your app will be accessible at your custom domain

---

## Troubleshooting

**If domain doesn't work after 10 minutes:**

1. Check DNS propagation: https://dnschecker.org
2. Verify DNS records are correct in GoDaddy
3. Check certificate status: `fly certs show api.mymedic.healthcare`
4. Clear browser cache and try incognito mode

---

## Current Status

- ✅ Fly.io certificate request created
- ✅ Vercel domain added to project
- ⏳ Waiting for DNS records in GoDaddy
- ⏳ Waiting for DNS propagation
- ⏳ Waiting for SSL certificate provisioning
