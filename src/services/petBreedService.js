import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "firebase/ai";
import app from "../firebase.js";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE } from "../config.js";
import { compressImageFile, validateImageFile } from "../utils/imageTools.js";

const REQUEST_TIMEOUT_MS = 45000;
let breedAnalysisModel;

const breedAnalysisSchema = Schema.object({
  properties: {
    animalType: Schema.enumString({
      enum: ["dog", "cat", "other", "none", "unclear"],
      description: "The visible animal type, or none/unclear if identification is not possible.",
    }),
    likelyBreed: Schema.string({
      description: "Best-supported breed or type; say 'Unable to determine' when not supported by the image.",
    }),
    alternativeBreeds: Schema.array({
      items: Schema.string(),
      maxItems: 4,
    }),
    visibleCharacteristics: Schema.array({
      items: Schema.string(),
      maxItems: 5,
    }),
    explanation: Schema.string({
      description: "Brief explanation grounded only in visible appearance.",
    }),
    uncertainty: Schema.string({
      description: "Explain visual limitations and uncertainty; do not use percentages.",
    }),
    mixedBreedPossible: Schema.boolean(),
    recognitionStatus: Schema.enumString({
      enum: [
        "pet_identified",
        "no_animal",
        "multiple_animals",
        "unclear_image",
        "unsupported_species",
      ],
      description: "Whether one recognizable dog/cat is visible, or why it cannot be identified.",
    }),
  },
});

function getBreedAnalysisModel() {
  if (!breedAnalysisModel) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    breedAnalysisModel = getGenerativeModel(
      ai,
      {
        model: "gemini-3.1-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: breedAnalysisSchema,
          maxOutputTokens: 500,
        },
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
  }

  return breedAnalysisModel;
}

function validateBreedAnalysis(value) {
  const animalTypes = ["dog", "cat", "other", "none", "unclear"];
  const recognitionStatuses = [
    "pet_identified",
    "no_animal",
    "multiple_animals",
    "unclear_image",
    "unsupported_species",
  ];
  const isBoundedText = (entry) => (
    typeof entry === "string" && entry.trim().length > 0 && entry.length <= 500
  );

  if (
    !value ||
    !animalTypes.includes(value.animalType) ||
    !recognitionStatuses.includes(value.recognitionStatus) ||
    !isBoundedText(value.likelyBreed) ||
    !Array.isArray(value.alternativeBreeds) ||
    value.alternativeBreeds.length > 4 ||
    !value.alternativeBreeds.every(isBoundedText) ||
    !Array.isArray(value.visibleCharacteristics) ||
    value.visibleCharacteristics.length > 5 ||
    !value.visibleCharacteristics.every(isBoundedText) ||
    !isBoundedText(value.explanation) ||
    !isBoundedText(value.uncertainty) ||
    typeof value.mixedBreedPossible !== "boolean"
  ) {
    throw new Error("The assistant returned an invalid breed analysis. Please try again.");
  }

  if (
    (value.recognitionStatus === "no_animal" && value.animalType !== "none") ||
    (value.recognitionStatus === "unclear_image" && value.animalType !== "unclear") ||
    (value.recognitionStatus === "unsupported_species" && value.animalType !== "other") ||
    (value.recognitionStatus === "pet_identified" &&
      !["dog", "cat"].includes(value.animalType))
  ) {
    throw new Error("The assistant returned an invalid breed analysis. Please try again.");
  }

  return {
    animalType: value.animalType,
    likelyBreed: value.likelyBreed.trim(),
    alternativeBreeds: value.alternativeBreeds.map((breed) => breed.trim()),
    visibleCharacteristics: value.visibleCharacteristics.map((trait) => trait.trim()),
    explanation: value.explanation.trim(),
    uncertainty: value.uncertainty.trim(),
    mixedBreedPossible: value.mixedBreedPossible,
    recognitionStatus: value.recognitionStatus,
  };
}

function getBreedAnalysisError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = `${error?.message || ""} ${error?.cause?.message || ""}`.toLowerCase();

  if (/app.?check|attestation/.test(`${code} ${message}`)) {
    return "The secure AI connection could not be verified. Please refresh the page and try again.";
  }
  if (/resource-exhausted|quota|429|rate.?limit/.test(`${code} ${message}`)) {
    return "The assistant is receiving too many requests right now. Please wait a moment and try again.";
  }
  if (/timeout|timed out|deadline/.test(`${code} ${message}`)) {
    return "The analysis took too long. Check your connection and try again.";
  }
  if (/unavailable|not-found|model.*(not found|unavailable)|404/.test(`${code} ${message}`)) {
    return "Image analysis is temporarily unavailable. Please try again shortly.";
  }
  if (
    !navigator.onLine ||
    error?.name === "TypeError" ||
    /network|failed to fetch|fetch failed|internet|connection/.test(`${code} ${message}`)
  ) {
    return "We couldn't reach image analysis. Check your internet connection and try again.";
  }

  if (/^Photo could not be (processed|read)\./.test(error?.message || "")) {
    return error.message;
  }
  if (/^The assistant returned (an invalid breed analysis|an unreadable analysis)\./.test(error?.message || "")) {
    return error.message;
  }

  return "We couldn't analyze this photo. Please try again.";
}

export async function analyzePetBreed(imageFile, petContext = {}) {
  if (!imageFile || typeof imageFile.type !== "string") {
    throw new Error("Choose a photo to analyze.");
  }
  const validationError = validateImageFile(imageFile);
  if (validationError) {
    throw new Error(validationError);
  }
  if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type) || imageFile.size > MAX_UPLOAD_SIZE) {
    throw new Error("Choose a PNG, JPEG, or WebP image up to 5 MB.");
  }

  try {
    const imageDataUrl = await compressImageFile(imageFile, {
      maxSide: 1280,
      quality: 0.86,
    });
    const imageData = imageDataUrl.match(/^data:image\/jpeg;base64,(.+)$/)?.[1];
    if (!imageData) {
      throw new Error("Photo could not be processed. Choose another image.");
    }

    const context = [
      petContext?.type && `Saved species: ${String(petContext.type).slice(0, 60)}`,
      petContext?.breed && `Saved breed: ${String(petContext.breed).slice(0, 80)}`,
      Number.isFinite(petContext?.age) && petContext.age >= 0
        ? `Approximate age: ${String(petContext.age).slice(0, 20)}`
        : "",
    ].filter(Boolean);
    const prompt = `Analyze this photo for pet breed identification. Inspect the image itself; do not guess a breed if an animal is not visible or the photo does not support identification. Identify whether there is no animal, multiple animals, an unclear/blurry/dark image, or an unsupported species. For one identifiable dog or cat, describe only visible physical characteristics and give a cautious best-supported breed/type with alternatives only when appropriate. Similar-looking breeds and mixed ancestry are common; never claim certainty, give confidence percentages, infer medical conditions, or use unrelated assumptions. Return only the required structured JSON. ${
      context.length
        ? `Optional context for the selected pet (appearance in the photo is primary; do not force a match): ${context.join("; ")}.`
        : ""
    }`;
    const result = await getBreedAnalysisModel().generateContent([
      prompt,
      { inlineData: { mimeType: "image/jpeg", data: imageData } },
    ]);
    let parsed;
    try {
      parsed = JSON.parse(result.response.text());
    } catch (error) {
      throw new Error("The assistant returned an unreadable analysis. Please try again.", { cause: error });
    }
    return validateBreedAnalysis(parsed);
  } catch (error) {
    throw new Error(getBreedAnalysisError(error), { cause: error });
  }
}
