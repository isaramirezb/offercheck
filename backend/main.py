from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agent.run import run_agent

app = FastAPI()


class AnalyzeRequest(BaseModel):
    resume_text: str
    target_role: str = "Software Engineer"


@app.get("/api/agent/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/agent/analyze")
def analyze(body: AnalyzeRequest) -> dict:
    try:
        return run_agent(body.resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
