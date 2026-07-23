import os
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.run import run_agent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

_ratelimit = None

_ALLOWLISTED_IPS = {
    ip.strip()
    for ip in os.environ.get("RATE_LIMIT_ALLOWLIST", "").split(",")
    if ip.strip()
}


def _get_ratelimit():
    global _ratelimit
    if _ratelimit is None and os.environ.get("UPSTASH_REDIS_REST_URL"):
        from upstash_ratelimit import Ratelimit, SlidingWindow
        from upstash_redis import Redis

        _ratelimit = Ratelimit(
            redis=Redis.from_env(),
            limiter=SlidingWindow(max_requests=10, window=86400),
        )
    return _ratelimit


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class AnalyzeRequest(BaseModel):
    resume_text: str
    target_role: str = "Software Engineer"


@app.get("/api/agent/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/agent/analyze")
def analyze(body: AnalyzeRequest, request: Request) -> dict:
    ip = _client_ip(request)

    if ip not in _ALLOWLISTED_IPS:
        rl = _get_ratelimit()
        if rl:
            check = rl.limit(f"analyze:{ip}")
            if not check.allowed:
                reset_in_h = max(1, int((check.reset - time.time()) / 3600) + 1)
                raise HTTPException(
                    status_code=429,
                    detail=f"Daily limit reached. Try again in {reset_in_h}h.",
                )

    try:
        return run_agent(body.resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
