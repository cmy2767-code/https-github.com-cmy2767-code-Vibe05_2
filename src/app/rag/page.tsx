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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/rag/documents");
    if (res.ok) setDocuments(await res.json());
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

    const history = messages.slice(-6); // 최근 6개 메시지 전달
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

          {/* 오른쪽: 문서 추가 버튼 */}
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
                <button
                  onClick={() => handleDelete(doc.filename)}
                  className="text-gray-400 hover:text-red-500 ml-0.5"
                >
                  <Trash2 size={12} />
                </button>
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
