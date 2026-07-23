import os

from strands import Agent, tool
from strands.models.anthropic import AnthropicModel

SYSTEM_PROMPT = """You are an expert resume reviewer for software engineer roles at top tech companies (Google, Meta, Amazon, Apple, Microsoft, Netflix, etc.).

Analyze the provided resume across these dimensions:
1. Impact & seniority signals — quantified achievements, scope of work, leadership indicators
2. ATS compatibility — keyword density, formatting clarity, section header conventions
3. Big tech alignment — relevant skills, scale of systems, algorithm/system design signals
4. Section quality — effectiveness of each major section (summary, experience, education, skills, projects)

When your analysis is complete, call submit_analysis with your structured findings.
Be specific and actionable. Focus on what will actually help the candidate get an interview at a top tech company."""


def run_agent(resume_text: str) -> dict:
    result_holder: list[dict | None] = [None]

    def _submit(
        overall_score: int,
        strengths: list[str],
        priority_fixes: list[str],
        ats_warnings: list[str],
        section_notes: dict[str, str],
    ) -> str:
        """Submit the final structured resume analysis. Call this exactly once when done.

        overall_score: integer 0-100 rating for big tech SWE roles
        strengths: 2-4 specific positive highlights from the resume
        priority_fixes: 3-5 actionable improvements ordered by impact
        ats_warnings: ATS parsing issues found (empty list if none)
        section_notes: dict of section name to specific feedback
        """
        result_holder[0] = {
            "overall_score": overall_score,
            "strengths": strengths,
            "priority_fixes": priority_fixes,
            "ats_warnings": ats_warnings,
            "section_notes": section_notes,
        }
        return "Analysis submitted."

    submit_tool = tool(_submit)

    model = AnthropicModel(
        client_args={"api_key": os.environ["ANTHROPIC_API_KEY"]},
        model_id="claude-sonnet-4-6",
        max_tokens=2048,
    )

    agent = Agent(
        model=model,
        tools=[submit_tool],
        system_prompt=SYSTEM_PROMPT,
        callback_handler=None,
    )

    agent(
        f"Analyze this resume for software engineer roles at big tech companies:\n\n{resume_text}"
    )

    if result_holder[0] is None:
        raise RuntimeError("Agent did not call submit_analysis — analysis incomplete")

    return result_holder[0]
