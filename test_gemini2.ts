import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: "請上網搜尋東京餐廳「敘敘苑 新宿中央東口店」的 Tabelog 網址和經緯度",
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tabelogUrl: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
        }
      }
    }
  });
  console.log(response.text);
}
test();
