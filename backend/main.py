from fastapi import FastAPI

app = FastAPI()


@app.get("/api/agent/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/agent/analyze")
def analyze() -> dict:
    return {
        "overall_score": 0,
        "strengths": [],
        "priority_fixes": [],
        "section_notes": {},
        "ats_warnings": ["placeholder response — agent not wired up yet"],
    }
