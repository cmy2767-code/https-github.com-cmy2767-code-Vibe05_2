// Gemini SDK는 더 이상 사용하지 않음 (REST API 직접 호출)

export function chunkText(text: string, maxSize = 800, overlap = 150): string[] {
  // 문단 단위로 먼저 분리 (빈 줄 기준)
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    // 문단 자체가 maxSize 초과 → 문장 단위로 재분할
    if (para.length > maxSize) {
      // 현재까지 모은 내용 먼저 저장
      if (current.trim()) {
        chunks.push(current.trim());
        current = current.slice(-overlap); // 오버랩 유지
      }

      // 문장 단위 분리 (마침표/개행 기준)
      const sentences = para.split(/(?<=[.!?。])\s+|\n/).filter(Boolean);
      for (const sent of sentences) {
        if (current.length + sent.length > maxSize && current.trim()) {
          chunks.push(current.trim());
          current = current.slice(-overlap) + sent;
        } else {
          current += (current ? " " : "") + sent;
        }
      }
      continue;
    }

    // 문단 추가 시 maxSize 초과 → 현재 청크 저장 후 새 청크 시작
    if (current.length + para.length + 2 > maxSize && current.trim()) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + "\n\n" + para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.trim().length > 0);
}
