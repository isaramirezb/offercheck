import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

const MAX_MB = 5;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return Response.json({ error: "Only PDF and DOCX files are supported." }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return Response.json({ error: `File must be under ${MAX_MB} MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let resumeText: string;
  try {
    if (file.type === "application/pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      resumeText = text as string;
    } else {
      const parsed = await mammoth.extractRawText({ buffer });
      resumeText = parsed.value;
    }
  } catch {
    return Response.json({ error: "Could not read file. Make sure it is a valid PDF or DOCX." }, { status: 400 });
  }

  if (!resumeText.trim()) {
    return Response.json({ error: "The file appears to be empty or image-only." }, { status: 400 });
  }

  const backendRes = await fetch(`${BACKEND_URL}/api/agent/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: resumeText, target_role: "Software Engineer" }),
  });

  if (!backendRes.ok) {
    return Response.json({ error: "Analysis service unavailable. Please try again." }, { status: 502 });
  }

  const result = await backendRes.json();
  return Response.json(result);
}
