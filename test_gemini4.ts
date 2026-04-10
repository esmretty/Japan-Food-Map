import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const restaurantName = "隠れ家ダイニングなべや";
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `請務必使用 Google Search 工具上網搜尋這家位於日本東京的餐廳：「${restaurantName}」。
請執行以下兩個搜尋：
1. 搜尋 "${restaurantName} tabelog"，找到該餐廳的 Tabelog 頁面，並萃取分數、料理類型、網址、獎項、是否為百名店。
2. 搜尋 "${restaurantName} 東京 google map"，找到該餐廳的精確經緯度座標 (lat, lng) 與完整地址。

請萃取出以下資訊：
1. name: 餐廳名稱 (日文原名)
2. address: 完整地址 (包含東京都)
3. lat: 精確的緯度座標 (數字)
4. lng: 精確的經度座標 (數字)
5. score: Tabelog 目前的分數 (數字，例如 3.54，如果找不到請填 0)
6. genre: 料理類型 (例如：燒肉、拉麵、壽司)
7. tabelogUrl: Tabelog 網址
8. awards: 獲得的獎項 (字串陣列，例如：["The Tabelog Award 2024 Bronze"]，如果沒有請給空陣列)
9. hyakumeiten: 是否為 Tabelog 百名店 (布林值 true/false)

請以 JSON 格式回傳。`,
    tools: [{ googleSearch: {} }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          address: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          score: { type: Type.NUMBER },
          genre: { type: Type.STRING },
          tabelogUrl: { type: Type.STRING },
          awards: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          hyakumeiten: { type: Type.BOOLEAN }
        },
        required: ["name", "address", "lat", "lng", "score", "genre", "tabelogUrl", "awards", "hyakumeiten"]
      }
    }
  });
  console.log(response.text);
}
test();
