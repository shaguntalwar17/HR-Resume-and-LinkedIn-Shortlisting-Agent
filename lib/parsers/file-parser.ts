import mammoth from "mammoth";
import PDFParser from "pdf2json";

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
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
      pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
      pdfParser.parseBuffer(buffer);
    });
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
