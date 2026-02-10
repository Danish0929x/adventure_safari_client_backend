# Adventure Safari Backend - VPS Deployment Guide

## Prerequisites
- VPS Server: `50.6.224.48` (server-638368.adventuresafarinetwork.com)
- Domain: adventuresafarinetwork.com
- Node.js 18+ installed on server
- PM2 process manager
- Nginx web server

---

## 🚀 STEP-BY-STEP DEPLOYMENT COMMANDS

### Step 1: SSH into Your VPS
```bash
ssh root@50.6.224.48
```
Enter your root password when prompted.

---

### Step 2: Install Node.js and PM2 (if not already installed)
```bash
# Update system packages
yum update -y

# Install Node.js 18.x
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
npm install -g pm2

# Install Git (if not already installed)
yum install -y git
```

---

### Step 3: Create Application Directory
```bash
# Create directory for the backend
mkdir -p /var/www/adventuresafari-backend
cd /var/www/adventuresafari-backend
```

---

### Step 4: Clone Your Backend Repository
```bash
# Clone the repository
git clone https://github.com/GriffonWS/adventure_safari_client_backend.git .

# If the directory is not empty, remove contents first
rm -rf /var/www/adventuresafari-backend/*
git clone https://github.com/GriffonWS/adventure_safari_client_backend.git .
```

---

### Step 5: Create Environment File
```bash
# Create .env file
nano /var/www/adventuresafari-backend/.env
```

Paste the following content (press `Ctrl+O` to save, `Enter`, then `Ctrl+X` to exit):
```env
MONGODB_URI=mongodb+srv://mdanish:vPEXpmvLiQiwgfn1@griffon.dhrrsbo.mongodb.net/adventureSafari?retryWrites=true&w=majority&appName=griffon
JWT_SECRET=3c40d403f9e274fdd9c403a6c29b1f8997d20ff2d9f0f5ab2e81549b2fa3edab62d961b5f0856fdaa60b183ff61ad1adac55aa778c4a1947ad0076b4f7a6eb38
EMAIL_USER=mdanish@griffonwebstudios.com
EMAIL_PASS=bdfm wfco ivnw wtlw
CLIENT_URL=https://adventure-safari-client-frontend.vercel.app
PORT=5000

CLOUDINARY_CLOUD_NAME=dev6cpp4u
CLOUDINARY_API_KEY=168569336366361
CLOUDINARY_API_SECRET=Kk2MwYhVsBonSmrdvzzOUlr8HnM

PAYPAL_CLIENT_ID=AfwAx5T5YNYR7NEJhG7ZNZRfP0RjbFkh_gZxyyyIeAwzRBHxO9CRaEzh_VSmcxUeitF-Yu8_hOAN1uZc
PAYPAL_CLIENT_SECRET=EIbnCKriyFbcI4kq2DUkPCnFymNEIlSwjowWvtghjReZ49qUQtxGSzWifLAitgPUr-NOgC8fFG5FQuso
PAYPAL_MODE=sandbox
```

---

### Step 6: Install Dependencies and Start Application
```bash
# Install dependencies
cd /var/www/adventuresafari-backend
npm install --production

# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start server.js --name adventuresafari-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command that PM2 outputs
```

---

### Step 7: Install and Configure Nginx
```bash
# Install Nginx
yum install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Create Nginx configuration for your backend
nano /etc/nginx/conf.d/adventuresafari-backend.conf
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name api.adventuresafarinetwork.com adventuresafarinetwork.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

Save and test Nginx configuration:
```bash
# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

### Step 8: Configure Firewall
```bash
# Allow HTTP and HTTPS traffic
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Check firewall status
firewall-cmd --list-all
```

---

### Step 9: Install SSL Certificate (Optional but Recommended)
```bash
# Install Certbot
yum install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d adventuresafarinetwork.com -d api.adventuresafarinetwork.com

# Follow the prompts and enter your email
# Choose option 2 to redirect HTTP to HTTPS
```

---

### Step 10: Configure DNS Settings
Go to your domain registrar's DNS settings (e.g., GoDaddy, Namecheap, Cloudflare) and add:

**A Records:**
- Host: `@` → Value: `50.6.224.48` (for adventuresafarinetwork.com)
- Host: `api` → Value: `50.6.224.48` (for api.adventuresafarinetwork.com)

Wait 5-10 minutes for DNS propagation.

---

## 📋 USEFUL PM2 COMMANDS

```bash
# View application status
pm2 status

# View logs
pm2 logs adventuresafari-backend

# Restart application
pm2 restart adventuresafari-backend

# Stop application
pm2 stop adventuresafari-backend

# Delete application from PM2
pm2 delete adventuresafari-backend

# Monitor application
pm2 monit
```

---

## 🔄 CI/CD SETUP (GitHub Actions)

### Step 1: Add GitHub Secrets
Go to your GitHub repository: `https://github.com/GriffonWS/adventure_safari_client_backend`

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:
- `VPS_HOST`: `50.6.224.48`
- `VPS_USERNAME`: `root`
- `VPS_PASSWORD`: `your_root_password`

### Step 2: Push the Workflow File
The workflow file `.github/workflows/deploy.yml` has been created. Push it to your repository:

```bash
# From your local machine (in userbackend directory)
git add .github/workflows/deploy.yml
git add ecosystem.config.js
git commit -m "Add CI/CD deployment workflow"
git push origin main
```

Now, every time you push to the `main` branch, GitHub Actions will automatically deploy to your VPS!

---

## 🧪 TESTING YOUR DEPLOYMENT

### Test 1: Check if backend is running
```bash
curl http://localhost:5000/api/auth
```

### Test 2: Check from external network
```bash
curl http://50.6.224.48/api/auth
```

### Test 3: Check with domain (after DNS propagation)
```bash
curl http://adventuresafarinetwork.com/api/auth
curl http://api.adventuresafarinetwork.com/api/auth
```

---

## 🔧 TROUBLESHOOTING

### Check application logs:
```bash
pm2 logs adventuresafari-backend
```

### Check Nginx error logs:
```bash
tail -f /var/log/nginx/error.log
```

### Restart services:
```bash
pm2 restart adventuresafari-backend
systemctl restart nginx
```

### Check if port 5000 is listening:
```bash
netstat -tulpn | grep 5000
```

---

## 📝 UPDATING YOUR BACKEND URL IN FRONTEND

After deployment, update your frontend to use the new backend URL:
- Development: `http://localhost:5000`
- Production: `https://api.adventuresafarinetwork.com` or `https://adventuresafarinetwork.com`

Update the CORS configuration in `server.js` to include your domain:
```javascript
const allowedOrigins = [
  "http://localhost:3000",
  "https://adventure-safari-client-frontend.vercel.app",
  "https://adventuresafarinetwork.com",
  "https://api.adventuresafarinetwork.com"
];
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] SSH access working
- [ ] Node.js and PM2 installed
- [ ] Repository cloned
- [ ] .env file created with correct values
- [ ] Dependencies installed
- [ ] Application running with PM2
- [ ] Nginx installed and configured
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)
- [ ] DNS records configured
- [ ] GitHub secrets added for CI/CD
- [ ] Workflow file pushed to repository
- [ ] Backend accessible via domain

---

## 🎉 SUCCESS!

Your backend should now be accessible at:
- `http://adventuresafarinetwork.com`
- `http://api.adventuresafarinetwork.com`

With SSL:
- `https://adventuresafarinetwork.com`
- `https://api.adventuresafarinetwork.com`
