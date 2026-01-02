
import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_PREFIX = 'ipsc_cache_v4_';
const memoryCache = new Map<string, { data: any, timestamp: number }>();
const inflightRequests = new Map<string, Promise<any>>();

// services/gemini.ts

// Função simulada (MOCK) - Não usa IA de verdade
export async function sendMessageToGemini(message: string) {
  return new Promise<string>((resolve) => {
    
    // Simula um tempo de espera de 1.5 segundos
    setTimeout(() => {
      resolve(`Você disse: "${message}". \n(Esta é uma resposta automática pois a IA está desligada).`);
    }, 1500);
    
  });
}

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

const setCache = (key: string, data: any) => {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ipsc_cache_')) localStorage.removeItem(k);
    });
  }
};

async function callWithRetry<T>(cacheKey: string | null, fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  if (cacheKey) {
    const cached = checkCache(cacheKey);
    if (cached) return cached;
    if (inflightRequests.has(cacheKey)) return inflightRequests.get(cacheKey);
  }

  const execution = (async () => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        if (cacheKey) setCache(cacheKey, result);
        return result;
      } catch (error: any) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, i)));
          continue;
        }
      }
    }
    throw lastError;
  })();

  if (cacheKey) {
    inflightRequests.set(cacheKey, execution);
    try { return await execution; } finally { inflightRequests.delete(cacheKey); }
  }
  return await execution;
}

export const findRelevantPdf = async (query: string, fileNames: string[]) => {
  const cacheKey = `pdf_search_${query.toLowerCase().trim()}`;
  return callWithRetry(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Atue como um bibliotecário de igreja. Com base nesta lista de arquivos: [${fileNames.join(', ')}], qual deles é o mais provável de conter informações sobre: "${query}"? 
      Explique brevemente o porquê. Retorne em JSON com: fileName (string, deve ser um nome da lista), confidence (number 0-1) e reasoning (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fileName: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["fileName", "confidence", "reasoning"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const generateDevotional = async (theme: string) => {
  return callWithRetry(`devotional_${theme}`, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere um devocional cristão reformado e inspirador sobre: "${theme}". Siga o esquema: Título criativo, Versículo base (Versão Almeida Revista e Atualizada - ARA) e uma reflexão de aproximadamente 3 parágrafos com aplicação prática.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            verse: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "verse", "content"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

export const parseAgendaFile = async (base64Data: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: 'Você é um assistente administrativo de igreja. Analise este arquivo e extraia a programação semanal. Retorne um JSON com um array de objetos contendo: title (string), date (string no formato YYYY-MM-DD), time (string no formato HH:mm) e location (string). Retorne apenas o JSON.',
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            location: { type: Type.STRING }
          },
          required: ["title", "date", "time"]
        }
      }
    }
  });
  return JSON.parse(response.text.trim());
};

export const analyzeStudyDocument = async (base64Data: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: 'Atue como um teólogo reformado presbiteriano. Analise este documento de estudo e forneça um resumo estruturado. Retorne em JSON com: title, mainVerse, context, detailedAnalysis (markdown), practicalPoints (array de strings), e theologicalTags (array).',
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          mainVerse: { type: Type.STRING },
          context: { type: Type.STRING },
          detailedAnalysis: { type: Type.STRING },
          practicalPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          theologicalTags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "mainVerse", "context", "detailedAnalysis", "practicalPoints"]
      }
    }
  });
  return JSON.parse(response.text.trim());
};

export const queryManualPresbiteriano = async (query: string) => {
  const cacheKey = `manual_query_v1_${query.toLowerCase().trim()}`;
  return callWithRetry(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Você é um especialista em educação religiosa e tradições protestantes, focado no Manual Presbiteriano do Brasil (IPB).
      
      Sua tarefa é realizar uma análise profunda baseada na seguinte consulta: "${query}"
      
      REGRAS:
      1. Use o conteúdo oficial do Manual Presbiteriano da IPB (incluindo CI, CD e Princípios de Liturgia).
      2. Forneça uma resposta estruturada com insights teológicos, históricos e práticos.
      3. Identifique conexões com princípios fundamentais.
      4. Sugira aplicações inovadoras ou reflexões sobre lacunas quando apropriado.
      
      Responda em JSON com os campos abaixo.`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título da análise" },
            context: { type: Type.STRING, description: "Contexto histórico ou normativo" },
            principles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Princípios centrais identificados" },
            analysis: { type: Type.STRING, description: "Corpo da análise detalhada" },
            practicalApplication: { type: Type.STRING, description: "Aplicações práticas para hoje" },
            innovativeIdeas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ideias inovadoras de brainstorming" },
            references: { type: Type.STRING, description: "Referências específicas ao Manual" }
          },
          required: ["title", "context", "principles", "analysis", "practicalApplication"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

/**
 * Fix for getBibleChapter truncated and errors in App.tsx:
 * Completing the function to return the correct chapter structure.
 */
export const getBibleChapter = async (book: string, chapter: number) => {
  const cacheKey = `chapter_v4_${book.toLowerCase()}_${chapter}`;
  return callWithRetry(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Retorne o capítulo ${chapter} do livro de ${book} na Bíblia (versão ARC ou ARA). Retorne apenas o JSON com um array of objetos: { verse: number, text: string }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              verse: { type: Type.INTEGER },
              text: { type: Type.STRING }
            },
            required: ["verse", "text"]
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

/**
 * Fix for Error in file App.tsx on line 11: 
 * Module '"./services/gemini"' has no exported member 'searchBibleKeywords'.
 */
export const searchBibleKeywords = async (query: string) => {
  const cacheKey = `search_bible_${query.toLowerCase().trim()}`;
  return callWithRetry(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Atue como um especialista em Bíblia. Busque na Bíblia versículos que contenham ou se relacionem com a busca: "${query}". 
      Retorne um JSON with um array de objetos: { book: string, chapter: number, verse: number, text: string }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              book: { type: Type.STRING },
              chapter: { type: Type.INTEGER },
              verse: { type: Type.INTEGER },
              text: { type: Type.STRING }
            },
            required: ["book", "chapter", "verse", "text"]
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

/**
 * Fix for Error in file App.tsx on line 15:
 * Module '"./services/gemini"' has no exported member 'searchCatechism'.
 */
export const searchCatechism = async (query: string) => {
  const cacheKey = `search_catechism_${query.toLowerCase().trim()}`;
  return callWithRetry(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Com base no Catecismo Maior de Westminster, busque perguntas e respostas relacionadas a: "${query}". 
      Retorne um JSON with um array de objetos seguindo o formato: { id: string, category: string, title: string, question: string, answer: string, biblicalRef: string }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              title: { type: Type.STRING },
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              biblicalRef: { type: Type.STRING }
            },
            required: ["id", "title", "question", "answer"]
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  });
};

/**
 * Fix for Error in file App.tsx on line 13:
 * Module '"./services/gemini"' has no exported member 'generateVerseAudio'.
 */
export const generateVerseAudio = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Leia este versículo bíblico de forma clara e solene: ${text}` }] }],
    config: {
      // Fix: Use correct property name responseModalities
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
};
