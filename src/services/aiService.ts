import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in the environment variables.");
    }
    aiInstance = new GoogleGenAI(apiKey);
  }
  return aiInstance;
}

export interface PhotoAnalysisResult {
  isValid: boolean;
  ocrText?: string;
  detectedIssues: string[];
  description: string;
}

export async function analyzeVehiclePhoto(base64Image: string, expectedContent: 'chassi' | 'motor' | 'placa' | 'veiculo_360'): Promise<PhotoAnalysisResult> {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `Analise esta imagem de um veículo. 
O conteúdo esperado é: ${expectedContent}.
Siga estas instruções:
1. Valide se a imagem realmente contém o que foi solicitado (${expectedContent}).
2. Se for uma placa, extraia o texto (OCR).
3. Se for chassi ou motor, verifique se a numeração está legível.
4. Identifique possíveis danos visuais ou irregularidades.
5. Retorne os dados em formato JSON.`;

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const resultText = response.response.text();
  try {
    return JSON.parse(resultText || '{}') as PhotoAnalysisResult;
  } catch (error) {
    console.error("Erro ao parsear resposta do AI:", error, resultText);
    return {
      isValid: false,
      detectedIssues: [],
      description: "Erro ao processar análise da imagem."
    };
  }
}

export interface LaudoPreFill {
  brand?: string;
  model?: string;
  color?: string;
  plate?: string;
  generalCondition: string;
  checklistSuggestions: Record<string, 'bom' | 'regular' | 'ruim'>;
  detectedIssues: string[];
}

export async function analyzeFullVehicle(images: Record<string, string>): Promise<LaudoPreFill> {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `Analise este conjunto de fotos de um veículo para preencher um laudo técnico.
Tente identificar:
1. Marca e Modelo.
2. Cor.
3. Placa (se visível).
4. Condição geral.
5. Estado dos componentes (bom, regular, ruim) para: Pintura, Pneus, Vidros, Lanternas, Interior.
6. Problemas detectados (danos, riscos, amassados).

Retorne os dados estritamente em formato JSON seguindo este esquema:
{
  "brand": "string",
  "model": "string",
  "color": "string",
  "plate": "string",
  "generalCondition": "string",
  "checklistSuggestions": {
    "pintura": "bom|regular|ruim",
    "pneus": "bom|regular|ruim",
    "vidros": "bom|regular|ruim",
    "lanternas": "bom|regular|ruim",
    "interior": "bom|regular|ruim"
  },
  "detectedIssues": ["string"]
}`;

  const imageParts = Object.values(images).map((data) => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: data.split(',')[1] || data
    }
  }));

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...imageParts
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const resultText = response.response.text();
  try {
    return JSON.parse(resultText || '{}') as LaudoPreFill;
  } catch (error) {
    console.error("Erro ao parsear laudo IA:", error, resultText);
    return {
      generalCondition: "Erro na análise.",
      checklistSuggestions: {},
      detectedIssues: []
    };
  }
}
