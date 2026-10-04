'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, MessageSquare, Sparkles, X } from 'lucide-react';
import { cx } from '@/lib/cx';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  'Hôm nay tôi còn thiếu bao nhiêu calo?',
  'Gợi ý bữa phụ 30g protein ít calo',
  'Trưa nay ăn 200g ức gà, 150g cơm',
  'Bench press 80kg 6 reps rpe 8',
];

function nowLabel() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function CoachChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: 'Chào bạn, mình là Coach phụ trách dinh dưỡng và buổi tập. Nhắn tên món kèm số gram hoặc set vừa tập, mình ghi thẳng vào file ngày.',
      time: 'Vừa xong',
    },
  ]);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen, loading]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  async function handleSend(textToSend?: string) {
    const content = (textToSend ?? input).trim();
    if (!content || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text: content, time: nowLabel() },
    ]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          sender: 'coach',
          text: data.reply || 'Mình đã nhận thông tin.',
          time: nowLabel(),
        },
      ]);

      if (data.actionTaken) {
        window.dispatchEvent(new CustomEvent('fitness-data-updated'));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'coach',
          text: 'Không kết nối được Coach lúc này. Kiểm tra lại sau giây lát nhé.',
          time: nowLabel(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* One floating action, in the single brand blue. */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 r-chip bg-primary pl-4 pr-5 text-body-sm font-medium text-white elev-2 transition-transform hover:bg-primary-active active:scale-[0.97]"
      >
        <MessageSquare className="h-4 w-4" strokeWidth={2} />
        Hỏi Coach
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Coach dinh dưỡng và buổi tập"
            className="animate-drawer-in relative z-10 flex h-full w-full max-w-md flex-col border-l border-hairline bg-surface"
          >
            <header className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center r-card bg-night text-white">
                <Bot className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-body-sm font-semibold text-ink">Coach dinh dưỡng</h2>
                <p className="text-[12px] text-ink-muted">
                  Bóc tách calo và ghi nhật ký thay bạn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng trợ lý"
                className="flex h-8 w-8 items-center justify-center r-utility text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Suggestion chips scroll horizontally; nothing loops or marquees. */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-hairline-soft px-4 py-2.5 no-scrollbar">
              <span className="flex flex-shrink-0 items-center gap-1 text-[12px] text-ink-faint">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> Gợi ý
              </span>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="flex-shrink-0 r-chip border border-hairline bg-surface px-2.5 py-1 text-[12px] text-ink-secondary transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((m) =>
                m.sender === 'coach' ? (
                  <div key={m.id} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center r-chip bg-canvas text-ink-muted">
                      <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <div className="max-w-[82%] r-card bg-canvas px-3 py-2.5">
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-secondary">
                        {m.text}
                      </p>
                      <span className="mt-1.5 block font-metric text-[10px] text-ink-faint">
                        {m.time}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[82%] r-card bg-primary px-3 py-2.5">
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-white">
                        {m.text}
                      </p>
                      <span className="mt-1.5 block font-metric text-[10px] text-white/65">
                        {m.time}
                      </span>
                    </div>
                  </div>
                ),
              )}

              {loading ? (
                <div className="flex items-center gap-2.5 pl-9">
                  <span className="flex gap-1">
                    {[0, 0.15, 0.3].map((delay) => (
                      <span
                        key={delay}
                        className="h-1.5 w-1.5 animate-bounce r-chip bg-ink-faint"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </span>
                  <span className="text-[12px] text-ink-muted">Coach đang phân tích...</span>
                </div>
              ) : null}

              <div ref={scrollAnchor} />
            </div>

            <div className="border-t border-hairline bg-canvas px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhắn món ăn hoặc set tập vừa hoàn thành"
                  aria-label="Nội dung nhắn cho Coach"
                  disabled={loading}
                  className="flex-1 r-input border border-hairline bg-surface px-3 py-2 text-[13px] text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Gửi tin nhắn"
                  className={cx(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center r-chip transition-colors',
                    input.trim() && !loading
                      ? 'bg-primary text-white hover:bg-primary-active'
                      : 'bg-hairline-soft text-ink-faint',
                  )}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </form>
              <p className="mt-2 text-[11px] text-ink-faint">
                Mẹo: ghi kèm khối lượng theo gram, ví dụ &ldquo;200g ức gà&rdquo;, để Coach lưu chính xác.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
