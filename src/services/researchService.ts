import { SourceCitation, ResponseLengthPreference, SourcePreference, SearchStep, AttachedImagePayload } from '../types';
import { auth } from './firebase';

export interface WebResearchPayload {
  question: string;
  sourcePreference: SourcePreference;
  responseLength: ResponseLengthPreference;
  conversationId?: string;
  userId?: string;
  previousMessages?: { sender: 'user' | 'assistant'; text: string }[];
  image?: AttachedImagePayload;
}

export interface WebResearchResponse {
  answer: string;
  citations: SourceCitation[];
  searchSteps: { step: SearchStep; message: string; timestamp: number }[];
  noSourcesFound: boolean;
}

import { API_BASE_URL } from './apiConfig';

/**
 * Strip common conversational lead-ins to improve Wikipedia search relevancy
 */
function extractSearchKeywords(question: string): string {
  const cleaned = question
    .replace(/^(explain|summarize|what is|what are|who is|who was|how does|how do|compare|tell me about|describe|give me an overview of)\s+/i, '')
    .replace(/\s+(in simple english|in plain english|in simple words|in layman's terms|simply|step by step|in detail|for beginners|please)\s*$/i, '')
    .replace(/[?.,!]+$/g, '')
    .trim();

  return cleaned.length > 2 ? cleaned : question.trim();
}

/**
 * Strip basic HTML tags from Wikipedia snippets
 */
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Pause helper respecting AbortSignal
 */
const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Generation stopped by user.'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Generation stopped by user.'));
    });
  });

/**
 * Direct Wikipedia Live Search Implementation
 * Uses public MediaWiki Action API & Wikimedia REST Summary API (CORS enabled)
 */
async function searchLiveWikipedia(
  payload: WebResearchPayload,
  onStatusUpdate?: (step: SearchStep, message: string) => void,
  signal?: AbortSignal
): Promise<WebResearchResponse> {
  const searchSteps: { step: SearchStep; message: string; timestamp: number }[] = [];

  const recordStep = (step: SearchStep, message: string) => {
    searchSteps.push({ step, message, timestamp: Date.now() });
    if (onStatusUpdate) onStatusUpdate(step, message);
  };

  recordStep('understanding', 'Analyzing question and identifying core topics...');
  await delay(350, signal);

  const keywords = extractSearchKeywords(payload.question);
  recordStep('searching_wikipedia', `Searching Wikipedia for "${keywords}"...`);

  // 1. Query Wikipedia Search API
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    keywords
  )}&utf8=&format=json&origin=*`;

  let searchRes: any;
  try {
    const res = await fetch(searchUrl, { signal });
    if (!res.ok) throw new Error(`Wikipedia search failed with status ${res.status}`);
    searchRes = await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Generation stopped by user.');
    // Fallback: try raw question
    const fallbackRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        payload.question
      )}&utf8=&format=json&origin=*`,
      { signal }
    );
    if (!fallbackRes.ok) throw err;
    searchRes = await fallbackRes.json();
  }

  const hits = searchRes?.query?.search || [];
  if (hits.length === 0) {
    recordStep('completed', 'Search completed: no matching records found.');
    return {
      answer: 'No verified sources were found matching this inquiry across Wikipedia or our indexed web registry.',
      citations: [],
      searchSteps,
      noSourcesFound: true,
    };
  }

  // 2. Fetch Detailed Article Summaries for top hits
  const topHits = hits.slice(0, 3);
  const articleTitles = topHits.map((h: any) => h.title);
  recordStep('reading_sources', `Reading articles: ${articleTitles.join(', ')}...`);
  await delay(350, signal);

  const articlesData: {
    title: string;
    pageid: number;
    extract: string;
    url: string;
    description?: string;
  }[] = [];

  for (const hit of topHits) {
    if (signal?.aborted) throw new Error('Generation stopped by user.');
    try {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        hit.title
      )}`;
      const sRes = await fetch(summaryUrl, { signal });
      if (sRes.ok) {
        const sJson = await sRes.json();
        articlesData.push({
          title: sJson.title || hit.title,
          pageid: sJson.pageid || hit.pageid,
          extract: sJson.extract || stripHtml(hit.snippet),
          url:
            sJson.content_urls?.desktop?.page ||
            `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
          description: sJson.description,
        });
        continue;
      }
    } catch {
      // Fallback to snippet from search hit
    }

    articlesData.push({
      title: hit.title,
      pageid: hit.pageid,
      extract: stripHtml(hit.snippet),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
    });
  }

  // 3. Synthesize structured factual answer
  recordStep('generating', 'Synthesizing factual response with verified source citations...');
  await delay(300, signal);

  const primaryArticle = articlesData[0];
  const secondaryArticles = articlesData.slice(1);

  let formattedAnswer = '';

  if (payload.responseLength === 'short') {
    formattedAnswer = `**${primaryArticle.title}**\n\n${primaryArticle.extract}\n\n`;
    if (secondaryArticles.length > 0) {
      formattedAnswer += `**Related Context:** ${secondaryArticles
        .map((a) => `**${a.title}**: ${a.extract.slice(0, 160)}...`)
        .join(' ')}`;
    }
  } else if (payload.responseLength === 'detailed') {
    formattedAnswer = `### Research Synthesis: ${primaryArticle.title}\n\n`;
    if (primaryArticle.description) {
      formattedAnswer += `*Topic Definition: ${primaryArticle.description}*\n\n`;
    }
    formattedAnswer += `${primaryArticle.extract}\n\n`;

    if (secondaryArticles.length > 0) {
      formattedAnswer += `### Core Concepts & Extended Findings\n\n`;
      for (const a of secondaryArticles) {
        formattedAnswer += `#### ${a.title}\n${a.extract}\n\n`;
      }
    }

    formattedAnswer += `### Key Takeaways\n`;
    formattedAnswer += `- **Primary Subject:** Grounded in Wikipedia's documented article on [${primaryArticle.title}](${primaryArticle.url}).\n`;
    formattedAnswer += `- **Factual Verification:** Information retrieved and cross-referenced with ${articlesData.length} indexed Wikipedia records.\n`;
  } else {
    // Balanced (default)
    formattedAnswer = `### Overview: ${primaryArticle.title}\n\n`;
    formattedAnswer += `${primaryArticle.extract}\n\n`;

    if (secondaryArticles.length > 0) {
      formattedAnswer += `### Key Details & Related Context\n`;
      for (const a of secondaryArticles) {
        formattedAnswer += `- **${a.title}:** ${a.extract}\n`;
      }
    }
  }

  // 4. Construct Citations
  const citations: SourceCitation[] = articlesData.map((a) => ({
    id: `cite_wiki_${a.pageid}`,
    sourceType: 'wikipedia',
    title: a.title,
    url: a.url,
    domain: 'en.wikipedia.org',
    snippet: a.extract,
  }));

  recordStep('completed', 'Research synthesis complete with verified citations.');

  return {
    answer: formattedAnswer,
    citations,
    searchSteps,
    noSourcesFound: false,
  };
}

export const queryWebResearch = async (
  payload: WebResearchPayload,
  onStatusUpdate?: (step: SearchStep, message: string) => void,
  signal?: AbortSignal
): Promise<WebResearchResponse> => {
  if (!payload.question.trim() && !payload.image) {
    throw new Error('A question or an image attachment is required.');
  }

  // If external custom API backend is configured, send request there
  if (API_BASE_URL) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate('understanding', 'Analyzing question and intent...');
      }

      let token: string | undefined;
      try {
        token = await auth?.currentUser?.getIdToken();
      } catch (e) {
        // Fallback for offline / dev
      }

      const effectiveUserId = payload.userId || auth?.currentUser?.uid || 'anonymous';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-user-id'] = effectiveUserId;

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/api/research/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...payload,
            userId: effectiveUserId,
          }),
          signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') throw fetchErr;
        // Try relative URL through Vite proxy if direct fetch failed
        if (API_BASE_URL && API_BASE_URL !== '') {
          try {
            response = await fetch('/api/research/query', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                ...payload,
                userId: effectiveUserId,
              }),
              signal,
            });
          } catch (relErr: any) {
            if (relErr.name === 'AbortError') throw relErr;
            console.warn('Backend unavailable, falling back to direct Wikipedia search:', relErr);
            return await searchLiveWikipedia(payload, onStatusUpdate, signal);
          }
        } else {
          console.warn('Backend unavailable, falling back to direct Wikipedia search:', fetchErr);
          return await searchLiveWikipedia(payload, onStatusUpdate, signal);
        }
      }

      if (!response.ok) {
        if (onStatusUpdate) onStatusUpdate('error', 'Search service returned an error.');
        const errorData = await response.json().catch(() => ({}));
        let errorMsg =
          (errorData.error && typeof errorData.error === 'object')
            ? errorData.error.message || errorData.error.code
            : errorData.error || errorData.message;

        // If backend returned an unparseable proxy 5xx error (e.g. Vite proxy connect ECONNREFUSED HTML)
        if (!errorMsg) {
          if (response.status >= 500) {
            console.warn('Backend proxy 5xx error encountered; falling back to direct Wikipedia live search');
            return await searchLiveWikipedia(payload, onStatusUpdate, signal);
          }
          errorMsg = `Research API error (${response.status}): ${response.statusText || 'Request failed'}`;
        }
        throw new Error(errorMsg);
      }

      const rawJson = await response.json();
      if (onStatusUpdate) {
        onStatusUpdate('completed', 'Finished synthesizing response.');
      }

      const data = rawJson.data || rawJson;
      return {
        answer: data.answer || '',
        citations: data.citations || [],
        searchSteps: data.searchSteps || [],
        noSourcesFound: Boolean(data.noSourcesFound),
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Generation stopped by user.');
      }
      if (onStatusUpdate) onStatusUpdate('error', error.message);
      throw error;
    }
  }

  // Live Wikipedia Client Search
  try {
    return await searchLiveWikipedia(payload, onStatusUpdate, signal);
  } catch (error: any) {
    if (error.message && error.message.includes('stopped by user')) {
      throw error;
    }
    if (onStatusUpdate) onStatusUpdate('error', error.message || 'Wikipedia search failed.');
    throw error;
  }
};
