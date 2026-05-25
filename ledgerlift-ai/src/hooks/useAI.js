import { useState, useCallback } from "react";

const SYSTEM_PROMPT = `You are LedgerLift AI, a friendly financial advisor and bookkeeping tutor for small business owners.
You serve two roles seamlessly:
1. ADVISOR — analyze the user's financial data, flag risks, celebrate wins, and give actionable advice.
2. EDUCATOR — explain any bookkeeping or financial concept in plain English on demand, using real-world analogies. Cover topics like profit & loss, cash flow, accounts payable/receivable, tax deductions, profit margins, and more.
Rules:
- Never use jargon without immediately explaining it in one sentence.
- Be warm, direct, and encouraging — like a trusted advisor, not a textbook.
- When citing numbers, format them clearly (e.g. $4,200 not 4200).
- Keep responses under 220 words unless the user explicitly asks for more detail.
- End educational explanations with one practical tip the user can act on today.`;

export function useAI() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (userText) => {
    const userMsg = { role: "user", content: userText };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("No API key — add VITE_ANTHROPIC_API_KEY to .env");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: updatedHistory,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.content[0].text };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
