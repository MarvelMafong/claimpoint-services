'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AdminChatWorkspace.module.css';

const POLL_INTERVAL_MS = 5000;

export default function AdminChatWorkspace({ initialConversations }) {
  const [conversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!selectedId) return;

    async function poll() {
      const res = await fetch(`/api/admin/chat/conversation-messages?conversationId=${selectedId}`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !selectedId) return;

    setSending(true);
    const text = draft;
    setDraft('');

    const res = await fetch('/api/admin/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedId, message: text }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) => [...prev, json.message]);
    }
    setSending(false);
  }

  if (conversations.length === 0) {
    return <div className={styles.emptyWrap}>No open conversations right now.</div>;
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.list}>
        {conversations.map((c) => (
          <button
            key={c.id}
            className={`${styles.convRow} ${selectedId === c.id ? styles.active : ''}`}
            onClick={() => setSelectedId(c.id)}
            type="button"
          >
            <div className={styles.convName}>{c.profiles?.first_name} {c.profiles?.last_name}</div>
            <div className={styles.convDate}>{new Date(c.created_at).toLocaleDateString()}</div>
          </button>
        ))}
      </div>

      <div className={styles.chatPanel}>
        <div className={styles.messages} ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`${styles.bubble} ${m.sender_type === 'admin' ? styles.admin : styles.customer}`}>
              {m.message}
            </div>
          ))}
        </div>
        <form className={styles.inputRow} onSubmit={handleSend}>
          <input type="text" placeholder="Type a reply" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending} />
          <button type="submit" disabled={sending || !draft.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}