const HF_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

// 텍스트 배열을 임베딩 벡터 배열로 변환 (HF Inference API)
export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (!process.env.HF_API_KEY || texts.length === 0) {
    return texts.map(() => null);
  }

  const BATCH_SIZE = 8;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

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

      if (!res.ok) {
        results.push(...batch.map(() => null));
        continue;
      }

      const data: number[][] | number[][][] = await res.json();

      for (const emb of data) {
        // [[f1, f2, ...]] 형태면 unwrap
        if (Array.isArray(emb[0])) {
          results.push((emb as number[][])[0]);
        } else {
          results.push(emb as number[]);
        }
      }
    } catch {
      results.push(...batch.map(() => null));
    }
  }

  return results;
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const results = await getEmbeddings([text]);
  return results[0];
}
