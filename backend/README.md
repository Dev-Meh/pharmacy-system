# MehMediCore Django Backend

REST API for the MehMediCore pharmacy app. Works with the React frontend in the repo root.

## Stack

- Django 5 + Django REST Framework
- JWT auth (`djangorestframework-simplejwt`)
- **PostgreSQL** database

## Quick start

### 1. Install PostgreSQL

You need PostgreSQL running locally (you have `psql` 16.x installed).

Create the database once:

```powershell
psql -U postgres -c "CREATE DATABASE pharmacy;"
```

### 2. Configure environment

```powershell
cd backend
copy .env.example .env
```

Edit `.env` and set your PostgreSQL password:

```
DB_PASSWORD=your-postgres-password
```

### 3. Install and run

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api/`

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Sign in (`email`, `password`) → JWT + user |
| POST | `/api/auth/logout/` | Log out (discard tokens client-side) |
| GET | `/api/auth/me/` | Current user, profile, roles |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET/POST | `/api/drugs/` | List / create drugs |
| GET/PATCH/DELETE | `/api/drugs/{id}/` | Drug detail |
| GET | `/api/drugs/in-stock/` | Drugs with stock > 0 |
| GET/POST | `/api/sales/` | Sales history / record sale |
| GET/POST | `/api/users/` | List users / create staff (admin only) |
| PATCH | `/api/users/{id}/role/` | Set role (admin only) |
| GET | `/api/dashboard/stats/` | Dashboard aggregates |

## Roles

- `admin` — full access, user management
- `store_manager` — manage drugs + view all sales
- `pharmacist` — record sales, view own sales

First registered user becomes **admin**. New accounts are created by an administrator via Django admin (`createsuperuser` or admin panel).

## Connect React frontend

1. Add to `frontend/.env.development`:

   ```
   VITE_API_BASE=http://127.0.0.1:8000/api
   ```

2. From the `frontend/` folder, replace Supabase calls with `fetch` to the endpoints above, sending:

   ```
   Authorization: Bearer <access_token>
   ```

3. Store `access` / `refresh` tokens from login/register responses (e.g. `localStorage`).

## Admin panel

`http://127.0.0.1:8000/admin/` — use `createsuperuser` credentials.

## Production

- Set `DJANGO_DEBUG=false` and a strong `DJANGO_SECRET_KEY`
- Use a managed PostgreSQL host (Supabase, Neon, Railway, AWS RDS, etc.)
- Serve with Gunicorn behind Nginx; proxy `/api/` to Django and serve React static files separately

## Managed PostgreSQL (optional)

For cloud hosting, create a Postgres instance and set in `.env`:

```
DB_ENGINE=django.db.backends.postgresql
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your-db-host.example.com
DB_PORT=5432
```

Then run `python manage.py migrate` against the remote database.
