import crypto from 'crypto';

export interface ScrapedPageMetadata {
  title: string;
  canonicalUrl?: string;
  description?: string;
  publicationDate?: string;
  headings: { level: number; text: string }[];
  tables: string[];
  contentLength: number;
  contentHash: string;
}

export interface ScrapedPageResult {
  url: string;
  finalUrl: string;
  success: boolean;
  status?: number;
  metadata: ScrapedPageMetadata;
  cleanText: string;
  markdown: string;
  chunks: { id: string; heading?: string; text: string }[];
  errorMessage?: string;
  retrievalTimestamp: number;
}

export interface ScrapingOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxContentBytes?: number;
  customUserAgent?: string;
}

/**
 * Robust Web Scraping and HTML Parsing Service
 * Implements HTML parsing, boilerplate removal, table extraction,
 * markdown conversion, chunking, and SSRF security protection.
 */
export class WebScraper {
  private readonly defaultTimeoutMs = 8000;
  private readonly maxContentBytes = 5 * 1024 * 1024; // 5 MB max
  private readonly defaultUserAgent = 'DocumentAssistantResearch/2.0 (https://github.com/document-assistant-research; researcher@document-assistant.org) NodeFetch/3.0';

  /**
   * SSRF Protection: Validates whether a target URL is safe to retrieve
   */
  public isSafeUrl(rawUrl: string): { safe: boolean; reason?: string } {
    try {
      const parsed = new URL(rawUrl);

      // 1. Only allow http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: `Blocked protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
      }

      const hostname = parsed.hostname.toLowerCase();

      // 2. Block localhost and loopback addresses
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1'
      ) {
        return { safe: false, reason: 'Access to localhost and loopback addresses is prohibited.' };
      }

      // 3. Block private / intranet IP ranges (RFC 1918 & link-local)
      const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (ipv4Match) {
        const octet1 = parseInt(ipv4Match[1], 10);
        const octet2 = parseInt(ipv4Match[2], 10);

        // 10.0.0.0 - 10.255.255.255
        if (octet1 === 10) {
          return { safe: false, reason: 'Access to private 10.x.x.x networks is prohibited.' };
        }
        // 172.16.0.0 - 172.31.255.255
        if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
          return { safe: false, reason: 'Access to private 172.16-31.x.x networks is prohibited.' };
        }
        // 192.168.0.0 - 192.168.255.255
        if (octet1 === 192 && octet2 === 168) {
          return { safe: false, reason: 'Access to private 192.168.x.x networks is prohibited.' };
        }
        // 169.254.0.0 - 169.254.255.255 (Cloud instance metadata & link-local)
        if (octet1 === 169 && octet2 === 254) {
          return { safe: false, reason: 'Access to cloud instance metadata and link-local addresses is prohibited.' };
        }
      }

      return { safe: true };
    } catch (err: any) {
      return { safe: false, reason: `Invalid URL format: ${err.message}` };
    }
  }

  /**
   * Scrapes and parses a live webpage with SSRF checks, timeout, and cleaning
   */
  public async scrapeUrl(rawUrl: string, options: ScrapingOptions = {}): Promise<ScrapedPageResult> {
    const start = Date.now();
    const safetyCheck = this.isSafeUrl(rawUrl);
    if (!safetyCheck.safe) {
      return {
        url: rawUrl,
        finalUrl: rawUrl,
        success: false,
        metadata: this.emptyMetadata(),
        cleanText: '',
        markdown: '',
        chunks: [],
        errorMessage: safetyCheck.reason || 'URL failed security validation.',
        retrievalTimestamp: start,
      };
    }

    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(rawUrl, {
        method: 'GET',
        headers: {
          'User-Agent': options.customUserAgent || this.defaultUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          url: rawUrl,
          finalUrl: response.url || rawUrl,
          success: false,
          status: response.status,
          metadata: this.emptyMetadata(),
          cleanText: '',
          markdown: '',
          chunks: [],
          errorMessage: `HTTP error ${response.status}: ${response.statusText}`,
          retrievalTimestamp: start,
        };
      }

      const html = await response.text();
      return this.parseHtml(html, response.url || rawUrl);
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      return {
        url: rawUrl,
        finalUrl: rawUrl,
        success: false,
        metadata: this.emptyMetadata(),
        cleanText: '',
        markdown: '',
        chunks: [],
        errorMessage: isTimeout ? `Request timed out after ${timeoutMs}ms.` : err.message,
        retrievalTimestamp: start,
      };
    }
  }

  /**
   * Parses raw HTML string, cleans boilerplate, extracts metadata, tables, and converts to Markdown
   */
  public parseHtml(rawHtml: string, sourceUrl: string = 'https://example.com'): ScrapedPageResult {
    const timestamp = Date.now();

    // 1. Extract Metadata
    const title = this.extractTitle(rawHtml) || new URL(sourceUrl).hostname;
    const canonicalUrl = this.extractCanonicalUrl(rawHtml, sourceUrl);
    const description = this.extractMetaDescription(rawHtml);
    const publicationDate = this.extractPublicationDate(rawHtml);
    const headings = this.extractHeadings(rawHtml);
    const tables = this.extractTables(rawHtml);

    // 2. Clean Boilerplate & Navigation (scripts, styles, nav, footer, headers, ads)
    const cleanedHtml = this.removeBoilerplate(rawHtml);

    // 3. Convert Clean HTML to Markdown
    const markdown = this.htmlToMarkdown(cleanedHtml, tables);

    // 4. Generate Clean Plain Text
    const cleanText = this.stripHtmlTags(cleanedHtml).replace(/\s+/g, ' ').trim();

    // 5. Content Hash for Duplicate Detection
    const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');

    // 6. Divide into Meaningful Text Chunks (Chunking)
    const chunks = this.chunkContent(markdown, sourceUrl);

    return {
      url: sourceUrl,
      finalUrl: canonicalUrl || sourceUrl,
      success: true,
      status: 200,
      metadata: {
        title,
        canonicalUrl,
        description,
        publicationDate,
        headings,
        tables,
        contentLength: cleanText.length,
        contentHash,
      },
      cleanText,
      markdown,
      chunks,
      retrievalTimestamp: timestamp,
    };
  }

  /**
   * Removes boilerplate tags: scripts, styles, nav, footer, aside, ads, noscript
   */
  public removeBoilerplate(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, ''); // Comments
  }

  /**
   * Extracts page title from <title> or <h1>
   */
  public extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim().replace(/\s+/g, ' ');
    }

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim().replace(/\s+/g, ' ');
    }

    return '';
  }

  /**
   * Extracts canonical URL from <link rel="canonical" href="...">
   */
  public extractCanonicalUrl(html: string, fallbackUrl: string): string {
    const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
                  html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    if (match && match[1]) {
      try {
        return new URL(match[1], fallbackUrl).toString();
      } catch {
        return match[1];
      }
    }
    return fallbackUrl;
  }

  /**
   * Extracts meta description
   */
  public extractMetaDescription(html: string): string | undefined {
    const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extracts publication date from article metadata
   */
  public extractPublicationDate(html: string): string | undefined {
    const dateMatch =
      html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["'](?:publication_date|date|pubdate)["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<time[^>]+datetime=["']([^"']+)["']/i);

    if (dateMatch && dateMatch[1]) {
      const rawDate = dateMatch[1].trim();
      const parsed = Date.parse(rawDate);
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString().split('T')[0];
      }
      return rawDate;
    }
    return undefined;
  }

  /**
   * Extracts heading structure (h1, h2, h3)
   */
  public extractHeadings(html: string): { level: number; text: string }[] {
    const headings: { level: number; text: string }[] = [];
    const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      const text = this.stripHtmlTags(match[2]).trim().replace(/\s+/g, ' ');
      if (text.length > 0) {
        headings.push({ level, text });
      }
    }

    return headings;
  }

  /**
   * Extracts HTML tables and converts them to formatted Markdown tables
   */
  public extractTables(html: string): string[] {
    const tables: string[] = [];
    const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableInner = tableMatch[1];
      const rows: string[][] = [];
      const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;

      while ((trMatch = trRegex.exec(tableInner)) !== null) {
        const rowCells: string[] = [];
        const cellRegex = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        let cellMatch: RegExpExecArray | null;

        while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
          const cellText = this.stripHtmlTags(cellMatch[1]).trim().replace(/\|/g, '-').replace(/\s+/g, ' ');
          rowCells.push(cellText);
        }

        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
      }

      if (rows.length > 0) {
        const maxCols = Math.max(...rows.map((r) => r.length));
        const paddedRows = rows.map((r) => {
          while (r.length < maxCols) r.push('');
          return r;
        });

        // Format Markdown table
        let mdTable = '| ' + paddedRows[0].join(' | ') + ' |\n';
        mdTable += '| ' + paddedRows[0].map(() => '---').join(' | ') + ' |\n';
        for (let i = 1; i < paddedRows.length; i++) {
          mdTable += '| ' + paddedRows[i].join(' | ') + ' |\n';
        }
        tables.push(mdTable);
      }
    }

    return tables;
  }

  /**
   * Converts HTML elements into clean Markdown
   */
  public htmlToMarkdown(html: string, tables: string[] = []): string {
    let md = html;

    // Replace headings
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
    md = md.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n\n#### $1\n\n');

    // Replace bold / italic
    md = md.replace(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**');
    md = md.replace(/<(?:i|em)[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*');

    // Replace links
    md = md.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

    // Replace paragraphs and line breaks
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Replace lists
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
    md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

    // Replace tables with Markdown tables
    md = md.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      const idx = tables.findIndex((t) => t.length > 0);
      if (idx !== -1) {
        return '\n\n' + tables[idx] + '\n\n';
      }
      return '';
    });

    // Strip remaining tags
    md = this.stripHtmlTags(md);

    // Normalize multiple newlines and spaces
    md = md
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return md;
  }

  /**
   * Divides a large Markdown document into meaningful chunks of ~600 words with headings
   */
  public chunkContent(
    markdown: string,
    sourceUrl: string
  ): { id: string; heading?: string; text: string }[] {
    const sections = markdown.split(/(?=\n#{1,3}\s+)/);
    const chunks: { id: string; heading?: string; text: string }[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i].trim();
      if (sec.length < 30) continue;

      let heading: string | undefined;
      const headingMatch = sec.match(/^#{1,3}\s+(.+)/);
      if (headingMatch) {
        heading = headingMatch[1].trim();
      }

      chunks.push({
        id: `chunk_${i + 1}_${Date.now()}`,
        heading,
        text: sec.slice(0, 1500),
      });
    }

    if (chunks.length === 0 && markdown.trim().length > 0) {
      chunks.push({
        id: `chunk_1_${Date.now()}`,
        text: markdown.slice(0, 1500),
      });
    }

    return chunks;
  }

  public stripHtmlTags(text: string): string {
    return text.replace(/<[^>]+>/g, '');
  }

  private emptyMetadata(): ScrapedPageMetadata {
    return {
      title: '',
      headings: [],
      tables: [],
      contentLength: 0,
      contentHash: '',
    };
  }
}

export const webScraper = new WebScraper();
