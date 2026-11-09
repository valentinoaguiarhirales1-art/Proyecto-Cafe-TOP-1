import { useLayoutEffect, useRef, useState } from 'react';
import { askBarista, djangoChatEnabled } from '../api';
import { ArrowDown, CalendarDays, ClipboardList, Coffee, Gift, MapPin, Search, Send, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatChatText } from '../utils/chatText';

function AssistantText({ text }) {
  return formatChatText(text).map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {line.map((part, partIndex) => part.bold
        ? <strong key={partIndex}>{part.text}</strong>
        : <span key={partIndex}>{part.text}</span>)}
    </span>
  ));
}

export default function BaristaChat({ onNavigate, onSearch }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(() => [{ role: 'bot', text: t('chat_welcome') }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLatest, setShowLatest] = useState(false);
  const messagesRef = useRef(null);
  const stickToBottom = useRef(true);
  const sendingRef = useRef(false);

  const scrollToLatest = () => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
    stickToBottom.current = true;
    setShowLatest(false);
  };

  useLayoutEffect(() => {
    if (open && stickToBottom.current) scrollToLatest();
  }, [open, msgs, loading]);

  const handleScroll = (event) => {
    const container = event.currentTarget;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 48;
    stickToBottom.current = nearBottom;
    setShowLatest(!nearBottom);
  };

  const send = async (event) => {
    event.preventDefault();
    const userMsg = input.trim();
    if (!userMsg || sendingRef.current) return;
    sendingRef.current = true;
    stickToBottom.current = true;
    setMsgs(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const history = msgs.slice(-8)
        .filter(message => message.role === 'bot' && message.actions?.length)
        .map(message => ({ role: 'bot', text: message.actions.map(action => action.name).join(', ') }));
      const { data } = await askBarista(userMsg, history);
      if (typeof data?.recommendation !== 'string' || !data.recommendation.trim()) {
        throw new Error('La respuesta del asistente está vacía.');
      }
      setMsgs(prev => [...prev, {
        role: 'bot',
        text: data.recommendation,
        actions: Array.isArray(data.actions) ? data.actions.filter(action => typeof action?.name === 'string') : [],
      }]);
    } catch (error) {
      console.error('No se pudo obtener una respuesta del asistente:', error);
      setMsgs(prev => [...prev, { role: 'bot', text: t('chat_error') }]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const toggleChat = () => {
    if (!open) stickToBottom.current = true;
    setOpen(!open);
  };

  return (
    <>
      <button type="button" onClick={toggleChat}
        aria-label={open ? t('chat_close') : t('chat_open')} aria-expanded={open} aria-controls="barista-chat"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-cafe-caramel hover:bg-cafe-gold rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110">
        {open ? <X size={22} className="text-cafe-dark" /> : <Coffee size={22} className="text-cafe-dark" />}
      </button>

      {open && (
        <section id="barista-chat" aria-label={t('chat_title')}
          className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] max-w-sm h-[min(520px,calc(100dvh-7rem))] glass-dark shadow-2xl flex flex-col animate-slide-up overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 p-4 border-b border-cafe-brown/30 bg-cafe-espresso/90">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cafe-caramel bg-cafe-dark shadow-md" aria-hidden="true">
              <Coffee size={20} className="text-cafe-caramel" />
            </div>
            <div className="min-w-0">
              <p className="text-cafe-cream font-semibold text-sm">{t('chat_title')}</p>
              <p className="text-cafe-brown text-xs">{t('chat_subtitle')}</p>
            </div>
            <button type="button" onClick={toggleChat} aria-label={t('chat_close')}
              className="ml-auto p-2 rounded-full text-cafe-cream hover:bg-cafe-brown/30">
              <X size={18} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            {djangoChatEnabled && <p className="px-4 pt-2 text-xs text-cafe-brown">Busca coincidencias del menú; no usa IA. Para alergias o restricciones, consulta al personal.</p>}
            <div ref={messagesRef} onScroll={handleScroll} role="log" aria-live="polite" aria-label={t('chat_messages')}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3">
              {msgs.map((message, index) => (
                <div key={index} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] min-w-0 px-4 py-2.5 rounded-2xl text-sm leading-relaxed [overflow-wrap:anywhere] ${message.role === 'user' ? 'bg-cafe-caramel text-cafe-dark rounded-tr-sm whitespace-pre-wrap' : 'bg-cafe-dark/90 text-cafe-cream rounded-tl-sm border border-cafe-brown/30'}`}>
                    {message.role === 'bot' ? <AssistantText text={message.text} /> : message.text}
                  </div>
                  {message.role === 'bot' && message.actions?.length > 0 && (
                    <div className="mt-2 flex max-w-full flex-wrap gap-2 pl-1">
                      {message.actions.map(action => (
                        <button key={`${action.name}-${action.category}`} type="button"
                          onClick={() => { onSearch?.(action.name); setOpen(false); }}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-cafe-caramel/50 bg-cafe-dark/90 px-3 py-1.5 text-left text-xs text-cafe-cream hover:border-cafe-gold hover:text-cafe-gold">
                          <Search size={13} className="shrink-0" aria-hidden="true" />
                          <span className="truncate">Ver {action.name}</span>
                          {action.category && <span className="hidden text-cafe-brown sm:inline">· {action.category}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div role="status" aria-label={t('chat_thinking')} className="bg-cafe-dark/90 border border-cafe-brown/30 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1" aria-hidden="true">
                      {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-cafe-caramel rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {showLatest && (
              <button type="button" onClick={scrollToLatest} aria-label={t('chat_latest')} title={t('chat_latest')}
                className="absolute bottom-3 right-3 rounded-full bg-cafe-caramel text-cafe-dark p-2 shadow-lg hover:bg-cafe-gold">
                <ArrowDown size={18} />
              </button>
            )}
          </div>

          <nav aria-label="Ir a una sección" className="flex shrink-0 gap-2 overflow-x-auto border-t border-cafe-brown/20 px-3 py-2">
            {[
              { page: 'menu', label: 'Menú', Icon: Coffee },
              { page: 'promotions', label: 'Promos', Icon: Gift },
              { page: 'events', label: 'Eventos', Icon: CalendarDays },
              { page: 'reservations', label: 'Reservar', Icon: MapPin },
              { page: 'orders', label: 'Pedidos', Icon: ClipboardList },
            ].map(({ page, label, Icon }) => (
              <button key={page} type="button" onClick={() => { onNavigate?.(page); setOpen(false); }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cafe-dark/70 px-3 py-1.5 text-xs text-cafe-cream hover:bg-cafe-caramel/20 hover:text-cafe-gold">
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <form onSubmit={send} className="p-3 border-t border-cafe-brown/30 flex items-end gap-2 shrink-0">
            <textarea value={input} onChange={event => setInput(event.target.value)} maxLength={500}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2} placeholder={t('chat_placeholder')} aria-label={t('chat_placeholder')}
              className="input-cafe flex-1 min-w-0 max-h-28 resize-y text-sm py-2" />
            <button type="submit" disabled={loading || !input.trim()} aria-label={t('chat_send')}
              className="w-10 h-10 shrink-0 bg-cafe-caramel hover:bg-cafe-gold rounded-xl flex items-center justify-center transition-colors disabled:opacity-40">
              <Send size={16} className="text-cafe-dark" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
