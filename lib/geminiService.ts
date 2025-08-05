// lib/geminiService.ts

export async function askGemini(prompt: string): Promise<string> {
  // Replace with your Gemini API endpoint and API key
  const { GoogleGenAI } = await import("@google/genai");
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || JSON.stringify(response);
  } catch (error: any) {
    return `❌ Gemini API error: ${error.message || error}`;
  }
}
