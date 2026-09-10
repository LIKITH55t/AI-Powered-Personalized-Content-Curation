/**
 * ORION X (Twitter) DOM adapter — classic content script (no imports).
 *
 * Registers collectors on globalThis.__orionAdapters for content.js to use.
 * The collector is recycle-safe: each element's seen-tweet-id is tracked in
 * data-orion-seen, so virtualized DOM recycling (same node, new tweet) is
 * detected and re-evaluated, while unchanged tweets are never re-extracted.
 */
(() => {
  "use strict";
  const IS_X = /(^|\.)(x|twitter)\.com$/.test(location.hostname);

  const kwTags = [
    [/\bdsa|leetcode|interview|sde|internship|placement|resume|system design|offer|oa\b/i, "placements"],
    [/\bupsc|jee|neet|gate|exam|pyq|current affairs|prelims|mains|ncert\b/i, "exams"],
    [/\bpython|react|javascript|course|tutorial|programming|machine learning|learn\b/i, "skills"],
    [/\b(?:giveaway|retweet to win|airdrop|link in bio)\b/i, "spam"],
    [/\bmeme\b|\bfunny\b|\blol\b|\b😂\b|\b💀\b|\b#fail\b/i, "meme"],
  ];

  /** A tweet's own status id, ignoring status links inside nested embeds. */
  function statusIdFromArticle(article) {
    const links = [...article.querySelectorAll('a[href*="/status/"]')].filter(
      (a) => a.closest('article[data-testid="tweet"]') === article
    );
    for (const link of links) {
      const m = (link.getAttribute("href") || "").split("/status/")[1];
      if (m) return m.split(/[?#]/)[0];
    }
    return "";
  }

  /** True if this article is a quote-embed nested inside another tweet. */
  function isNestedQuote(article) {
    const parent = article.parentElement;
    if (!parent) return false;
    const ancestor = parent.closest('article[data-testid="tweet"]');
    return ancestor !== null && ancestor !== article;
  }

  /** Extract normalized tweet data. Returns {post, healthy} or {healthy:false}. */
  function extractTweet(article) {
    try {
      const id = statusIdFromArticle(article);
      if (!id) return { healthy: false };

      let author = "unknown";
      let handle = "";
      const nameNode = article.querySelector('[data-testid="User-Name"]');
      if (nameNode) {
        const nameLink = nameNode.querySelector("a");
        author = (nameLink?.firstElementChild?.textContent || nameNode.textContent || "unknown")
          .trim()
          .replace(/\s+/g, " ");
        const spanMatch = nameNode.textContent.match(/@([\w_.]+)/);
        if (spanMatch) handle = `@${spanMatch[1]}`;
      }

      const title = (article.querySelector('[data-testid="tweetText"]')?.textContent || "").trim();
      if (!title) return { healthy: false };

      const tags = [];
      if (handle) tags.push(handle.replace(/^@/, "").toLowerCase());
      for (const [re, tag] of kwTags) if (re.test(title)) tags.push(tag);

      return {
        post: { id: `x-${id}`, platform: "x", author, handle, title, body: title, tags, type: "post" },
        healthy: author !== "unknown" && title.length > 0,
      };
    } catch {
      return { healthy: false };
    }
  }

  /**
   * Collect all top-level tweets in the given root.
   * Skips nested quote embeds and already-scanned, unchanged tweets.
   * @returns {{records:Array<{el:Element,post:Object}>, observed:number, healthy:number}}
   */
  function collect(root) {
    const articles = [...root.querySelectorAll('article[data-testid="tweet"]')];
    const records = [];
    let healthy = 0;
    for (const el of articles) {
      if (isNestedQuote(el)) continue;

      const id = statusIdFromArticle(el);
      if (!id) continue;

      // Recycle guard: same node, same tweet, already handled → skip.
      if (el.dataset.orionSeen === id) continue;
      el.dataset.orionSeen = id;

      const { post, healthy: ok } = extractTweet(el);
      if (!ok || !post) continue;
      if (ok) healthy++;
      records.push({ el, post });
    }
    return { records, observed: articles.length, healthy };
  }

  /** Best-effort notifications surface: rows that embed a tweet preview. */
  function collectNotifications(root) {
    const rows = [...root.querySelectorAll('[data-testid="cellInnerDiv"]')];
    const records = [];
    let healthy = 0;
    for (const row of rows) {
      if (row.closest('article[data-testid="tweet"]')) continue; // handled elsewhere
      const textNode = row.querySelector('[data-testid="tweetText"]');
      if (!textNode) continue;
      const body = (textNode.textContent || "").trim();
      if (!body) continue;

      const nameNode = row.querySelector('[data-testid="User-Name"]');
      const handleMatch = nameNode?.textContent?.match(/@([\w_.]+)/);
      const handle = handleMatch ? `@${handleMatch[1]}` : "";

      const link = row.querySelector('a[href*="/status/"]');
      const status = link ? (link.getAttribute("href").split("/status/")[1] || "").split(/[?#]/)[0] : "";
      const id = status ? `x-${status}` : `n-${hash(`${handle}|${body}`)}`;

      if (row.dataset.orionSeen === id) continue;
      row.dataset.orionSeen = id;

      const tags = [];
      if (handle) tags.push(handle.replace(/^@/, "").toLowerCase());
      for (const [re, tag] of kwTags) if (re.test(body)) tags.push(tag);

      records.push({
        el: row,
        post: {
          id,
          platform: "x",
          author: nameNode?.querySelector("a span span")?.textContent?.trim() || "unknown",
          handle,
          title: body,
          body,
          tags,
          type: "post",
        },
      });
      healthy++;
    }
    return { records, observed: rows.length, healthy };
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  // Shared namespace: helpers for tests + collectors for content.js.
  globalThis.__orion = Object.assign(globalThis.__orion || {}, {
    statusIdFromArticle,
    isNestedQuote,
    extractTweet,
    collect,
    collectNotifications,
  });
  const NS = (globalThis.__orionAdapters = globalThis.__orionAdapters || []);
  NS.push({ name: "x-notifications", isActive: IS_X, collect: collectNotifications });
  NS.push({ name: "x-feed", isActive: IS_X, collect });

  if (IS_X) document.documentElement.setAttribute("data-orion-site", "x");
})();