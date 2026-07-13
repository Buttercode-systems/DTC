import base64
import hashlib
import hmac
import json
import os
import re
import uuid
from pathlib import Path

import bcrypt

run_id = re.sub(r"[^A-Za-z0-9_-]", "", os.environ.get("E2E_RUN_ID", ""))
job_secret = os.environ.get("E2E_JOB_SECRET", "")
if not run_id or not job_secret:
    raise RuntimeError("E2E_RUN_ID and E2E_JOB_SECRET are required")


def derive_password(role: str, prefix: str) -> str:
    digest = hmac.new(
        job_secret.encode("utf-8"),
        f"{run_id}:{role}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    encoded = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"{prefix}{encoded}"


def identity(role: str, prefix: str) -> dict[str, str]:
    email = f"ramatsienkoanyane07+tad-e2e-{run_id}-{role}@gmail.com"
    password = derive_password(role, prefix)
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    return {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "role": role,
    }

payload = {
    "run_id": run_id,
    "operator": identity("operator", "Tad!"),
    "client": identity("client", "Client!"),
}

result_dir = Path("test-results/tad-live-e2e")
result_dir.mkdir(parents=True, exist_ok=True)
(result_dir / "bootstrap.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

print(f"E2E_RUN_ID={run_id}")
print(f"E2E_OPERATOR_EMAIL={payload['operator']['email']}")
print(f"E2E_CLIENT_EMAIL={payload['client']['email']}")
print("Prepared disposable identity hashes; raw passwords were not written or logged.")
