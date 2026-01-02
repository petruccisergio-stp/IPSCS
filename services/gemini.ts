
import { GoogleGenAI, Type, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

// Função utilitária para inicializar IA de forma segura
const getAI = () => {
  if (!API_KEY) return null;
  return new GoogleGenAI({ apiKey: API_KEY });
};

const CACHE_PREFIX = 'ipsc_cache_v4_';
const memoryCache = new Map<string, { data: any, timestamp: number }>();

export const checkCache = (key: string) => {
  if (memoryCache.has(key)) return memoryCache.get(key)!.data;
  const cached = localStorage.getItem(CACHE_PREFIX + key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
        memoryCache.set(key, { data, timestamp });
        return data;
      }
    } catch (e) { return null; }
  }
  return null;
};

export const getBibleChapter = async (book: string, chapter: number) => {
  const ai = getAI();
  if (!ai) {
    // Retorno Mockado para funcionar no Vercel sem token
    return [
      { verse: 1, text: "No princípio, criou Deus os céus e a terra." },
      { verse: 2, text: "A terra, porém, estava sem forma e vazia." }
    ];
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Retorne o capítulo ${chapter} do livro de ${book} na Bíblia. Retorne apenas JSON array: { verse: number, text: string }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim());
};

export const searchBibleKeywords = async (query: string) => {
  const ai = getAI();
  if (!ai) return [];
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Busque versículos sobre: "${query}". JSON array: { book, chapter, verse, text }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim());
};

export const searchCatechism = async (query: string) => {
  const ai = getAI();
  if (!ai) return [];
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Catecismo Maior sobre: "${query}". JSON array.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim());
};

export const queryManualPresbiteriano = async (query: string) => {
  const ai = getAI();
  if (!ai) return { title: "Aviso", context: "Chave de IA ausente para consulta detalhada." };
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Consulte o Manual da IPB sobre: "${query}". JSON.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim());
};

export const generateVerseAudio = async (text: string) => {
  const ai = getAI();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: { responseModalities: [Modality.AUDIO] }
  });
  return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
};

export const analyzeStudyDocument = async (base64: string, mime: string) => ({ title: "Documento Recebido", mainVerse: "Pendente Processamento" });
