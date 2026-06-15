# Deploy MehMediCore Pharmacy

| App | Folder |
|-----|--------|
| Django API | `backend/` |
| React UI | `frontend/` |

**→ [Deploy on DigitalOcean](DIGITALOCEAN.md)** — full step-by-step guide (Droplet, Gunicorn, Nginx, PostgreSQL, HTTPS).

Files:

| File | Purpose |
|------|---------|
| `DIGITALOCEAN.md` | DigitalOcean deployment guide |
| `nginx-mehmedicore.conf` | Nginx site config |
| `gunicorn-mehmedicore.service` | systemd service for Gunicorn |

---

# Legacy — PHM church website (separate project)

Two Git repos:

| App | Folder | GitHub |
|-----|--------|--------|
| Django CMS | `church_management/` | `Dev-Meh/church_system` |
| Public website | `phmwebsite/` | `Dev-Meh/phmwebsite` |

---

## 1. On your PC — push code

### Django (`church_management`)

```powershell
cd G:\project\church_system\church_management
git add events/ members/ templates/ sermons/ donations/ church_management/ --ignore-errors
git status
git commit -m "Events API, permissions, security headers for media, UI updates"
git push origin main
```

### Website (`phmwebsite`)

```powershell
cd G:\project\church_system\phmwebsite
npm run build
git add src/ public/ deploy/ vite.config.ts package-lock.json
git status
git commit -m "Public website: logo, contact, events from API, worship audio"
git push origin main
```

`npm run build` creates `dist/client/` (includes `music/worship.webm` from `public/music/`).

---

## 2. On the server — Django

SSH in, use your deploy user (e.g. `mussa`):

```bash
su - mussa
cd ~/church_system/church_management   # adjust path if different
git pull origin main
source ~/church_system/env/bin/activate   # or your venv path
pip install -r requirements.txt -q
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn          # or: sudo systemctl restart church
```

Check `.env` on server: `DEBUG=False`, `ALLOWED_HOSTS`, `SECRET_KEY`, `CSRF_TRUSTED_ORIGINS` include your domain.

---

## 3. On the server — website (static)

### Option A — build on server (needs Node 18+)

```bash
cd ~/phmwebsite
git pull origin main
npm ci
npm run build
sudo mkdir -p /var/www/phmwebsite
sudo rsync -a --delete dist/client/ /var/www/phmwebsite/
```

### Option B — upload from PC (no Node on server)

```powershell
cd G:\project\church_system\phmwebsite
npm run build
scp -r dist/client/* USER@YOUR_SERVER:/var/www/phmwebsite/
```

---

## 4. Nginx (one domain)

1. Edit `deploy/nginx-phm.conf`: replace `CHANGE_ME` (domain, paths, gunicorn port/socket).
2. Copy to server and enable:

```bash
sudo cp nginx-phm.conf /etc/nginx/sites-available/phm
sudo ln -sf /etc/nginx/sites-available/phm /etc/nginx/sites-enabled/phm
sudo nginx -t && sudo systemctl reload nginx
```

**Routing:**

- `/` `/about` `/our-events` `/contact` `/assets/` `/music/` → static website
- `/members/` `/dashboard/` `/events/` (incl. `/events/api/public/`) → Django
- `/static/` `/media/` → Django files (posters, logos)

**HTTPS:** If you already use Certbot, merge the `location` blocks into your existing `listen 443 ssl` server block instead of replacing SSL config.

---

## 5. Quick test after deploy

- `https://yourdomain.com/` — church website, logo, music button
- `https://yourdomain.com/our-events` — events from Django (published only)
- `https://yourdomain.com/phm-kuingia-a8f2/` — login (`LOGIN_URL_PATH` / `VITE_LOGIN_URL`)
- `https://yourdomain.com/events/api/public/` — JSON `{"events":[...]}`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Posters not on website | Publish event + upload poster; `collectstatic` not needed for media |
| Broken poster images | `media/` path in nginx `alias` must match `MEDIA_ROOT` |
| Music not playing | Confirm `/var/www/phmwebsite/music/worship.webm` exists |
| 500 after pull | `python manage.py migrate` as deploy user |
| git pull as root | `su - mussa` first |
