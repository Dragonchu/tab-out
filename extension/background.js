/**
 * background.js — Service Worker for Badge Updates
 *
 * Chrome's "always-on" background script for Tab Out.
 * Its only job: keep the toolbar badge showing the current open tab count.
 *
 * Since we no longer have a server, we query chrome.tabs directly.
 * The badge counts real web tabs (skipping chrome:// and extension pages).
 *
 * Color coding gives a quick at-a-glance health signal:
 *   Green  (#3d7a4a) → 1–10 tabs  (focused, manageable)
 *   Amber  (#b8892e) → 11–20 tabs (getting busy)
 *   Red    (#b35a5a) → 21+ tabs   (time to cull!)
 */

// ─── Badge updater ────────────────────────────────────────────────────────────

/**
 * updateBadge()
 *
 * Counts open real-web tabs and updates the extension's toolbar badge.
 * "Real" tabs = not chrome://, not extension pages, not about:blank.
 */
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});

    // Only count actual web pages — skip browser internals and extension pages
    const count = tabs.filter(t => {
      const url = t.url || '';
      return (
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('edge://') &&
        !url.startsWith('brave://')
      );
    }).length;

    // Don't show "0" — an empty badge is cleaner
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });

    if (count === 0) return;

    // Pick badge color based on workload level
    let color;
    if (count <= 10) {
      color = '#3d7a4a'; // Green — you're in control
    } else if (count <= 20) {
      color = '#b8892e'; // Amber — things are piling up
    } else {
      color = '#b35a5a'; // Red — time to focus and close some tabs
    }

    await chrome.action.setBadgeBackgroundColor({ color });

  } catch {
    // If something goes wrong, clear the badge rather than show stale data
    chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Update badge when the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

// Update badge when Chrome starts up
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Update badge whenever a tab is opened
chrome.tabs.onCreated.addListener(() => {
  updateBadge();
});

// Update badge whenever a tab is closed
chrome.tabs.onRemoved.addListener(() => {
  updateBadge();
});

// Update badge when a tab's URL changes (e.g. navigating to/from chrome://)
chrome.tabs.onUpdated.addListener(() => {
  updateBadge();
});

// ─── RSS Feed Fetching ───────────────────────────────────────────────────────

/**
 * fetchRSSFeed(feedUrl, limit)
 *
 * Fetches an RSS or Atom feed from the given URL, parses the XML,
 * and returns up to `limit` article entries.
 *
 * Each article: { id, title, link, pubDate }
 * id = link URL (guaranteed unique per feed)
 *
 * This runs in the service worker so it can bypass CORS via host_permissions.
 */
async function fetchRSSFeed(feedUrl, limit = 20) {
  const response = await fetch(feedUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  // Check for XML parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid RSS feed');

  const articles = [];

  // Try RSS 2.0 (<item> elements)
  const items = doc.querySelectorAll('item');
  if (items.length > 0) {
    for (const item of items) {
      if (articles.length >= limit) break;
      const title = item.querySelector('title')?.textContent?.trim() || 'Untitled';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
      const guid = item.querySelector('guid')?.textContent?.trim() || link;
      articles.push({ id: guid || link || title, title, link, pubDate });
    }
    return articles;
  }

  // Try Atom (<entry> elements)
  const entries = doc.querySelectorAll('entry');
  for (const entry of entries) {
    if (articles.length >= limit) break;
    const title = entry.querySelector('title')?.textContent?.trim() || 'Untitled';
    const linkEl = entry.querySelector('link[href]');
    const link = linkEl?.getAttribute('href') || '';
    const pubDate = entry.querySelector('published')?.textContent?.trim()
                 || entry.querySelector('updated')?.textContent?.trim() || '';
    const id = entry.querySelector('id')?.textContent?.trim() || link || title;
    articles.push({ id, title, link, pubDate });
  }

  if (articles.length === 0) throw new Error('No articles found — not a valid RSS/Atom feed');

  return articles;
}

/**
 * Message handler for RSS operations from the dashboard page.
 *
 * Messages:
 *   { type: 'fetch-rss', feedUrl, limit? }  → returns { articles: [...] }
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'fetch-rss') {
    const limit = message.limit || 20;
    fetchRSSFeed(message.feedUrl, limit)
      .then(articles => sendResponse({ articles }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }
});


// ─── Initial run ─────────────────────────────────────────────────────────────

// Run once immediately when the service worker first loads
updateBadge();
