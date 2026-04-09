import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    // Parse PDF using unpdf
    const { text } = await extractText(buffer);

    // Join pages and clean up the text - remove excessive whitespace
    const joinedText = Array.isArray(text) ? text.join("\n\n") : text;
    const cleanedText = joinedText
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    // Limit text length to avoid token limits
    const maxLength = 8000;
    const truncatedText = cleanedText.length > maxLength
      ? cleanedText.slice(0, maxLength) + "\n\n[... content truncated for length ...]"
      : cleanedText;

    return NextResponse.json({
      text: truncatedText,
    });
  } catch (error) {
    console.error("PDF extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract text from PDF" },
      { status: 500 }
    );
  }
}
