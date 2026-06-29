const JINA_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v2-base-multilingual";

const HF_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];

  // Jina AI 우선 (항상 켜져 있음, 무료 월 1M 토큰)
  if (process.env.JINA_API_KEY) {
    try {
      const results = await jinaEmbeddings(texts, "retrieval.passage");
      if (results.some((r) => r !== null)) return results;
    } catch (e) {
      console.error("[embeddings] Jina 실패:", e);
    }
  }

  // HF 폴백
  if (process.env.HF_API_KEY) {
    try {
      return await Promise.race([
        hfEmbeddings(texts),
        new Promise<(number[] | null)[]>((resolve) =>
          setTimeout(() => resolve(texts.map(() => null)), 25000)
        ),
      ]);
    } catch {
      return texts.map(() => null);
    }
  }

  return texts.map(() => null);
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (process.env.JINA_API_KEY) {
    try {
      const results = await jinaEmbeddings([text], "retrieval.query");
      if (results[0]) return results[0];
    } catch (e) {
      console.error("[embeddings] Jina query 실패:", e);
    }
  }

  if (process.env.HF_API_KEY) {
    const results = await getEmbeddings([text]);
    return results[0];
  }

  return null;
}

async function jinaEmbeddings(
  texts: string[],
  task: "retrieval.passage" | "retrieval.query"
): Promise<(number[] | null)[]> {
  const res = await fetch(JINA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: JINA_MODEL, task }),
  });

  if (!res.ok) {
    console.error(`[embeddings] Jina API ${res.status}: ${await res.text()}`);
    return texts.map(() => null);
  }

  const data = await res.json() as { data: { embedding: number[]; index: number }[] };
  const sorted = data.data.sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

async function hfEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const BATCH_SIZE = 8;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
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

      if (!res.ok) { results.push(...batch.map(() => null)); continue; }

      const data: number[][] | number[][][] = await res.json();
      results.push(...data.map((emb) =>
        Array.isArray(emb[0]) ? (emb as number[][])[0] : (emb as number[])
      ));
    } catch {
      results.push(...batch.map(() => null));
    }
  }

  return results;
}
