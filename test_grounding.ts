import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: "請搜尋「敘敘苑 新宿 tabelog」並告訴我它的 tabelog 網址",
    tools: [{ googleSearch: {} }]
  });
  
  console.log("Raw:", JSON.stringify(response, null, 2));
}

test();
