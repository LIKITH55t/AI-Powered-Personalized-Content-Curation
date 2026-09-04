(() => {
  // ORION X (Twitter) adapter.
  // Finds real tweets in the live X DOM and marks them with data-orion-post
  // attributes so the shared content.js scorer can process them unchanged.
  const IS_X =
    /(^|\.)(x|twitter)\.com$/.test(location.hostname) || location.hostname === "x.com";

  function extractTweet(article) {
    const nameNode = article.querySelector('[data-testid="User-Name"]');
    const author = nameNode?.querySelector("a")?.firstElementChild?.textContent?.trim() || "unknown";

    const handleMatch = article
      .querySelector('[data-testid="User-Name"] span')
      ?.textContent?.trim()
      ?.match(/^@([\w_]+)/);
    const handle = handleMatch ? `@${handleMatch[1]}` : "";

    const statusLink = article.querySelector('a[href*="/status/"]');
    let id = "";
    if (statusLink) {
      const m = statusLink.getAttribute("href").split("/status/")[1]?.split(/[?#]/)[0];
      if (m) id = `x-${m}`;
    }
    if (!id) id = article.id || `x-${crypto.randomUUID()}`;

    const title = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || "";
    const body = title; // tweets are single text blocks

    // A few lightweight topical tags from the handle + text.
    const tags = [];
    if (handle) tags.push(handle.replace(/^@/, ""));
    const words = title.toLowerCase();
    if (/\bdsa|leetcode|interview|sde|internship|placement|resume|system design\b/.test(words))
      tags.push("placements");
    if (/\bupsc|jee|neet|gate|exam|pyq|current affairs\b/.test(words)) tags.push("exams");
    if (/\bpython|react|js|course|tutorial|programming|learn\b/.test(words)) tags.push("skills");
    if (/\b(?:giveaway|retweet to win|airdrop)\b/.test(words)) tags.push("spam");
    if (/\bmeme|\bfunny|\blol|\b😂|\b💀\b/.test(words)) tags.push("meme");

    return { id, platform: "x", author, handle, title, body, tags, type: "post" };
  }

  function mark(article) {
    if (article.dataset.orionPost === "1") return;
    const t = extractTweet(article);
    article.dataset.orionPost = "1";
    article.dataset.orionId = t.id;
    article.dataset.orionPlatform = t.platform;
    article.dataset.orionAuthor = t.author;
    article.dataset.orionHandle = t.handle;
    article.dataset.orionTitle = t.title;
    article.dataset.orionTags = t.tags.join(",");
  }

  function scan() {
    document
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach(mark);
  }

  if (IS_X) {
    // Let content.js know this is a live social site, not the demo corpus.
    document.documentElement.setAttribute("data-orion-site", "x");

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();
