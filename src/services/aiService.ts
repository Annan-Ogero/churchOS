import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiService = {
  async generate(prompt: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  },
  
  async getAnnouncement(details: string) {
    return this.generate(`Draft a warm, engaging church announcement for: ${details}. Include a clear call to action.`);
  },

  async getInsights(data: string) {
    return this.generate(`Analyze this church data and give 3 actionable leadership insights: ${data}`);
  },

  async getChatResponse(query: string, context: string) {
    return this.generate(`You are a helpful ChurchOS assistant. Context: ${context}. User: ${query}`);
  },

  async getVerseSuggestion(context: string) {
    return this.generate(`Based on this church context: ${context}, suggest one relevant Bible verse (reference only, e.g., John 3:16) that would be encouraging or relevant. Return ONLY the reference.`);
  }
};
