"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Lock, Loader2 } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/rag";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "오류가 발생했습니다.");
      setPassword("");
      inputRef.current?.focus();
      return;
    }

    router.push(from);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Bot size={32} color="white" />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", margin: 0 }}>
            문서 AI 챗봇
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "6px" }}>
            팀 전용 서비스입니다
          </p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              <Lock size={14} />
              비밀번호
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="팀 비밀번호를 입력하세요"
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: "16px",
                border: error ? "1.5px solid #EF4444" : "1.5px solid #D1D5DB",
                borderRadius: "10px",
                outline: "none",
                boxSizing: "border-box",
                background: "white",
              }}
            />
            {error && (
              <p style={{ fontSize: "13px", color: "#EF4444", marginTop: "6px" }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!password.trim() || loading}
            style={{
              width: "100%",
              padding: "13px",
              fontSize: "15px",
              fontWeight: 600,
              color: "white",
              background: !password.trim() || loading ? "#A5B4FC" : "#4F46E5",
              border: "none",
              borderRadius: "10px",
              cursor: !password.trim() || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            {loading ? "확인 중..." : "입장하기"}
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center", marginTop: "20px" }}>
          한 번 로그인하면 7일간 자동 유지됩니다
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
