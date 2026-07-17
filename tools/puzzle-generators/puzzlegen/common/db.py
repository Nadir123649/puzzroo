"""MongoDB connection + collection helpers.

Reads MONGO_URI from the project's .env.local (or env / --mongo-uri). Mirrors the
Next.js app's SRV fallback: if `mongodb+srv://` resolution fails, resolve the SRV
(+ TXT options) via dnspython and build a direct `mongodb://host1,host2,.../db`
connection string.
"""
from __future__ import annotations

import os
import urllib.parse
from pathlib import Path

from pymongo import MongoClient, ASCENDING


def _find_env_local(start: Path) -> Path | None:
    for parent in [start, *start.parents]:
        candidate = parent / ".env.local"
        if candidate.is_file():
            return candidate
    return None


def load_mongo_uri(explicit: str | None = None) -> str:
    if explicit:
        return explicit
    if os.environ.get("MONGO_URI"):
        return os.environ["MONGO_URI"]

    env_path = _find_env_local(Path(__file__).resolve())
    if env_path:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("MONGO_URI="):
                val = line[len("MONGO_URI="):].strip()
                if (val.startswith('"') and val.endswith('"')) or (
                    val.startswith("'") and val.endswith("'")
                ):
                    val = val[1:-1]
                return val
    raise RuntimeError(
        "MONGO_URI not found. Set it in .env.local, the MONGO_URI env var, or pass --mongo-uri."
    )


def _db_name_from_uri(uri: str, default: str = "puzzroo") -> str:
    without_scheme = uri.split("://", 1)[-1]
    after_host = without_scheme.split("/", 1)
    if len(after_host) < 2 or not after_host[1]:
        return default
    path = after_host[1].split("?", 1)[0]
    return path or default


def _build_direct_uri(srv_uri: str) -> str:
    """Resolve an mongodb+srv URI to a direct mongodb:// URI via dnspython."""
    import dns.resolver

    parsed = urllib.parse.urlparse(srv_uri.replace("mongodb+srv://", "mongodb://"))
    hostname = parsed.hostname
    db_name = _db_name_from_uri(srv_uri)

    srv_records = dns.resolver.resolve(f"_mongodb._tcp.{hostname}", "SRV")
    hosts = ",".join(f"{r.target.to_text().rstrip('.')}:{r.port}" for r in srv_records)

    # SRV connections default to these; also merge any TXT-provided options.
    options = {"ssl": "true", "authSource": "admin", "retryWrites": "true", "w": "majority"}
    try:
        for txt in dns.resolver.resolve(hostname, "TXT"):
            raw = b"".join(txt.strings).decode("utf-8")
            for pair in raw.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    options[k] = v
    except Exception:
        pass

    creds = ""
    if parsed.username:
        creds = urllib.parse.quote(urllib.parse.unquote(parsed.username), safe="")
        if parsed.password:
            creds += ":" + urllib.parse.quote(urllib.parse.unquote(parsed.password), safe="")
        creds += "@"

    query = "&".join(f"{k}={v}" for k, v in options.items())
    return f"mongodb://{creds}{hosts}/{db_name}?{query}"


_client: MongoClient | None = None
_db = None


def get_db(mongo_uri: str | None = None):
    global _client, _db
    if _db is not None:
        return _db

    uri = load_mongo_uri(mongo_uri)
    db_name = _db_name_from_uri(uri)

    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=15000)
        client.admin.command("ping")
    except Exception:
        if uri.startswith("mongodb+srv://"):
            direct = _build_direct_uri(uri)
            client = MongoClient(direct, serverSelectionTimeoutMS=15000)
            client.admin.command("ping")
        else:
            raise

    _client = client
    _db = client[db_name]
    return _db


COLLECTIONS = {
    "sudoku": "sudoku_puzzles",
    "crossmath": "crossmath_puzzles",
    "nonogram": "nonogram_puzzles",
}


def get_collection(game: str, mongo_uri: str | None = None):
    db = get_db(mongo_uri)
    coll = db[COLLECTIONS[game]]
    _ensure_indexes(coll)
    return coll


_indexed: set[str] = set()


def _ensure_indexes(coll) -> None:
    if coll.name in _indexed:
        return
    coll.create_index([("hash", ASCENDING)], unique=True, name="uniq_hash")
    coll.create_index([("puzzleId", ASCENDING)], unique=True, name="uniq_puzzleId")
    coll.create_index([("difficulty", ASCENDING), ("size", ASCENDING)], name="difficulty_size")
    _indexed.add(coll.name)
