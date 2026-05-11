import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PhotoAnalysisResult {
  isValid: boolean;
  ocrText?: string;
  detectedIssues: string[];
  description: string;
}

export async function analyzeVehiclePhoto(base64Image: string, expectedContent: 'chassi' | 'motor' | 'placa' | 'veiculo_360'): Promise<PhotoAnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analise esta imagem de um veículo. 
O conteúdo esperado é: ${expectedContent}.
Siga estas instruções:
1. Valide se a imagem realmente contém o que foi solicitado (${expectedContent}).
2. Se for uma placa, extraia o texto (OCR).
3. Se for chassi ou motor, verifique se a numeração está legível.
4. Identifique possíveis danos visuais ou irregularidades.
5. Retorne os dados em formato JSON.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming jpeg, could be passed as arg
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN, description: "Se a imagem corresponde ao conteúdo esperado" },
          ocrText: { type: Type.STRING, description: "Texto extraído da placa ou numeração, se aplicável" },
          detectedIssues: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de problemas ou danos detectados"
          },
          description: { type: Type.STRING, description: "Descrição detalhada da análise" }
        },
        required: ["isValid", "detectedIssues", "description"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as PhotoAnalysisResult;
  } catch (error) {
    console.error("Erro ao parsear resposta do AI:", error);
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
  const model = "gemini-3-flash-preview";
  
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

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          ...imageParts
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || '{}') as LaudoPreFill;
  } catch (error) {
    console.error("Erro ao parsear laudo IA:", error);
    return {
      generalCondition: "Erro na análise.",
      checklistSuggestions: {},
      detectedIssues: []
    };
  }
}
