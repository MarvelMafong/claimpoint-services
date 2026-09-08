'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ChatWidget.module.css';

const POLL_INTERVAL_MS = 5000;
const POSITION_KEY = 'claimpoint_chat_position';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [position, setPosition] = useState(null); // null = default CSS position
  const [dragging, setDragging] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef(null);
  const dragStartRef = useRef(null);

  // Only tracks the keyboard while the message input is actually
  // focused — previously listened for any viewport change at all,
  // which also fires when the browser's own address bar hides/shows
  // during normal scrolling, permanently shifting the bubble upward
  // even with no keyboard open.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport || !inputFocused) {
      setKeyboardOffset(0);
      return;
    }
    function handleViewportChange() {
      const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
      setKeyboardOffset(offset > 0 ? offset : 0);
    }
    handleViewportChange();
    window.visualViewport.addEventListener('resize', handleViewportChange);
    return () => {
      window.visualViewport.removeEventListener('resize', handleViewportChange);
    };
  }, [inputFocused]);

  useEffect(() => {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {
        // ignore corrupted saved position, falls back to default
      }
    }
  }, []);

  useEffect(() => {
    if (!open || conversationId) return;
    fetch('/api/chat/conversations')
      .then((res) => res.json())
      .then((json) => {
        if (json.conversation) setConversationId(json.conversation.id);
      })
      .catch(() => {});
  }, [open, conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    async function poll() {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
        if (res.ok) {
          const json = await res.json();
          setMessages(json.messages);
        }
      } catch {
        // silent — retries on the next 5s tick
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !conversationId) return;
    setSending(true);
    const messageText = draft;
    setDraft('');
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: messageText }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.message]);
      }
    } catch {
      // message stays lost from view but conversation/polling recovers on
      // next tick; a production version would show a retry affordance here
    }
    setSending(false);
  }

  // Drag handling — a real drag (moved more than a few px) repositions the
  // bubble and saves it; anything shorter than that still counts as a
  // normal click, so dragging doesn't break opening the chat.
  function handlePointerDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e) {
    if (!dragStartRef.current) return;
    const dx = Math.abs(e.clientX - dragStartRef.current.startX);
    const dy = Math.abs(e.clientY - dragStartRef.current.startY);
    if (dx > 5 || dy > 5) {
      dragStartRef.current.moved = true;
      setDragging(true);
    }
    if (dragStartRef.current.moved) {
      const newLeft = e.clientX - dragStartRef.current.offsetX;
      const newTop = e.clientY - dragStartRef.current.offsetY;
      const maxLeft = window.innerWidth - 56;
      const maxTop = window.innerHeight - 56;
      setPosition({
        left: Math.min(Math.max(newLeft, 8), maxLeft),
        top: Math.min(Math.max(newTop, 8), maxTop),
      });
    }
  }

  function handlePointerUp() {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    if (dragStartRef.current?.moved && position) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    }
    const wasDrag = dragStartRef.current?.moved;
    dragStartRef.current = null;
    // Delay clearing "dragging" so the click handler (which fires right
    // after pointerup) can see it and skip toggling open.
    setTimeout(() => setDragging(false), 0);
    return wasDrag;
  }

  function handleLauncherClick() {
    if (dragging) return;
    setOpen((o) => !o);
  }

  const launcherStyle = position
    ? { position: 'fixed', left: position.left, top: position.top, bottom: 'auto', right: 'auto' }
    : undefined;

  const panelStyle = {
    ...(position
      ? { position: 'fixed', left: position.left, top: Math.max(position.top - 420, 8), bottom: 'auto', right: 'auto' }
      : {}),
    // Shifts the whole panel up by exactly the keyboard's height —
    // works regardless of whether it's in its default position or
    // dragged somewhere custom.
    transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
  };

  return (
    <>
      <button
        className={styles.launcher}
        style={launcherStyle}
        onPointerDown={handlePointerDown}
        onClick={handleLauncherClick}
        type="button"
        aria-label="Live chat — drag to move, click to open"
      >
        {open ? '×' : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {open && (
        <div className={styles.panel} style={panelStyle}>
          <div className={styles.head}>Live chat</div>
          <div className={styles.messages} ref={scrollRef}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>Send a message and a ClaimPoint team member will respond shortly.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`${styles.bubble} ${m.sender_type === 'customer' ? styles.customer : styles.admin}`}>
                {m.message}
              </div>
            ))}
          </div>
          <form className={styles.inputRow} onSubmit={handleSend}>
            <input
              type="text"
              autoComplete="off"
              placeholder="Type a message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !draft.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}