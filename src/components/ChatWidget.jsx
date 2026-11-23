import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, ImagePlus, MessageCircle, Send, X } from "lucide-react";
import { Button } from "./ui.jsx";
import { input } from "../ui.js";
import { sendPetCareMessage } from "../services/petAiService.js";
import { preparePetPhoto, validatePetPhoto } from "../services/petAiPhoto.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const ChatContext = createContext(null);
const initialMessage = { id: 1, from: "ai", textKey: "chat.welcome", text: "Hi! Ask me anything about your pet's care." };
const suggestions = ["Find a vet near me", "Vaccination schedule", "Grooming tips"];
const russianChatText = {
  welcome: "Привет! Задайте мне любой вопрос об уходе за вашим питомцем.",
  ask: "Спросите об уходе за питомцем",
  assistant: "ИИ-помощник PetCare",
  ready: "Готов",
  title: "Чат PetCare",
  typing: "Помощник печатает",
  retry: "Повторить",
  placeholder: "Напишите ваш вопрос...",
  send: "Отправить сообщение",
  close: "Закрыть чат",
  open: "Открыть чат",
  unread: "Новый ответ",
  incomplete: "Соединение прервалось до завершения ответа.",
  attach: "Прикрепить фото питомца", removePhoto: "Удалить фото",
  photoHelp: "ИИ может описать видимые признаки, но не поставить диагноз по фото.",
  photoDefault: "Посмотрите на фото моего питомца: опишите видимые изменения, возможные причины и когда нужен ветеринар.",
  prompts: ["Найти ветеринара поблизости", "График вакцинации", "Советы по уходу"],
};
const englishChatText = {
  welcome: "Hi! Ask me anything about your pet's care.",
  ask: "Ask about pet care", assistant: "PetCare AI assistant", ready: "Ready",
  title: "PetCare assistant", typing: "Assistant is typing", retry: "Retry",
  placeholder: "Type your question...", send: "Send message", close: "Close chat assistant",
  open: "Open chat assistant", unread: "Unread reply",
  incomplete: "The connection stopped before this answer was complete.",
  attach: "Attach a pet photo", removePhoto: "Remove photo",
  photoHelp: "AI can describe visible signs but cannot diagnose a pet from a photo.",
  photoDefault: "Please review this photo of my pet, describe visible changes, possible causes, and when to see a veterinarian.",
  prompts: suggestions,
};
function chatLabels(language) { return language === "ru" ? russianChatText : englishChatText; }

export function ChatProvider({ children }) {
  const { language } = useLanguage();
  const labels = chatLabels(language);
  const [messages, setMessages] = useState([initialMessage]);
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const sendingRef = useRef(false);
  const panelOpenRef = useRef(panelOpen);
  const messageIdRef = useRef(Date.now());

  useEffect(() => { panelOpenRef.current = panelOpen; }, [panelOpen]);

  const openPanel = useCallback(() => { setUnread(0); setPanelOpen(true); }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const sendMessage = useCallback(async (rawText, { retry = false, imagePart = null } = {}) => {
    const text = rawText.trim();
    if ((!text && !imagePart) || sendingRef.current) return false;

    const clickedAt = performance.now();
    const assistantId = ++messageIdRef.current;
    sendingRef.current = true;
    const sentMessages = messages;
    const imagePreview = imagePart?.inlineData?.data
      ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      : null;
    const userMessage = { id: ++messageIdRef.current, from: "me", text, imagePreview };
    const assistantMessage = {
      id: assistantId,
      from: "ai",
      text: "",
      pending: true,
      retryText: text,
      retryImagePart: imagePart,
      startedAt: clickedAt,
    };
    setMessages((current) => [
      ...current,
      ...(retry ? [] : [userMessage]),
      assistantMessage,
    ]);
    setTyping(true);
    try {
      const reply = await sendPetCareMessage(text, sentMessages, {
        clickedAt,
        imagePart,
        onChunk: (chunkText) => {
          setMessages((current) => current.map((message) => (
            message.id === assistantId
              ? {
                  ...message,
                  text: message.text + chunkText,
                  firstChunkAt: message.firstChunkAt ?? performance.now(),
                }
              : message
          )));
        },
      });
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? {
              ...message,
              text: reply,
              pending: false,
              completedAt: performance.now(),
              retryText: null,
              retryImagePart: null,
            }
          : message
      )));
      if (!panelOpenRef.current) setUnread((current) => current + 1);
    } catch (error) {
      setMessages((current) => current.map((message) => {
        if (message.id !== assistantId) return message;
        const partialResponse = error.partialResponse || "";
        return {
          ...message,
          text: partialResponse
            ? `${partialResponse}\n\n${labels.incomplete}`
            : error.message,
          pending: false,
          error: true,
        };
      }));
      if (!panelOpenRef.current) setUnread((current) => current + 1);
    } finally {
      setTyping(false);
      sendingRef.current = false;
    }

    return true;
  }, [messages, labels.incomplete]);
  const value = useMemo(() => ({ messages, typing, unread, panelOpen, openPanel, closePanel, sendMessage }), [messages, typing, unread, panelOpen, openPanel, closePanel, sendMessage]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("Chat components must be rendered inside ChatProvider.");
  return value;
}

export function ChatConversation({ embedded = false, focusOnMount = false, prompts = suggestions }) {
  const { messages, typing, sendMessage } = useChat();
  const { language } = useLanguage();
  const labels = chatLabels(language);
  const activePrompts = prompts === suggestions ? labels.prompts : prompts;
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const firstRenderLoggedRef = useRef(new Set());
  const completionRenderLoggedRef = useRef(new Set());

  useEffect(() => { if (focusOnMount) inputRef.current?.focus(); }, [focusOnMount]);
  useEffect(() => {
    if (!imageFile) { setImagePreviewUrl(""); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      validatePetPhoto(file);
      setImageFile(file);
      setPhotoError("");
    } catch (error) {
      setImageFile(null);
      setPhotoError(error.message);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const clearPhoto = () => {
    setImageFile(null);
    setPhotoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  useEffect(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior });
  }, [messages, typing]);

  useLayoutEffect(() => {
    for (const message of messages) {
      if (message.from !== "ai") continue;
      if (message.firstChunkAt && !firstRenderLoggedRef.current.has(message.id)) {
        firstRenderLoggedRef.current.add(message.id);
        const renderedAt = performance.now();
        console.info("[PetCare timing]", {
          clickToFirstReactCommitMs: Math.round(renderedAt - message.startedAt),
          firstChunkToReactCommitMs: Math.round(renderedAt - message.firstChunkAt),
        });
      }
      if (message.completedAt && !completionRenderLoggedRef.current.has(message.id)) {
        completionRenderLoggedRef.current.add(message.id);
        console.info("[PetCare timing]", {
          clickToCompleteReactCommitMs: Math.round(
            performance.now() - message.startedAt,
          ),
        });
      }
    }
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    if (typing || preparing || (!draft.trim() && !imageFile)) return;
    setPreparing(true);
    setPhotoError("");
    try {
      const imagePart = imageFile ? await preparePetPhoto(imageFile) : null;
      const text = draft.trim() || (imagePart ? labels.photoDefault : "");
      setDraft("");
      clearPhoto();
      setPreparing(false);
      void sendMessage(text, { imagePart });
    } catch (error) {
      setPhotoError(error.message || "Could not attach this photo.");
      setPreparing(false);
    }
  };
  const choosePrompt = (prompt) => { if (!typing) void sendMessage(prompt); };

  return <div className={`flex min-h-0 flex-1 flex-col ${embedded ? "overflow-hidden" : ""}`}>
    {embedded && <div className="flex items-center gap-3 border-b border-stone-100 p-5"><span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Bot size={21} /></span><div><h2 className="font-extrabold">{labels.ask}</h2><p className="text-xs text-ink-500">{labels.assistant}</p></div><span className="ms-auto flex items-center gap-1.5 text-xs font-semibold text-primary-700"><span className="size-2 rounded-full bg-primary-500" /> {labels.ready}</span></div>}
    <div ref={messagesRef} role="log" aria-live="polite" aria-relevant="additions text" aria-label={labels.title} className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-stone-50 p-4 ${embedded ? "h-[360px]" : ""}`}>
      {messages.map((message) => message.pending && !message.text ? null : <div key={message.id} className={`flex max-w-[90%] gap-2 ${message.from === "me" ? "ms-auto flex-row-reverse" : ""}`}><span className={`grid size-8 shrink-0 place-items-center rounded-full ${message.from === "me" ? "bg-accent-100 text-amber-800" : "bg-primary-100 text-primary-700"}`}>{message.from === "me" ? <MessageCircle size={15} aria-hidden="true" /> : <Bot size={15} aria-hidden="true" />}</span><div className="min-w-0">{message.imagePreview && <img src={message.imagePreview} alt={labels.attach} className="mb-1 max-h-40 max-w-48 rounded-xl border border-stone-200 object-contain" />}<p role={message.error ? "alert" : undefined} className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${message.from === "me" ? "rounded-tr-sm bg-primary-700 text-white" : message.error ? "rounded-tl-sm border border-red-200 bg-red-50 text-red-800" : "rounded-tl-sm border border-stone-100 bg-white text-ink-700 shadow-sm"}`}>{message.textKey ? labels.welcome : message.text}</p>{message.error && message.retryText && <button type="button" onClick={() => void sendMessage(message.retryText, { retry: true, imagePart: message.retryImagePart })} disabled={typing} className="mt-1 text-xs font-semibold text-primary-700 underline disabled:opacity-50">{labels.retry}</button>}</div></div>)}
      {typing && <div className="flex items-center gap-2" aria-label={labels.typing}><span className="grid size-8 place-items-center rounded-full bg-primary-100 text-primary-700"><Bot size={15} aria-hidden="true" /></span><span className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-stone-100 bg-white px-4 py-3 shadow-sm"><span className="size-1.5 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.2s]" /><span className="size-1.5 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.1s]" /><span className="size-1.5 animate-bounce rounded-full bg-ink-500" /></span></div>}
    </div>
    <div className="border-t border-stone-100 bg-white p-3 sm:p-4">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{activePrompts.map((prompt) => <button key={prompt} type="button" disabled={typing || preparing} onClick={() => choosePrompt(prompt)} className="min-h-8 shrink-0 rounded-full bg-primary-50 px-3 text-left text-[11px] font-semibold text-primary-700 transition hover:bg-primary-100 disabled:opacity-50">{prompt}</button>)}</div>
      {imageFile && <div className="mb-2 flex items-center gap-2 rounded-xl bg-stone-50 p-2 text-xs">
        {imagePreviewUrl && <img src={imagePreviewUrl} alt={labels.attach} className="size-14 rounded-lg object-cover" />}
        <span className="min-w-0 flex-1 truncate">{imageFile.name}</span>
        <button type="button" aria-label={labels.removePhoto} title={labels.removePhoto} onClick={clearPhoto} disabled={typing || preparing} className="rounded-lg p-2 text-ink-600 hover:bg-stone-200"><X size={16}/></button>
      </div>}
      {photoError && <p role="alert" className="mb-2 text-xs text-red-700">{photoError}</p>}
      {imageFile && <p className="mb-2 text-[11px] text-ink-500">{labels.photoHelp}</p>}
      <form onSubmit={send} className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} className="sr-only" tabIndex={-1} aria-label={labels.attach} />
        <button type="button" aria-label={labels.attach} title={labels.attach} disabled={typing || preparing} onClick={() => fileInputRef.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-xl border border-stone-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50"><ImagePlus size={20}/></button>
        <label className="sr-only" htmlFor={embedded ? "ai-chat-message" : "floating-chat-message"}>{labels.title}</label>
        <input ref={inputRef} id={embedded ? "ai-chat-message" : "floating-chat-message"} className={input+" min-w-0 flex-1"} placeholder={labels.placeholder} autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={typing || preparing}/>
        <Button type="submit" aria-label={labels.send} disabled={(!draft.trim() && !imageFile) || typing || preparing} className="size-12 min-h-12 shrink-0 p-0"><Send size={18}/></Button>
      </form>
    </div>
  </div>;
}

export default function FloatingChat() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const labels = chatLabels(language);
  const { unread, panelOpen, openPanel, closePanel } = useChat();
  const launcherRef = useRef(null);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [panelOnStart, setPanelOnStart] = useState(false);
  const visible = pathname !== "/ai";

  useEffect(() => {
    if (pathname === "/ai") closePanel();
  }, [pathname, closePanel]);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closePanel();
        requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, closePanel]);

  useEffect(() => {
    const updateOffset = () => {
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const base = mobile ? 80 : 24;
      const button = launcherRef.current;
      if (!button || !visible) { setBottomOffset(0); return; }
      const viewportHeight = window.innerHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const buttonHeight = 56;
      let bottom = base;
      const intersects = (top, left, right) => {
        const buttonTop = viewportHeight - bottom - buttonHeight;
        const buttonLeft = viewportWidth - 16 - 56;
        return top < buttonTop + buttonHeight && top + 1 > buttonTop && left < buttonLeft + 56 && right > buttonLeft;
      };
      const controls = [...document.querySelectorAll("main input:not([type='hidden']), main select, main textarea, main button:not([data-chat-control])")]
        .filter((element) => element.getClientRects().length)
        .map((element) => element.getBoundingClientRect())
        .sort((first, second) => second.top - first.top);
      controls.forEach((rect) => {
        if (intersects(rect.top, rect.left, rect.right)) bottom = Math.max(bottom, viewportHeight - rect.top + 12);
      });
      const footerContent = [...document.querySelectorAll("footer[data-site-footer] a, footer[data-site-footer] h2, footer[data-site-footer] p, footer[data-site-footer] span")]
        .filter((element) => element.getClientRects().length)
        .map((element) => element.getBoundingClientRect())
        .sort((first, second) => second.top - first.top);
      footerContent.forEach((rect) => {
        if (intersects(rect.top, rect.left, rect.right)) bottom = Math.max(bottom, viewportHeight - rect.top + 12);
      });
      const extraOffset = bottom - base;
      setBottomOffset((current) => current === extraOffset ? current : extraOffset);
      let panelOnStart = false;
      if (!mobile && panelOpen) {
        const panelTop = viewportHeight - (base + extraOffset + 68) - 520;
        const panelRightLeft = viewportWidth - 16 - 380;
        const panelHits = (left) => controls.some((rect) => rect.top < viewportHeight - (base + extraOffset + 68) && rect.bottom > panelTop && rect.left < left + 380 && rect.right > left);
        if (panelHits(panelRightLeft) && !panelHits(16)) panelOnStart = true;
      }
      setPanelOnStart((current) => current === panelOnStart ? current : panelOnStart);
    };
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(updateOffset); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    if (document.querySelector("main")) observer.observe(document.querySelector("main"));
    if (document.querySelector("footer[data-site-footer]")) observer.observe(document.querySelector("footer[data-site-footer]"));
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); observer.disconnect(); };
  }, [pathname, visible, panelOpen]);

  const closeAndRestoreFocus = () => {
    closePanel();
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const openChatPanel = () => {
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!mobile) {
      const right = document.documentElement.clientWidth - 16 - 380;
      const top = window.innerHeight - 24 - 68 - 520;
      const controls = [...document.querySelectorAll("main input:not([type='hidden']), main select, main textarea, main button:not([data-chat-control])")]
        .filter((element) => element.getClientRects().length)
        .map((element) => element.getBoundingClientRect());
      const sideHasControl = (left) => controls.some((rect) => rect.top < window.innerHeight - 24 - 68 && rect.bottom > top && rect.left < left + 380 && rect.right > left);
      setPanelOnStart(sideHasControl(right) && !sideHasControl(16));
    } else {
      setPanelOnStart(false);
    }
    openPanel();
  };

  if (!visible) return null;
  return <>
    <style>{`
      @keyframes chat-panel-open { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .chat-panel-enter { animation: chat-panel-open 180ms ease-out both; }
      .chat-widget-launcher, .chat-widget-panel { --chat-base-bottom: 16px; }
      @media (max-width: 1023px) { .chat-widget-launcher, .chat-widget-panel { --chat-base-bottom: 80px; } }
      .chat-widget-launcher { bottom: calc(var(--chat-base-bottom) + var(--chat-extra-bottom, 0px) + env(safe-area-inset-bottom)); }
      .chat-widget-panel { bottom: calc(var(--chat-base-bottom) + var(--chat-extra-bottom, 0px) + 68px + env(safe-area-inset-bottom)); }
      .chat-widget-panel { left: 0; right: 0; width: 100%; max-height: calc(100dvh - 180px - env(safe-area-inset-bottom)); }
      @media (min-width: 640px) {
        .chat-widget-panel { left: auto; right: 16px; width: 380px; height: 520px; max-height: calc(100dvh - 120px - env(safe-area-inset-bottom)); border-radius: 16px; }
        .chat-widget-panel.chat-panel-start { left: 16px; right: auto; }
      }
      @media (prefers-reduced-motion: reduce) { .chat-panel-enter { animation: none; } }
    `}</style>
    {panelOpen && <section role="dialog" aria-label={labels.title} className={`chat-widget-panel chat-panel-enter fixed z-[60] flex min-h-[360px] flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-2xl ${panelOnStart ? "chat-panel-start" : ""}`} style={{ "--chat-extra-bottom": `${bottomOffset}px` }}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stone-100 px-4"><span className="grid size-9 place-items-center rounded-xl bg-primary-50 text-primary-700"><Bot size={19} /></span><h2 className="flex-1 text-sm font-extrabold">{labels.title}</h2><button type="button" aria-label={labels.close} data-chat-control="true" onClick={closeAndRestoreFocus} className="grid size-9 place-items-center rounded-lg text-ink-500 transition hover:bg-stone-100"><X size={19} /></button></header>
      <ChatConversation focusOnMount />
    </section>}
    <button ref={launcherRef} type="button" aria-label={labels.open} aria-expanded={panelOpen} onClick={() => panelOpen ? closeAndRestoreFocus() : openChatPanel()} className="chat-widget-launcher fixed end-4 z-[61] grid size-14 place-items-center rounded-2xl bg-primary-600 text-white shadow-md transition duration-150 hover:bg-primary-700 focus-visible:outline-offset-4" style={{ "--chat-extra-bottom": `${bottomOffset}px` }}><MessageCircle size={23} strokeWidth={2} />{unread > 0 && !panelOpen && <span aria-label={labels.unread} className="absolute end-0 top-0 size-3 rounded-full border-2 border-white bg-accent-500" />}</button>
  </>;
}
