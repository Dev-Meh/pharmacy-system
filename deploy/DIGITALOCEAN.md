# Deploy MehMediCore Pharmacy on DigitalOcean

This guide deploys the **Django API** + **React frontend** on a **DigitalOcean Droplet** (Ubuntu 22.04/24.04).

**Stack**

| Part | Folder | Server role |
|------|--------|-------------|
| API | `backend/` | Gunicorn + PostgreSQL |
| UI | `frontend/` | Static files (Nginx) |

**Recommended URL layout (one domain)**

- `https://yourdomain.com/` → React app  
- `https://yourdomain.com/api/` → Django REST API  
- `https://yourdomain.com/media/` → pharmacy logos  

---

## 1. Create a DigitalOcean Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com).
2. **Create → Droplets**
3. Choose:
   - **Image:** Ubuntu 24.04 LTS  
   - **Plan:** Basic — $6/mo (1 GB RAM) is enough to start  
   - **Region:** closest to your users  
   - **Authentication:** SSH key (recommended) or password  
4. Create the Droplet and note the **public IP** (e.g. `157.230.x.x`).

### DNS

Point your domain to the Droplet:

- In **DigitalOcean → Networking → Domains**, add your domain and an **A record** `@` → Droplet IP  
- Or at your registrar: **A record** `@` and `www` → Droplet IP  

### Firewall (recommended)

**Networking → Firewalls → Create firewall**

| Inbound | Port | Sources |
|---------|------|---------|
| SSH | 22 | Your IP (or All IPv4 for testing) |
| HTTP | 80 | All IPv4, All IPv6 |
| HTTPS | 443 | All IPv4, All IPv6 |

Attach the firewall to your Droplet.

---

## 2. SSH setup (Windows → DigitalOcean)

SSH is how you connect to your Droplet from your PC to run commands and deploy code.

### Step A — Create an SSH key on your PC (one time)

Open **PowerShell** on Windows:

```powershell
ssh-keygen -t ed25519 -C "mehmedicore-deploy" -f $env:USERPROFILE\.ssh\id_ed25519_do
```

Press **Enter** for no passphrase (or set one for extra security).

Your files:
- **Private key** (keep secret): `C:\Users\YOUR_NAME\.ssh\id_ed25519_do`
- **Public key** (upload to DigitalOcean): `C:\Users\YOUR_NAME\.ssh\id_ed25519_do.pub`

Show the public key:

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519_do.pub
```

Copy the whole line (starts with `ssh-ed25519 ...`).

### Step B — Add the key to DigitalOcean

1. **DigitalOcean → Settings → Security → SSH Keys**
2. **Add SSH Key** → paste the public key → name it e.g. `My Laptop`
3. When creating the Droplet, select this key under **Authentication**

### Step C — Connect to the Droplet

Replace `YOUR_DROPLET_IP` with the IP from the DigitalOcean dashboard:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_do root@YOUR_DROPLET_IP
```

First time: type `yes` when asked to trust the host.

**Optional — save settings** so you can just type `ssh mehmedicore`:

Create/edit `C:\Users\YOUR_NAME\.ssh\config`:

```
Host mehmedicore
    HostName YOUR_DROPLET_IP
    User root
    IdentityFile ~/.ssh/id_ed25519_do
```

Then connect with:

```powershell
ssh mehmedicore
```

### Step D — Upload files with SCP (e.g. frontend build)

From your PC:

```powershell
scp -i $env:USERPROFILE\.ssh\id_ed25519_do -r G:\project\pharmacy\frontend\dist\client\* root@YOUR_DROPLET_IP:/tmp/mehmedicore-ui/
```

### If you used a password instead of SSH key

DigitalOcean emails the root password. Connect with:

```powershell
ssh root@YOUR_DROPLET_IP
```

Then set up an SSH key later (recommended):

```powershell
# On your PC — copy public key to server
type $env:USERPROFILE\.ssh\id_ed25519_do.pub | ssh root@YOUR_DROPLET_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Common SSH problems

| Problem | Fix |
|---------|-----|
| `Connection timed out` | Droplet running? Firewall allows port **22**? Correct IP? |
| `Permission denied (publickey)` | Wrong key — use `-i` path; key added in DO when Droplet was created |
| `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED` | Droplet was rebuilt — run `ssh-keygen -R YOUR_DROPLET_IP` on your PC |

---

## 3. SSH into the Droplet (first server setup)

```bash
ssh root@YOUR_DROPLET_IP
```

Or, if you configured `~/.ssh/config`:

```bash
ssh mehmedicore
```

Create a deploy user (example: `deploy`):

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
su - deploy
```

---

## 4. Install server software

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip nginx postgresql postgresql-contrib git curl
```

Optional — Node.js 20 (only if you build the frontend on the server):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 5. PostgreSQL database

### Option A — PostgreSQL on the Droplet (simple)

```bash
sudo -u postgres psql
```

```sql
CREATE USER pharmacy WITH PASSWORD 'STRONG_DB_PASSWORD';
CREATE DATABASE pharmacy OWNER pharmacy;
\q
```

### Option B — DigitalOcean Managed Database (optional)

1. **Create → Databases → PostgreSQL**
2. Copy **host**, **port**, **user**, **password**, **database**
3. In **Trusted sources**, add your Droplet
4. Use those values in `backend/.env` (`DB_HOST`, `DB_PORT`, etc.)

---

## 6. Clone the project on the server

```bash
cd ~
git clone https://github.com/YOUR_USER/pharmacy.git mehmedicore
cd mehmedicore
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

---

## 7. Backend `.env` (production)

```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

Example:

```env
DJANGO_SECRET_KEY=generate-a-long-random-string-here
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,YOUR_DROPLET_IP

DB_ENGINE=django.db.backends.postgresql
DB_NAME=pharmacy
DB_USER=pharmacy
DB_PASSWORD=STRONG_DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

JWT_ACCESS_MINUTES=60
JWT_REFRESH_DAYS=7
```

Generate a secret key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Run migrations and create platform admin:

```bash
cd ~/mehmedicore/backend
source ../.venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py create_platform_admin --email admin@yourdomain.com --password 'StrongAdminPass123!' --full-name "Platform Admin" --username admin
```

---

## 8. Gunicorn (systemd)

Edit `deploy/gunicorn-mehmedicore.service` — replace every `CHANGE_ME` with your Linux user (e.g. `deploy`).

```bash
sudo cp ~/mehmedicore/deploy/gunicorn-mehmedicore.service /etc/systemd/system/mehmedicore.service
sudo systemctl daemon-reload
sudo systemctl enable mehmedicore
sudo systemctl start mehmedicore
sudo systemctl status mehmedicore
```

---

## 9. Build frontend

### Option A — build on your PC, upload (easiest)

On Windows:

```powershell
cd G:\project\pharmacy\frontend
copy .env.production.example .env.production
npm ci
npm run build
```

Upload static files:

```powershell
scp -r dist/client/* deploy@YOUR_DROPLET_IP:/tmp/mehmedicore-ui/
```

On the Droplet:

```bash
sudo mkdir -p /var/www/mehmedicore
sudo rsync -a --delete /tmp/mehmedicore-ui/ /var/www/mehmedicore/
sudo chown -R www-data:www-data /var/www/mehmedicore
```

### Option B — build on the Droplet

```bash
cd ~/mehmedicore/frontend
echo "VITE_API_BASE=/api" > .env.production
npm ci
npm run build
sudo mkdir -p /var/www/mehmedicore
sudo rsync -a --delete dist/client/ /var/www/mehmedicore/
sudo chown -R www-data:www-data /var/www/mehmedicore
```

---

## 10. Nginx

Edit `deploy/nginx-mehmedicore.conf`:

- Replace `CHANGE_ME.example.com` with your domain  
- Replace `CHANGE_ME` with your Linux user (e.g. `/home/deploy/mehmedicore/...`)

```bash
sudo cp ~/mehmedicore/deploy/nginx-mehmedicore.conf /etc/nginx/sites-available/mehmedicore
sudo ln -sf /etc/nginx/sites-available/mehmedicore /etc/nginx/sites-enabled/mehmedicore
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot updates Nginx for HTTPS automatically.

---

## 12. Test after deploy

| URL | Expected |
|-----|----------|
| `https://yourdomain.com/` | Sign-in page |
| `https://yourdomain.com/api/` | JSON API info |
| `https://yourdomain.com/admin/` | Django admin |

Sign in as platform admin → **Pharmacies** → register a pharmacy.

---

## Updating after code changes

```bash
su - deploy
cd ~/mehmedicore
git pull
source .venv/bin/activate
pip install -r backend/requirements.txt -q
cd backend && python manage.py migrate && python manage.py collectstatic --noinput
sudo systemctl restart mehmedicore
```

Rebuild frontend and rsync to `/var/www/mehmedicore/` (see step 8).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot SSH | Check Droplet is running; firewall allows port 22 |
| 502 Bad Gateway | `sudo systemctl status mehmedicore` — check gunicorn socket path matches Nginx |
| CORS errors | Add your HTTPS domain to `CORS_ALLOWED_ORIGINS` in `backend/.env` |
| Login works locally, not on server | Ensure `DJANGO_DEBUG=false` and domain in `ALLOWED_HOSTS` |
| Pharmacy logos missing | Check Nginx `location /media/` path and `backend/media/` permissions |
| API calls go to localhost | Rebuild frontend with `VITE_API_BASE=/api` |

---

## Deploy files

| File | Purpose |
|------|---------|
| `nginx-mehmedicore.conf` | Nginx site config |
| `gunicorn-mehmedicore.service` | systemd service for Gunicorn |
| `backend/.env.production.example` | Backend env template |
| `frontend/.env.production.example` | Frontend build env |

---

## Subdomain example

Use `pharmacy.yourdomain.com` as `server_name` in Nginx and add a DNS **A record** for `pharmacy` → Droplet IP.
