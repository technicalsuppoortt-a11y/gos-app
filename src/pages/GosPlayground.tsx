import { useEffect, useState } from 'react';
import { gosApi, type PlaygroundTest } from '../backend/gosApi';
import { showToast } from '../utils/toast';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { 
  Bot, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  ThumbsDown, 
  ThumbsUp, 
  User, 
  X,
  BookOpen
} from 'lucide-react';

const STARTER_PROMPTS = [
  "What are your program prices and refund terms?",
  "What are your support and working hours?",
  "Where are your sessions held and who is eligible?",
  "How can I book an introductory call?"
];

export function GosPlayground() {
  useUILanguage();
  const [question, setQuestion] = useState('What are your program prices and refund terms?');
  const [tests, setTests] = useState<PlaygroundTest[]>([]);
  const [busy, setBusy] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    gosApi.playground(controller.signal)
      .then(result => {
        if (!Array.isArray(result.tests)) throw new Error('The Upclick API returned invalid playground history.');
        setTests(result.tests);
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function handleAsk(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = question.trim();
    if (busy || !query) return;
    setBusy(true);
    setError('');
    try {
      const result = await gosApi.ask(query);
      setTests(previous => [result.test, ...previous.filter(t => t.id !== result.test.id)]);
      showToast.success(translateText("Response generated successfully"));
    } catch (e) {
      setError((e as Error).message || translateText("Failed to generate response"));
      showToast.error((e as Error).message || translateText("Failed to test question"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGrade(testId: string, verdict: 'correct' | 'incorrect') {
    if (busy || gradingId === testId) return;
    setGradingId(testId);
    try {
      const result = await gosApi.grade(testId, verdict);
      setTests(previous => previous.map(row => row.id === testId ? result.test : row));
      showToast.success(verdict === 'correct' ? translateText("Marked as accurate") : translateText("Feedback recorded"));
    } catch (e) {
      showToast.error((e as Error).message || translateText("Failed to save grade"));
    } finally {
      setGradingId(null);
    }
  }

  return (
    <div className="af-playground-container">
      {/* Context banner */}
      <div className="af-playground-context-banner">
        <div className="af-context-badge">
          <ShieldCheck size={14} />
          <span>{translateText("Knowledge Grounding Active")}</span>
        </div>
        <span className="af-context-meta">
          {translateText("Queries are answered using indexed vector chunks.")}
        </span>
      </div>

      {/* Starter Prompts */}
      <div className="af-prompt-chips-wrap">
        <div className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500" />
          <span>{translateText("Suggested test queries:")}</span>
        </div>
        <div className="af-prompt-chips">
          {STARTER_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              className="af-prompt-chip"
              onClick={() => setQuestion(prompt)}
            >
              <span>{localizeNode(prompt)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Composer */}
      <form onSubmit={handleAsk} className="af-playground-composer">
        <div className="af-composer-input-wrap">
          <textarea
            rows={2}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleAsk();
              }
            }}
            placeholder={translateText("Ask a customer question to test how the assistant responds...")}
            disabled={busy}
            className="af-composer-textarea"
          />
          {question && !busy && (
            <button
              type="button"
              className="af-composer-clear"
              onClick={() => setQuestion('')}
              title={translateText("Clear question")}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="af-composer-actions">
          <span className="af-composer-hint">
            <Clock size={12} />
            {translateText("Press Enter to test, Shift+Enter for new line")}
          </span>
          <button
            type="submit"
            className="af-button-primary af-composer-submit"
            disabled={busy || !question.trim()}
          >
            {busy ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>{translateText("Thinking…")}</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>{translateText("Test assistant")}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="af-safety-note" style={{ borderColor: '#fca5a5', background: '#fff1f2', color: '#be123c' }} role="alert">
          <span>{localizeNode(error)}</span>
        </div>
      )}

      {/* Feed & History */}
      <div className="af-playground-feed">
        <div className="af-feed-header">
          <div className="flex items-center gap-2">
            <MessageSquare size={13} className="text-indigo-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {translateText("Live Test Queries & Answers")}
            </span>
            <span className="af-feed-count">{tests.length}</span>
          </div>
          {tests.length > 0 && (
            <button
              type="button"
              className="af-text-action text-xs"
              onClick={() => setTests([])}
            >
              {translateText("Clear view")}
            </button>
          )}
        </div>

        {historyLoading && !tests.length ? (
          <div className="af-knowledge-loading" role="status" aria-label={translateText("Loading history")}>
            <i /><i />
          </div>
        ) : tests.length === 0 ? (
          <div className="af-playground-empty">
            <div className="af-empty-bot-icon">
              <Bot size={26} />
            </div>
            <b>{translateText("Ready for query evaluation")}</b>
            <p>{translateText("Pick a suggested prompt above or type a test question to verify how the assistant handles inquiries with your knowledge base.")}</p>
          </div>
        ) : (
          <div className="af-feed-list-wrap">
            {tests.slice(0, 6).map(test => (
              <article className="af-test-card" key={test.id}>
                {/* User Query */}
                <div className="af-test-user-row">
                  <div className="af-user-badge">
                    <User size={13} />
                  </div>
                  <div className="af-test-query-text">
                    {localizeNode(test.question)}
                  </div>
                </div>

                {/* Assistant Answer */}
                <div className="af-test-ai-row">
                  <div className="af-ai-badge">
                    <Bot size={14} />
                  </div>
                  <div className="af-test-answer-content">
                    <p className="af-test-answer-text">
                      {localizeNode(test.answer || translateText("No grounded answer could be verified from the knowledge base. A teammate should follow up."))}
                    </p>

                    {/* Metadata & Grading Footer */}
                    <div className="af-test-meta-footer">
                      <div className="af-meta-tags">
                        <span className={`af-outcome-badge af-outcome-${test.outcome || 'answered'}`}>
                          <CheckCircle2 size={11} />
                          {test.outcome || 'answered'}
                        </span>
                        <span className="af-citation-badge">
                          <BookOpen size={11} />
                          {test.citations?.length ?? 0} {translateText("citations")}
                        </span>
                      </div>

                      <div className="af-verdict-actions">
                        <span className="text-[11px] text-slate-400 mr-1">{translateText("Grounding:")}</span>
                        <button
                          type="button"
                          disabled={busy || gradingId === test.id}
                          className={`af-grade-btn correct ${test.verdict === 'correct' ? 'active' : ''}`}
                          onClick={() => void handleGrade(test.id, 'correct')}
                          title={translateText("Mark as accurate and grounded")}
                        >
                          <ThumbsUp size={11} />
                          <span>{translateText("Accurate")}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy || gradingId === test.id}
                          className={`af-grade-btn incorrect ${test.verdict === 'incorrect' ? 'active' : ''}`}
                          onClick={() => void handleGrade(test.id, 'incorrect')}
                          title={translateText("Mark as inaccurate or ungrounded")}
                        >
                          <ThumbsDown size={11} />
                          <span>{translateText("Inaccurate")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
