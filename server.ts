import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini SDK with telemetry User-Agent header
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // Simple in-memory cache to make scripture browsing instant
  const bibleCache = new Map<string, any>();

  // Fullback logic for offline / key missing
  function getFallbackVerses(bookName: string, chapter: number) {
    if (bookName === "창세기" && chapter === 1) {
      return {
        book: "창세기",
        chapter: 1,
        verses: [
          { verse: 1, text: "태초에 하나님이 천지를 창조하시니라." },
          { verse: 2, text: "땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라." },
          { verse: 3, text: "하나님이 이르시되 빛이 있으라 하시니 빛이 있었고" },
          { verse: 4, text: "빛이 하나님이 보시기에 좋았더라 하나님이 빛과 어둠을 나누사" },
          { verse: 5, text: "하나님이 빛을 낮이라 부르시고 어둠을 밤이라 부르시니라 저녁이 되고 아침이 되니 이는 첫째 날이니라." },
          { verse: 6, text: "하나님이 이르시되 물 가운데에 궁창이 있어 물과 물로 나뉘라 하시고" },
          { verse: 7, text: "하나님이 궁창을 만드사 궁창 아래의 물과 궁창 위의 물로 나뉘게 하시니 그대로 되니라." },
          { verse: 8, text: "하나님이 궁창을 하늘이라 부르시니라 저녁이 되고 아침이 되니 이는 둘째 날이니라." },
          { verse: 9, text: "하나님이 이르시되 천하의 물이 한 곳으로 모이고 뭍이 드러나라 하시니 그대로 되니라." },
          { verse: 10, text: "하나님이 뭍을 땅이라 부르시고 모인 물을 바다라 부르시니 하나님이 보시기에 좋았더라." }
        ]
      };
    } else if (bookName === "요한복음" && chapter === 1) {
      return {
        book: "요한복음",
        chapter: 1,
        verses: [
          { verse: 1, text: "태초에 말씀이 계시니라 이 말씀이 하나님과 함께 계셨으니 이 말씀은 곧 하나님이시니라." },
          { verse: 2, text: "그가 태초에 하나님과 함께 계셨고" },
          { verse: 3, text: "만물이 그로 말미암아 지은 바 되었으니 지은 것이 하나도 그가 없이는 된 것이 없느니라." },
          { verse: 4, text: "그 안에 생명이 있었으니 이 생명은 사람들의 빛이라." },
          { verse: 5, text: "빛이 어둠에 비치되 어둠이 깨닫지 못하더라." },
          { verse: 6, text: "하나님께로부터 보내심을 받은 사람이 있으니 그의 이름은 요한이라." },
          { verse: 7, text: "그가 증언하러 왔으니 곧 빛에 대하여 증언하고 모든 사람이 자기로 말미암아 믿게 하려 함이라." },
          { verse: 8, text: "그는 이 빛이 아니요 이 빛에 대하여 증언하러 온 자라." },
          { verse: 9, text: "참 빛 곧 세상에 와서 각 사람에게 비추는 빛이 있었나니" },
          { verse: 10, text: "그가 세상에 계셨으며 세상은 그로 말미암아 지은 바 되었으되 세상이 그를 알지 못하였고" }
        ]
      };
    }
    
    // Dynamic default stub so that user is never left hanging
    return {
      book: bookName,
      chapter: chapter,
      verses: Array.from({ length: 15 }, (_, i) => ({
        verse: i + 1,
        text: `${bookName} ${chapter}장 ${i + 1}절 구절 내용입니다. 이 구절을 실시간으로 가져오려면 설정에서 Gemini API 키를 활성화하고 리로딩해 주십시오.`
      }))
    };
  }

  // API Route: Check setup health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", aiConfigured: !!ai });
  });

  // API Route: Fetch Bible passage (dynamic with Gemini or cache)
  app.get("/api/bible/:bookName/:chapter", async (req, res) => {
    const { bookName, chapter } = req.params;
    const chapterNum = parseInt(chapter, 10);

    if (!bookName || isNaN(chapterNum)) {
      return res.status(400).json({ error: "올바른 장 번호와 책 이름을 알려주세요." });
    }

    const cacheKey = `${bookName}_${chapterNum}`;
    if (bibleCache.has(cacheKey)) {
      return res.json(bibleCache.get(cacheKey));
    }

    if (!ai) {
      return res.json(getFallbackVerses(bookName, chapterNum));
    }

    try {
      const prompt = `대한성서공회 개역개정(또는 보편적인 개역한글) 번역본 기준, "${bookName} ${chapterNum}장"의 "모든" 구절을 빠짐없이 절 번호와 본문 텍스트 형태로 정확하게 가져와 주세요. 절대 내용을 요약하거나 축소하지 말고, 1절부터 해당 장의 마지막 절까지 한 글자도 다름없이 완벽한 원문 구절을 리턴해주세요.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "당신은 한글 개역개정 성경 텍스트 데이터베이스입니다. 사용자가 요청한 성경 책의 특정 장에 해당하는 모든 절을 정확하고 빠짐없이 정제된 JSON으로 가져와야 합니다. 텍스트는 한국어 성경 개역개정 번역본과 100% 동일해야 하며 수렁이나 오타가 있어서는 안 됩니다. 추가적인 대화나 설명, 마크다운 코드 블록 마크(```json 등)는 제외하시고 순수 JSON 문자열만 리턴해주세요.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              book: { type: Type.STRING },
              chapter: { type: Type.INTEGER },
              verses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    verse: { type: Type.INTEGER },
                    text: { type: Type.STRING }
                  },
                  required: ["verse", "text"]
                }
              }
            },
            required: ["book", "chapter", "verses"]
          }
        }
      });

      const text = response.text ? response.text.trim() : "";
      if (!text) {
        throw new Error("Gemini returned empty text.");
      }

      const parsedData = JSON.parse(text);
      bibleCache.set(cacheKey, parsedData);
      return res.json(parsedData);
    } catch (error: any) {
      console.error(`Gemini retrieval failed for ${bookName} ${chapterNum}:`, error);
      // fallback
      return res.json(getFallbackVerses(bookName, chapterNum));
    }
  });

  // API Route: AI-powered verse search & topic guide
  app.post("/api/bible/search", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "검색어를 입력해주세요." });
    }

    if (!ai) {
      return res.json({
        results: [
          { book: "고린도전서", chapter: 13, verse: 13, text: "그런즉 믿음, 소망, 사랑, 이 세 가지는 항상 있을 것인데 그 중의 제일은 사랑이라.", reason: "사랑과 관련된 핵심적인 성경 성구입니다." },
          { book: "빌립보서", chapter: 4, verse: 13, text: "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라.", reason: "용기와 믿음을 북돋아주는 구절입니다." }
        ]
      });
    }

    try {
      const prompt = `성경 속에서 영적 가치 혹은 키워드인 "${query}"와(과) 연관된 핵심적이고 중요하며 위로를 주는 대표 성경 구절(개역개정 기준) 최대 5~6개를 찾아 목록으로 뽑아주세요.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "당신은 기독교 신앙 고문이자 성경 구절 검색 전문가입니다. 사용자의 질문이나 키워드를 기반으로 연관성이 아주 높은 아름다운 성경 구절들을 찾아내어 제공합니다. 추가 해설은 생략하고 순수 JSON 형태로만 리턴해 주십시오.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    book: { type: Type.STRING },
                    chapter: { type: Type.INTEGER },
                    verse: { type: Type.INTEGER },
                    text: { type: Type.STRING },
                    reason: { type: Type.STRING, description: "이 구절이 검색 주제나 상황과 관련된 은혜로운 묵상 한 문장" }
                  },
                  required: ["book", "chapter", "verse", "text", "reason"]
                }
              }
            },
            required: ["results"]
          }
        }
      });

      const text = response.text ? response.text.trim() : "";
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (error) {
      console.error("Bible search error:", error);
      return res.status(500).json({ error: "검색을 처리할 수 없습니다." });
    }
  });

  // API Route: AI-powered chapter meditation / devotion guide
  app.post("/api/bible/meditate", async (req, res) => {
    const { bookName, chapter, verses } = req.body;

    if (!bookName || !chapter) {
      return res.status(400).json({ error: "책 이름과 장 번호가 주어져야 합니다." });
    }

    if (!ai) {
      return res.json({
        meditation: "### 말씀 묵상\n\n말씀을 묵상하며 주님의 깊은 임재를 경험하시길 축복합니다. (실시간 AI 묵상을 보시려면 Gemini API 설정을 확인해주세요.)"
      });
    }

    try {
      const versesSnippet = verses ? JSON.stringify(verses.slice(0, 5)) : "";
      const prompt = `"${bookName} ${chapter}장"에 담긴 영적 배경과 은혜로운 메시지를 평신도가 이해하기 쉽게 풀어서 설명해 주세요. 본문의 일부 구절: ${versesSnippet}. 하루를 살아가며 적용할 수 있는 삶의 지혜와 따뜻한 축복의 기도문도 꼬리 글로 다듬어 한국어 존댓말로 깊이 있고 은혜롭게 작성합시다.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "당신은 기독교 신앙에 도움을 주는 자상하고 지혜로운 성경 강해자입니다. 성경의 해당 장에 대해 문맥, 교훈적 의미, 삶의 작은 적용점, 그리고 마음에 위로를 주는 간략한 마무리 기도문을 적어주어야 합니다. 출력은 깔끔하게 정리된 마크다운(Markdown) 문법을 사용해 구성하되, 기술적인 용어나 소스 코드 등 비전문가에게 어색한 용어는 철저히 배제해 주십시오."
        }
      });

      return res.json({ meditation: response?.text || "" });
    } catch (error) {
      console.error("Bible meditate error:", error);
      return res.status(500).json({ error: "묵상 에세이를 구성하는 중 오류가 생겼습니다." });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
