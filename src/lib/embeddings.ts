const HF_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (!process.env.HF_API_KEY || texts.length === 0) {
    return texts.map(() => null);
  }

  // 전체 임베딩 생성에 25초 제한 — 초과 시 전부 null 반환
  try {
    return await Promise.race([
      generateEmbeddings(texts),
      new Promise<(number[] | null)[]>((resolve) =>
        setTimeout(() => {
          console.log("[embeddings] 25초 초과, 키워드 검색으로 폴백");
          resolve(texts.map(() => null));
        }, 25000)
      ),
    ]);
  } catch {
    return texts.map(() => null);
  }
}

async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const BATCH_SIZE = 8;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResult = await fetchBatch(batch);
    results.push(...(batchResult ?? batch.map(() => null)));
  }

  return results;
}

async function fetchBatch(batch: string[]): Promise<(number[] | null)[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 배치당 10초

    const res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: batch, options: { wait_for_model: true } }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[embeddings] HF API ${res.status}`);
      return null;
    }

    const data: number[][] | number[][][] = await res.json();
    return data.map((emb) =>
      Array.isArray(emb[0]) ? (emb as number[][])[0] : (emb as number[])
    );
  } catch (e) {
    console.error("[embeddings] 배치 실패:", e);
    return null;
  }
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const results = await getEmbeddings([text]);
  return results[0];
}
