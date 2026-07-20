# Deployment Runbook

Use this guide to deploy the frontend and backend, apply database migrations, and perform post-deploy checks.

## VPS (Docker Compose) — UAT Backend Fixes

### UAT Deployment Checklist
- Ensure `/opt/bc-mis/.env.uat` exists on the VPS (this file is required by `docker-compose.prod.yml` for the `api_uat` service).
- Avoid `git clean -fd` unless you explicitly exclude env files and SSL/certbot directories, otherwise `.env.uat` can be deleted and bring UAT down.

### Symptom: `docker-compose ... up` fails with `.env.uat not found`
Cause: `.env.uat` was deleted (commonly by `git clean -fd`).

Fix:
- Recreate `/opt/bc-mis/.env.uat` by copying `/opt/bc-mis/.env` and updating UAT-specific values (at least the database name to the UAT DB).
- Ensure file permissions are readable by the deployment user.

### Symptom: UAT API is up, but `curl https://api-uat.benedictcollege.com/api/health` fails with SSL errors
Cause: the origin server certificate served by Nginx is expired.

Fix approach:
- Renew/issue a certificate that includes `api-uat.benedictcollege.com` (either a dedicated cert for UAT or a SAN cert containing both `api.benedictcollege.com` and `api-uat.benedictcollege.com`).
- Reload Nginx after updating certificates.

Important note:
- The HTTP-01 (webroot) challenge requires the ACME webroot directory to be writable by Certbot. If Nginx mounts the certbot webroot as read-only (e.g. `./docker/nginx/certbot:/var/www/certbot:ro`), Let’s Encrypt validation will fail with 404 because the challenge file cannot be written.

### Symptom: Production/UAT returns 502, but container healthchecks are OK
Cause: Nginx upstream points to a non-resolvable hostname inside the Docker network.

Fix:
- Nginx upstreams should target the actual container DNS names on the compose network (e.g. `bc-api:3000`, `bc-api-uat:3000`), not generic service names that may not exist in the active network DNS.

## References
- Shared Page Size Dropdown component usage: `docs/setup.md`
- ADR 002 — Page Size Dropdown Standardization: `docs/adr/002-page-size-dropdown-standardization.md`
- Project README — UI Consistency section: `README.md`
