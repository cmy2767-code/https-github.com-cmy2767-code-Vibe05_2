const HF_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

// 텍스트 배열을 임베딩 벡터 배열로 변환 (HF Inference API)
export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (!process.env.HF_API_KEY || texts.length === 0) {
    console.log("[embeddings] HF_API_KEY 없음, 스킵");
    return texts.map(() => null);
  }

  const BATCH_SIZE = 8;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embedding = await fetchWithRetry(batch);
    if (embedding) {
      results.push(...embedding);
    } else {
      results.push(...batch.map(() => null));
    }
  }

  return results;
}

async function fetchWithRetry(batch: string[]): Promise<(number[] | null)[] | null> {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(HF_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: batch,
          options: { wait_for_model: true },
        }),
      });

      if (res.ok) {
        const data: number[][] | number[][][] = await res.json();
        return data.map((emb) => {
          if (Array.isArray(emb[0])) return (emb as number[][])[0];
          return emb as number[];
        });
      }

      // 503: 모델 로딩 중 → 대기 후 재시도
      if (res.status === 503) {
        const errData = await res.json().catch(() => ({})) as { estimated_time?: number };
        const waitMs = Math.min((errData.estimated_time ?? 10) * 1000, 20000);
        console.log(`[embeddings] 모델 로딩 중, ${waitMs}ms 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // 그 외 오류
      const errText = await res.text().catch(() => "");
      console.error(`[embeddings] HF API 오류 ${res.status}: ${errText}`);
      return null;

    } catch (e) {
      console.error(`[embeddings] fetch 실패 (${attempt + 1}/${MAX_RETRIES}):`, e);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.error("[embeddings] 최대 재시도 횟수 초과");
  return null;
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const results = await getEmbeddings([text]);
  return results[0];
}
