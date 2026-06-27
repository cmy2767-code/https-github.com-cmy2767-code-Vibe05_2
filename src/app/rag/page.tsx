"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Trash2,
  Send,
  FileText,
  Loader2,
  Bot,
  User,
  LogOut,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  BookOpen,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Document {
  filename: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function RagPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [docOpen, setDocOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/rag/documents");
    if (res.ok) setDocuments(await res.json());
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(d.isAdmin));
    if (!sessionStorage.getItem("notice_seen")) {
      setShowNotice(true);
    }
  }, [fetchDocuments]);

  function closeNotice() {
    setShowNotice(false);
    sessionStorage.setItem("notice_seen", "1");
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError("");

    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(
        files.length > 1 ? `${i + 1} / ${files.length} 처리 중...` : "처리 중..."
      );

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        errors.push(`${file.name}: ${data.error ?? "업로드 실패"}`);
      }
    }

    setUploading(false);
    setUploadProgress("");

    if (errors.length > 0) {
      setUploadError(errors.join("\n"));
    }

    await fetchDocuments();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(filename: string) {
    await fetch("/api/rag/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    await fetchDocuments();
  }

  async function handleSend() {
    const q = question.trim();
    if (!q || thinking) return;

    const history = messages.slice(-4); // 최근 4개 메시지 전달 (토큰 절약)
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setThinking(true);

    const res = await fetch("/api/rag/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, history }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errText || "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
      setThinking(false);
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: updated[updated.length - 1].content + chunk,
        };
        return updated;
      });
    }

    setThinking(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canCollapse = documents.length >= 2;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: 'white' }}>

      {/* 안내 팝업 */}
      {showNotice && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={closeNotice}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px',
              width: '100%', maxWidth: '380px',
              maxHeight: '80vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 팝업 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={20} color="#4F46E5" />
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>서비스 안내</span>
              </div>
              <button onClick={closeNotice} style={{ color: '#9CA3AF', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* 1. 업로드 문서 안내 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <BookOpen size={15} color="#4F46E5" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>업로드된 문서</span>
                </div>
                <div style={{ background: '#F5F3FF', borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7', margin: 0 }}>
                    본 서비스에는 <strong>공개된 법령·지침·고시</strong> 등
                    누구나 열람 가능한 문서만 업로드되어 있습니다.
                  </p>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '8px 0 0', lineHeight: '1.7' }}>
                    예시) 소프트웨어 진흥법, 공공소프트웨어사업 과업심의 가이드
                  </p>
                </div>
              </div>

              {/* 2. 보안 및 저장 안내 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <ShieldCheck size={15} color="#4F46E5" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>문의 내용 저장 여부</span>
                </div>
                <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                    <strong style={{ color: '#15803D' }}>✓ 질문·대화 내용</strong>은 서버에 저장되지 않습니다.<br />
                    AI 답변 생성에만 사용되며, 새로고침하면 사라집니다.
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                    <strong style={{ color: '#15803D' }}>✓ 문서 텍스트</strong>는 Supabase(클라우드 DB)에 저장됩니다.
                    전송 구간은 HTTPS로 암호화되며, 외부에서 직접 접근할 수 없습니다.
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                    <strong style={{ color: '#15803D' }}>✓ AI 처리</strong>는 Groq(미국 서버)를 통해 이루어지며,
                    API 사용 데이터는 AI 학습에 활용되지 않습니다.
                  </div>
                </div>
              </div>

              {/* 3. 무료 사용 범위 및 제한 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Zap size={15} color="#D97706" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>무료 사용 범위 및 제한</span>
                </div>
                <div style={{ background: '#FFFBEB', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                    <strong style={{ color: '#92400E' }}>AI 답변 (Groq 무료)</strong><br />
                    하루 최대 약 <strong>400회</strong> 질문 가능, 분당 30회 제한.<br />
                    여러 명이 동시에 사용하면 느려지거나 잠시 차단될 수 있어요.
                  </div>
                  <div style={{ borderTop: '1px solid #FDE68A', margin: '2px 0' }} />
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                    <strong style={{ color: '#92400E' }}>문서 저장 (Supabase 무료)</strong><br />
                    최대 <strong>500MB</strong>까지 저장 가능.<br />
                    텍스트만 저장하므로 수백 개 문서도 거뜬해요.
                  </div>
                  <div style={{ borderTop: '1px solid #FDE68A', margin: '2px 0' }} />
                  <div style={{ fontSize: '13px', color: '#92400E', lineHeight: '1.7', fontStyle: 'italic' }}>
                    ※ 사용량이 많아지면 유료 플랜 전환이 필요할 수 있습니다.
                  </div>
                </div>
              </div>

              <button
                onClick={closeNotice}
                style={{
                  width: '100%', padding: '12px',
                  background: '#4F46E5', color: 'white',
                  border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-indigo-600 text-white">
        <Bot size={20} />
        <h1 className="font-semibold text-base flex-1">문서 AI 챗봇</h1>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>

      {/* 문서 섹션 */}
      <div className="px-4 pt-3 pb-2 border-b">
        <div className="flex items-center justify-between mb-2">
          {/* 왼쪽: 문서 수 + 접기/펼치기 토글 */}
          <button
            className="flex items-center gap-1 text-sm font-medium text-gray-700 disabled:cursor-default"
            onClick={() => canCollapse && setDocOpen((v) => !v)}
            disabled={!canCollapse}
          >
            <span>업로드된 문서 ({documents.length})</span>
            {canCollapse && (
              docOpen
                ? <ChevronUp size={14} className="text-gray-400" />
                : <ChevronDown size={14} className="text-gray-400" />
            )}
          </button>

          {/* 오른쪽: 문서 추가 버튼 (관리자만) */}
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : (
                  <Upload size={14} className="mr-1" />
                )}
                {uploading ? uploadProgress : "문서 추가"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.xls,.txt"
                className="hidden"
                multiple
                onChange={handleUpload}
              />
            </>
          )}
        </div>

        {uploadError && (
          <p className="text-xs text-red-500 mb-2 whitespace-pre-wrap">{uploadError}</p>
        )}

        {/* 문서 목록 — 0개: 안내문구 / 1개: 항상 표시 / 2개 이상: 접기/펼치기 */}
        {documents.length === 0 ? (
          <p className="text-xs text-gray-400 py-1">
            PDF, DOCX, XLSX 파일을 업로드하세요 (여러 개 동시 선택 가능)
          </p>
        ) : (!canCollapse || docOpen) ? (
          <div className="flex flex-wrap gap-1">
            {documents.map((doc) => (
              <div
                key={doc.filename}
                className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5"
              >
                <FileText size={12} className="text-indigo-500" />
                <span className="text-xs text-indigo-700 max-w-[140px] truncate">
                  {doc.filename}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(doc.filename)}
                    className="text-gray-400 hover:text-red-500 ml-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-0.5">
            펼쳐서 목록 확인 · 문서 {documents.length}개 등록됨
          </p>
        )}
      </div>

      {/* 채팅 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
            <Bot size={40} className="text-indigo-200" />
            <p className="text-sm">문서를 업로드하고 질문해보세요</p>
            <p className="text-xs">예: "이 계약서의 주요 조항은 뭐야?"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-indigo-600" />
              </div>
            )}
            <Card
              className={`px-3 py-2 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white border-0"
                  : "bg-gray-50 text-gray-800"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && msg.content === "" && (
                <Loader2 size={14} className="animate-spin text-gray-400" />
              )}
            </Card>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ flexShrink: 0, padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid #e5e7eb', background: 'white' }}>
        <div className="flex gap-2 items-end">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="문서 내용에 대해 질문하세요..."
            className="resize-none min-h-[44px] max-h-[120px]"
            style={{ fontSize: '16px' }}
            rows={1}
            disabled={thinking}
          />
          <Button
            onClick={handleSend}
            disabled={!question.trim() || thinking}
            className="bg-indigo-600 hover:bg-indigo-700 h-11 w-11 p-0 flex-shrink-0"
          >
            {thinking ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          Enter로 전송 · Shift+Enter 줄바꿈
        </p>
      </div>
    </div>
  );
}
