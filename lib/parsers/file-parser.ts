import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function extractTextFromUpload(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (extension === "txt") {
    return buffer.toString("utf-8");
  }

  if (extension === "docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (extension === "pdf") {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text;
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
