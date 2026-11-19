---
description: "Docker Compose for local development: compose.yaml, health-gated dependencies, watch mode and secrets."
globs: ["**/compose.yaml", "**/compose.yml", "**/compose.*.yaml", "**/compose.*.yml", "**/docker-compose.yaml", "**/docker-compose.yml", "**/docker-compose.*.yml"]
---

# Docker Compose

- The file is `compose.yaml`. The top-level `version` key is obsolete and omitted.
- Compose runs local development and integration environments. Production uses the platform's own deployment.
- Service images pin a version tag, never `latest`.
- `depends_on` uses `condition: service_healthy`, and every dependency it names has a `healthcheck`, such as `pg_isready` for PostgreSQL.
- Data services keep state in named volumes. Bind mounts are for source code only.
- Ports bind to `127.0.0.1` (`"127.0.0.1:5432:5432"`) so local databases are not reachable from the network.
- Credentials come from a git-ignored `.env` file or `secrets:`, never from values committed in `compose.yaml`. A committed `.env.example` lists the names.
- App services built from source use `develop.watch`: `sync` for code with hot reload, `rebuild` for dependency manifests, `sync+restart` for config files. `docker compose up --watch` runs it.
- Watch rules `ignore` dependency folders such as `node_modules/`, and the container user can write to every `target`.
- Optional tools such as admin UIs go behind `profiles`, so `docker compose up` starts only what the app needs.
- `include` pulls in another team's Compose file instead of copying its services.
