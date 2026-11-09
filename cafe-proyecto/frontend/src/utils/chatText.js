export function formatChatText(text) {
  return text.replace(/\r\n?/g, '\n').split('\n').map((line) => {
    const normalized = line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*[-*+]\s+/, '• ');
    const parts = [];
    const bold = /\*\*(.+?)\*\*|__(.+?)__|\*([^*\n]+)\*/g;
    let start = 0;
    let match;
    while ((match = bold.exec(normalized))) {
      if (match.index > start) parts.push({ text: normalized.slice(start, match.index), bold: false });
      parts.push({ text: match[1] || match[2] || match[3], bold: true });
      start = bold.lastIndex;
    }
    if (start < normalized.length) parts.push({ text: normalized.slice(start), bold: false });
    return parts;
  });
}
