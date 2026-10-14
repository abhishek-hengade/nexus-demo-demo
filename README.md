# 🏢 NexusOffice Pro - Multi-Container Docker Architecture

Enterprise-grade Office Management System fully containerized with **Docker Compose**, separating the frontend Nginx reverse proxy and backend Node.js REST API into isolated, production-grade micro-services.

---

## 📁 Repository Structure

```
nexus-office-app/
├── docker-compose.yml          # Top-level Docker Compose orchestrator
├── .env.example                # Shared environment defaults
├── frontend/                   # Frontend SPA Container (Nginx)
│   ├── Dockerfile              # Multi-stage Nginx Alpine build
│   ├── nginx.conf              # Reverse proxy routing /api -> backend:4000
│   └── public/                 # Static HTML, CSS, JS and Audio assets
│       ├── index.html
│       ├── css/style.css
│       └── js/
│           ├── api.js
│           ├── app.js
│           └── audio.js
└── backend/                    # Backend REST API Container (Node.js)
    ├── Dockerfile              # Node.js 20 Alpine container
    ├── package.json            # Express, Cors, Morgan, Dotenv
    ├── data/                   # Persistent JSON volume mount
    │   └── database.json
    └── src/
        ├── config/
        ├── database/
        ├── middleware/
        ├── routes/
        └── server.js
```

---

## 🚀 Running with Docker Compose

To start both services in isolated containers:

```bash
docker compose up -d --build
```

Access the application in your browser:
* **Web UI**: `http://localhost:4000` (or `http://<SERVER_IP>:4000`)
* **Health Check**: `http://localhost:4000/health`

To view logs:
```bash
docker compose logs -f
```

To stop:
```bash
docker compose down
```
