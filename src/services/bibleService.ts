export interface BibleVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleResponse {
  reference: string;
  verses: BibleVerse[];
  text: string;
  translation_name: string;
}

export const bibleService = {
  async getPassage(reference: string): Promise<BibleResponse | null> {
    try {
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Bible API error:", error);
      return null;
    }
  },

  async search(query: string): Promise<BibleResponse | null> {
    // The bible-api.com doesn't have a dedicated search endpoint for keywords,
    // but it handles references well. For keyword search, we might need another approach
    // or just rely on the user providing references for now.
    return this.getPassage(query);
  }
};
