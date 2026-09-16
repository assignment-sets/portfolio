export interface ReadingTimeStats {
  minutes: number;
  wordCount: number;
  imageCount: number;
  codeBlockCount: number;
  totalSeconds: number;
}

/**
 * Calculates accurate reading duration for technical markdown articles
 * factoring in prose (200 WPM), code syntax (100 WPM), and Medium's image diminishing curve.
 */
export function calculateReadingTimeDetails(markdownText: string): ReadingTimeStats {
  if (!markdownText || typeof markdownText !== "string") {
    return {
      minutes: 1,
      wordCount: 0,
      imageCount: 0,
      codeBlockCount: 0,
      totalSeconds: 0,
    };
  }

  // 1. Detect and count Images (![alt](url) and <img ... src=... />)
  const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const htmlImageRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;

  const mdImageMatches = markdownText.match(mdImageRegex) || [];
  const htmlImageMatches = markdownText.match(htmlImageRegex) || [];
  const imageCount = mdImageMatches.length + htmlImageMatches.length;

  // Medium diminishing seconds curve for images (12s, 11s, 10s... down to 3s)
  let imageSeconds = 0;
  for (let i = 0; i < imageCount; i++) {
    imageSeconds += i < 10 ? 12 - i : 3;
  }

  // 2. Extract and measure Fenced Code Blocks (```lang ... ```)
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlockMatches = markdownText.match(codeBlockRegex) || [];
  const codeBlockCount = codeBlockMatches.length;

  let codeWords = 0;
  for (const block of codeBlockMatches) {
    const codeContent = block
      .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
      .replace(/```$/, "");
    const wordsInBlock = codeContent.trim().split(/\s+/).filter(Boolean).length;
    codeWords += wordsInBlock;
  }

  // Code comprehension pacing at 100 WPM
  const codeSeconds = (codeWords / 100) * 60;

  // 3. Extract and measure pure prose (excluding images & code blocks)
  const cleanProse = markdownText
    .replace(codeBlockRegex, " ")
    .replace(mdImageRegex, " ")
    .replace(htmlImageRegex, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*`_~\[\]()!>+-]/g, " ");

  const proseWords = cleanProse.trim().split(/\s+/).filter(Boolean).length;
  const proseSeconds = (proseWords / 200) * 60;

  const totalWords = proseWords + codeWords;
  const totalSeconds = proseSeconds + codeSeconds + imageSeconds;
  const minutes = Math.max(1, Math.ceil(totalSeconds / 60));

  return {
    minutes,
    wordCount: totalWords,
    imageCount,
    codeBlockCount,
    totalSeconds: Math.round(totalSeconds),
  };
}

/**
 * Estimates reading time in minutes for technical markdown articles.
 */
export function calculateReadingTime(markdownText: string): number {
  return calculateReadingTimeDetails(markdownText).minutes;
}
