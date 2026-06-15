# MehMediCore Pharmacy System

Monorepo layout:

```
pharmacy/
├── frontend/   # React + TanStack Start UI
├── backend/    # Django REST API + PostgreSQL
└── deploy/     # Nginx deployment configs
```

## Quick start

### Backend (API)

```powershell
cd backend
python -m pip install -r requirements.txt
copy .env.example .env
# Edit .env — set DB_PASSWORD
python manage.py migrate
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`

### Frontend (UI)

```powershell
cd frontend
npm install
npm run dev
```

App: `http://localhost:8080` (or the port Vite prints)

## Environment

| File | Purpose |
|------|---------|
| `backend/.env` | Django + PostgreSQL settings |
| `frontend/.env.development` | `VITE_API_BASE` for local API |

Set in `frontend/.env.development`:

```
VITE_API_BASE=http://127.0.0.1:8000/api
```

## Docs

- [Backend API](backend/README.md)
- [Deploy on DigitalOcean](deploy/DIGITALOCEAN.md)
