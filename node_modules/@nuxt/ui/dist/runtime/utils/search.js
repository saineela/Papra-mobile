const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}
function truncateHTMLFromStart(html, maxLength) {
  let truncated = "";
  let totalLength = 0;
  let insideTag = false;
  const chars = Array.from(html);
  for (let i = chars.length - 1; i >= 0; i--) {
    const char = chars[i];
    if (char === ">") {
      insideTag = true;
    } else if (char === "<") {
      insideTag = false;
      truncated = char + truncated;
      continue;
    }
    if (!insideTag) {
      totalLength++;
    }
    if (totalLength <= maxLength) {
      truncated = char + truncated;
    } else {
      truncated = "..." + truncated;
      break;
    }
  }
  return truncated;
}
export function sanitizeSnippet(snippet) {
  const tagOpen = "\0markO\0";
  const tagClose = "\0markC\0";
  return escapeHTML(
    snippet.replaceAll("<mark>", tagOpen).replaceAll("</mark>", tagClose)
  ).replaceAll(tagOpen, "<mark>").replaceAll(tagClose, "</mark>");
}
export function highlight(item, searchTerm, forceKey, omitKeys, useTokenSearch) {
  const tokens = useTokenSearch ? searchTerm.match(/[\p{L}\p{M}\p{N}_]+/gu) || [] : [];
  const minTokenLength = tokens.length > 0 ? Math.min(...tokens.map((t) => t.length)) : searchTerm.length;
  function generateHighlightedText(value, indices = []) {
    value = value || "";
    let content = "";
    let nextUnhighlightedRegionStartingIndex = 0;
    indices.forEach((region) => {
      if (region.length === 2 && region[0] === region[1]) {
        return;
      }
      const lastIndiceNextIndex = region[1] + 1;
      const isMatched = lastIndiceNextIndex - region[0] >= minTokenLength;
      content += [
        escapeHTML(value.substring(nextUnhighlightedRegionStartingIndex, region[0])),
        isMatched && `<mark>`,
        escapeHTML(value.substring(region[0], lastIndiceNextIndex)),
        isMatched && "</mark>"
      ].filter(Boolean).join("");
      nextUnhighlightedRegionStartingIndex = lastIndiceNextIndex;
    });
    content += escapeHTML(value.substring(nextUnhighlightedRegionStartingIndex));
    const markIndex = content.indexOf("<mark>");
    if (markIndex !== -1) {
      content = truncateHTMLFromStart(content, Array.from(content.slice(markIndex)).length);
    }
    return content;
  }
  if (!item.matches?.length) {
    return;
  }
  for (const match of item.matches) {
    if (forceKey && match.key !== forceKey) {
      continue;
    }
    if (omitKeys?.includes(match.key)) {
      continue;
    }
    return generateHighlightedText(match.value, match.indices);
  }
}
