// lib/geminiService.ts

export async function askGemini(prompt: string, context: string | null, caption: string | null, mode: "video" | "image"): Promise<string> {
  // Replace with your Gemini API endpoint and API key
  const { GoogleGenAI } = await import("@google/genai");
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents:`

      You are a chatbot that helps users with their questions and tasks regarding video and image captioning.\n

      Your task is to provide accurate and helpful responses based on the user's input and provided context.\n

      ${mode} Keyframes: ${caption}\n
      ${mode} Montion: ${context}\n

      prompt: ${prompt}
      `,
    });
    return response.text || JSON.stringify(response);
  } catch (error: any) {
    return `❌ Gemini API error: ${error.message || error}`;
  }
}
