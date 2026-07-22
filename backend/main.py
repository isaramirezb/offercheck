from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class AnalyzeRequest(BaseModel):
    resume_text: str
    target_role: str = "Software Engineer"


@app.get("/api/agent/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/agent/analyze")
def analyze(body: AnalyzeRequest) -> dict:
    return {
        "overall_score": 0,
        "strengths": [],
        "priority_fixes": [],
        "section_notes": {},
        "ats_warnings": ["placeholder response — agent not wired up yet"],
    }
