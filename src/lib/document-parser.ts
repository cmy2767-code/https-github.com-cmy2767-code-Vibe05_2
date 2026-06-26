export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return `[${name}]\n` + XLSX.utils.sheet_to_csv(sheet);
    }).join("\n\n");
  }

  if (lower.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error(
    `지원하지 않는 파일 형식입니다. PDF, DOCX, XLSX, TXT 파일을 사용해주세요.`
  );
}
