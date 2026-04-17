import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 50000; // 50K chars

type FileType = "pdf" | "text" | "image" | "docx";

interface ExtractionResult {
  text: string;
  fileType: FileType;
  fileName: string;
}

function getFileType(file: File): FileType | null {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (type.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(name)) {
    return "image";
  }
  if (
    type === "text/plain" ||
    type === "text/markdown" ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  ) {
    return "text";
  }

  return null;
}

async function extractFromPdf(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);
  const { text } = await extractText(buffer);

  const joinedText = Array.isArray(text) ? text.join("\n\n") : text;
  return cleanText(joinedText);
}

async function extractFromDocx(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const result = await mammoth.extractRawText({ buffer });
  return cleanText(result.value);
}

async function extractFromText(file: File): Promise<string> {
  const text = await file.text();
  return cleanText(text);
}

async function extractFromImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // Determine media type
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
  if (file.type === "image/png") mediaType = "image/png";
  else if (file.type === "image/gif") mediaType = "image/gif";
  else if (file.type === "image/webp") mediaType = "image/webp";

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-0",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extract all text content from this image. This appears to be educational material (syllabus, curriculum, course outline, or study notes).

Output ONLY the extracted text, preserving the structure (headings, lists, sections) as much as possible. Do not add commentary or interpretation.

If this is a table of contents or curriculum outline, preserve the hierarchy and chapter/topic structure.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content[0];
  if (textBlock.type !== "text") {
    throw new Error("Unexpected response type from vision API");
  }

  return cleanText(textBlock.text);
}

function cleanText(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const fileType = getFileType(file);
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, TXT, or image files." },
        { status: 400 }
      );
    }

    let extractedText: string;

    switch (fileType) {
      case "pdf":
        extractedText = await extractFromPdf(file);
        break;
      case "docx":
        extractedText = await extractFromDocx(file);
        break;
      case "text":
        extractedText = await extractFromText(file);
        break;
      case "image":
        extractedText = await extractFromImage(file);
        break;
    }

    // Truncate if too long
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_TEXT_LENGTH) +
        "\n\n[... content truncated for length ...]";
    }

    const result: ExtractionResult = {
      text: extractedText,
      fileType,
      fileName: file.name,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Content extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract content from file" },
      { status: 500 }
    );
  }
}
