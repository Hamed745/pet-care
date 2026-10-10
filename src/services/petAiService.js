import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from "firebase/ai";
import app from "../firebase.js";

const MAX_HISTORY_EXCHANGES = 6;
const REQUEST_TIMEOUT_MS = 45000;
const MODEL_NAME = "gemini-3.1-flash-lite";
const SYSTEM_INSTRUCTION = `You are PetCare's pet-care information assistant. Give concise, practical general guidance about common pets and reply in the user's language. You are not a veterinarian; do not diagnose or replace veterinary care. For urgent or potentially serious symptoms, recommend a veterinarian or emergency clinic promptly. Never give medication dosage instructions; direct medication questions to a veterinarian. Be clear about uncertainty and ask a concise follow-up when needed.`;

let model;

function getPetCareModel() {
  if (!model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(
      ai,
      {
        model: MODEL_NAME,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: { maxOutputTokens: 384 },
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
  }

  return model;
}

function toConversationHistory(messages) {
  const exchanges = [];
  let pendingUserMessage = null;

  for (const message of messages) {
    if (message.from === "me") {
      pendingUserMessage = message.text;
    } else if (message.from === "ai" && pendingUserMessage) {
      if (!message.error && !message.pending && message.text) {
        exchanges.push([
          { role: "user", parts: [{ text: pendingUserMessage }] },
          { role: "model", parts: [{ text: message.text }] },
        ]);
      }
      pendingUserMessage = null;
    }
  }

  return exchanges.slice(-MAX_HISTORY_EXCHANGES).flat();
}

function getFriendlyError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = `${error?.message || ""} ${error?.cause?.message || ""}`.toLowerCase();

  if (/app.?check|attestation/.test(`${code} ${message}`)) {
    return "The secure AI connection could not be verified. Please refresh the page and try again.";
  }
  if (/resource-exhausted|quota|429|rate.?limit/.test(`${code} ${message}`)) {
    return "The assistant is receiving too many requests right now. Please wait a moment and try again.";
  }
  if (/timeout|timed out|deadline/.test(`${code} ${message}`)) {
    return "The assistant took too long to respond. Check your connection and try again.";
  }
  if (/unavailable|not-found|model.*(not found|unavailable)|404/.test(`${code} ${message}`)) {
    return "The AI assistant is temporarily unavailable. Please try again shortly.";
  }
  if (
    !navigator.onLine ||
    error?.name === "TypeError" ||
    /network|failed to fetch|fetch failed|request failed with status: 0|internet|connection/.test(`${code} ${message}`)
  ) {
    return "We couldn't reach the assistant. Check your internet connection and try again.";
  }

  return "Sorry, I couldn't get an answer just now. Please try again.";
}

function logTiming(name, value) {
  console.info("[PetCare timing]", { [name]: Math.round(value) });
}

export async function sendPetCareMessage(
  rawText,
  messages = [],
  { clickedAt = performance.now(), onChunk, signal } = {},
) {
  const text = rawText.trim();
  if (!text) {
    throw new Error("Please enter a question.");
  }

  let streamText = "";

  try {
    const modelInitializationStartedAt = performance.now();
    const petCareModel = getPetCareModel();
    logTiming(
      "modelInitializationMs",
      performance.now() - modelInitializationStartedAt,
    );

    const chat = petCareModel.startChat({
      history: toConversationHistory(messages),
    });
    logTiming("clickToGeminiRequestStartMs", performance.now() - clickedAt);

    const { stream, response } = await chat.sendMessageStream(text, {
      timeout: REQUEST_TIMEOUT_MS,
      signal,
    });

    for await (const chunk of stream) {
      const chunkText = chunk.text();
      if (!chunkText) continue;

      streamText += chunkText;
      if (streamText === chunkText) {
        logTiming("clickToFirstChunkMs", performance.now() - clickedAt);
      }
      onChunk?.(chunkText);
    }

    const result = await response;
    const answer = result.text().trim();

    if (!answer) {
      throw new Error("The assistant returned an empty response.");
    }

    logTiming("clickToCompleteMs", performance.now() - clickedAt);
    return answer;
  } catch (error) {
    logTiming("clickToFailureMs", performance.now() - clickedAt);
    const requestError = new Error(getFriendlyError(error), { cause: error });
    if (streamText) {
      requestError.partialResponse = streamText;
    }
    throw requestError;
  }
}
