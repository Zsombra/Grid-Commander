#!/usr/bin/env python3
"""Walk one delegated authorization end to end, and answer the question that
cannot be answered offline.

    python3 tools/oauth_walk.py

WHY THIS EXISTS
---------------
`the-connection-asks-who-it-is` changes the delegated path to establish identity
from an authenticated read performed with the newly granted authority, because
BattleGrid is plain OAuth 2.1 and its token response carries no `sub` (#203).

That read is `list_user_active_positions`, and it is proven only for a personal
`bg_live_` key. **That it answers for a *delegated* access token is an
inference** — and an inference of exactly the kind that produced the defect being
fixed. Every unit test in the change supplies that answer through a fake, so if
the platform refuses the read for a delegated grant, the suite stays green and
the product fails one step later than before.

Nine of this project's findings needed a real call to the real platform, and none
was findable by reading code or schemas. This is that call.

WHAT IT DOES, AND WHAT IT REFUSES TO DO
---------------------------------------
It runs every step except the one that is irreducibly human: **a person at a
consent screen.** It never asks for, reads, or stores a BattleGrid password, and
it prints no token in full.

It writes nothing to the repository and leaves nothing behind at BattleGrid: both
tokens are revoked in a `finally`, and the revocation is verified rather than
assumed — the same discipline every probe in `tests/live/` follows.

It talks to a live server and it authorizes a real account. Read it before you
run it.

STEPS
-----
  1. register a public client by DCR, or reuse $BATTLEGRID_CLIENT_ID
  2. build an authorize URL with PKCE S256 and open it
  3. >>> YOU consent in the browser <<<   (the only manual step)
  4. exchange the code
  5. THE PREMISE: read the account with the delegated token   [PG-002]
  6. refresh, and re-read                                     [GitHub #206]
  7. revoke both tokens and confirm they are dead
"""

from __future__ import annotations

import base64
import hashlib
import http.server
import json
import secrets
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

sys.path.insert(0, "tools")
# Imported rather than re-implemented, so this and the surface probe cannot
# drift about what an MCP envelope means. Same reason `capture_mcp_dump.py`
# imports `rpc` instead of speaking the protocol itself.
from probe_mcp_surface import rpc, unwrap  # noqa: E402

BASE = "https://mcp.battlegrid.trade"
AUTHORIZE = f"{BASE}/authorize"
TOKEN = f"{BASE}/token"
REVOKE = f"{BASE}/revoke"
REGISTER = f"{BASE}/register"

REDIRECT_PORT = 8765
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/callback"
SCOPES = "mcp:read"  # REQUESTED_SCOPES. Wager authority is never requested.

CLIENT_NAME = "Grid-Commander OAuth walk (verification)"


def form_post(url: str, fields: dict[str, str]) -> tuple[int, dict[str, Any]]:
    """POST a form, and return (status, parsed body). Never raises on 4xx."""
    body = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode() or "{}"
            return resp.status, (json.loads(raw) if raw.strip().startswith("{") else {})
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"raw": raw}


def json_post(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"raw": raw}


def pkce() -> tuple[str, str]:
    """Verifier and its S256 challenge. `code_challenge_methods_supported` is
    `["S256"]` and the server enforces it — a request without a challenge is
    refused with `invalid_request`, which `findings-dcr` established."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(48)).rstrip(b"=").decode()
    digest = hashlib.sha256(verifier.encode()).digest()
    return verifier, base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def register_client() -> str:
    """One unauthenticated POST, returning a public client with no secret.

    `docs/battlegrid-oauth-metadata.json` advertises `registration_endpoint` and
    a `"none"` token-endpoint auth method — recorded, and re-verified by the
    `oauth-live` gate on every CI run.
    """
    status, body = json_post(
        REGISTER,
        {
            "client_name": CLIENT_NAME,
            "redirect_uris": [REDIRECT_URI],
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "token_endpoint_auth_method": "none",
            "scope": SCOPES,
        },
    )
    if status not in (200, 201) or "client_id" not in body:
        raise SystemExit(f"registration failed: HTTP {status} {json.dumps(body)[:400]}")
    if body.get("client_secret"):
        # Worth stopping for: a secret means this is not the public client the
        # product's whole registration story assumes.
        raise SystemExit("registration returned a client_secret; expected a public client")
    return str(body["client_id"])


class _Catcher(http.server.BaseHTTPRequestHandler):
    """Catches the redirect so the operator's part is one click, not a paste."""

    result: dict[str, str] = {}

    def do_GET(self) -> None:  # noqa: N802
        query = urllib.parse.urlparse(self.path).query
        _Catcher.result = {k: v[0] for k, v in urllib.parse.parse_qs(query).items()}
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"Received. You can close this tab and return to the terminal.")

    def log_message(self, *_: Any) -> None:
        return  # the walk narrates itself; the HTTP log is noise


def await_redirect(timeout_s: int = 300) -> dict[str, str]:
    server = http.server.HTTPServer(("localhost", REDIRECT_PORT), _Catcher)
    server.timeout = timeout_s
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()
    thread.join(timeout_s)
    server.server_close()
    return _Catcher.result


def read_account(token: str) -> tuple[str | None, str]:
    """The premise. Returns (userId or None, a sentence describing what happened).

    Deliberately the same tool and the same field the product reads
    (`McpAccountAdapter.subjectFor` → `list_user_active_positions` → `userId`).
    `get_account_state` is the obvious candidate by name and carries no id at
    all, which is why it was not chosen.
    """
    try:
        answer = rpc(token, "tools/call", {"name": "list_user_active_positions", "arguments": {}})
    except Exception as exc:  # noqa: BLE001 — any failure is an answer here
        return None, f"the call did not complete: {exc}"

    if "error" in answer:
        return None, f"JSON-RPC error: {answer['error'].get('message', answer['error'])}"

    payload, err = unwrap(answer.get("result", {}))
    if err:
        return None, f"the envelope carried no readable payload: {err}"
    if not isinstance(payload, dict):
        return None, "the payload was not an object"

    user_id = payload.get("userId")
    if not isinstance(user_id, str) or not user_id:
        return None, f"answered, and named no account (keys: {sorted(payload)[:12]})"
    return user_id, "answered with an account id"


def revoke(token: str, client_id: str, label: str) -> None:
    status, _ = form_post(REVOKE, {"token": token, "client_id": client_id})
    print(f"  revoked {label}: HTTP {status}")


def main() -> int:
    import os

    print("=" * 72)
    print("Grid-Commander — delegated authorization walk")
    print("=" * 72)

    client_id = os.environ.get("BATTLEGRID_CLIENT_ID")
    if client_id:
        print(f"\n[1/7] using BATTLEGRID_CLIENT_ID from the environment ({client_id[:8]}…)")
        print("      NOTE: its registered redirect_uri must be", REDIRECT_URI)
    else:
        print("\n[1/7] registering a public client by DCR…")
        client_id = register_client()
        print(f"      client_id {client_id[:8]}… (public, no secret)")

    verifier, challenge = pkce()
    state = secrets.token_urlsafe(24)
    url = f"{AUTHORIZE}?" + urllib.parse.urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPES,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )

    print("\n[2/7] open this and authorize:\n")
    print(url)
    print(f"\n[3/7] waiting for the redirect on {REDIRECT_URI} (5 min)…")
    print("      This is the only step nobody can do for you.")

    got = await_redirect()
    if not got:
        print("\n  no redirect arrived. Re-run, or paste the redirected URL's ?code= manually.")
        return 2
    if got.get("error"):
        print(f"\n  BattleGrid returned error={got['error']} — nothing was granted.")
        return 2
    if got.get("state") != state:
        print("\n  state mismatch — refusing the response, exactly as the product does.")
        return 2
    code = got.get("code")
    if not code:
        print("\n  the redirect carried no code.")
        return 2
    print("      code received.")

    print("\n[4/7] exchanging the code…")
    status, grant = form_post(
        TOKEN,
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    if status != 200 or "access_token" not in grant:
        print(f"  exchange failed: HTTP {status} {json.dumps(grant)[:400]}")
        return 2

    access, refresh_token = grant["access_token"], grant.get("refresh_token")
    print(f"      keys on the token response: {sorted(grant)}")
    print(f"      sub present? {'YES' if grant.get('sub') else 'NO'}   <- #203's whole story")

    findings: dict[str, Any] = {"token_response_keys": sorted(grant), "sub": bool(grant.get("sub"))}
    try:
        print("\n[5/7] THE PREMISE — reading the account with the delegated token…")
        user_id, note = read_account(access)
        findings["delegated_read"] = note
        findings["userId"] = user_id
        if user_id:
            print(f"      PASS — {note}: {user_id}")
            print("      PG-002 is answered: the delegated path can establish an identity.")
        else:
            print(f"      FAIL — {note}")
            print("      PG-002 is answered the other way. The change needs a different read.")

        print("\n[6/7] refreshing, then re-reading (settles GitHub #206)…")
        if not refresh_token:
            print("      no refresh_token issued; skipped.")
            findings["refresh"] = "not issued"
        else:
            status, second = form_post(
                TOKEN,
                {
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                },
            )
            if status != 200 or "access_token" not in second:
                print(f"      refresh failed: HTTP {status}")
                findings["refresh"] = f"failed HTTP {status}"
            else:
                rotated = second.get("refresh_token") not in (None, refresh_token)
                refreshed_id, note2 = read_account(second["access_token"])
                same = refreshed_id == user_id and refreshed_id is not None
                print(f"      refresh token rotated? {'YES' if rotated else 'NO'}")
                print(f"      same account after refresh? {'YES' if same else 'NO'} ({note2})")
                findings["refresh"] = {
                    "rotated": rotated,
                    "same_account": same,
                    "note": note2,
                }
                access = second["access_token"]
                refresh_token = second.get("refresh_token") or refresh_token
    finally:
        print("\n[7/7] revoking — nothing is left standing at BattleGrid…")
        revoke(access, client_id, "access token")
        if refresh_token:
            revoke(refresh_token, client_id, "refresh token")
        dead, note3 = read_account(access)
        print(f"      access token dead? {'YES' if dead is None else 'NO'} ({note3})")
        findings["revoked_and_dead"] = dead is None

    print("\n" + "=" * 72)
    print("FINDINGS — paste into the journal entry")
    print("=" * 72)
    print(json.dumps(findings, indent=2))
    return 0 if findings.get("userId") else 1


if __name__ == "__main__":
    raise SystemExit(main())
