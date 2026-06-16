export interface Verse {
  verse: number;
  text: string;
}

export interface ChapterData {
  book: string;
  chapter: number;
  verses: Verse[];
}

export interface BibleBook {
  id: string; // e.g., "gen"
  name: string; // e.g., "창세기"
  englishName: string; // e.g., "Genesis"
  abbreviation: string; // e.g., "창"
  chapterCount: number;
  testament: "old" | "new";
}
