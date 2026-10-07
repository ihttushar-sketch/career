'use client';
import { useState } from 'react';

export default function CopyBlock({ text, label = 'copy', children }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text || '');
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* clipboard blocked — selection fallback */
      const sel = window.getSelection();
      const range = document.createRange();
      const node = document.getElementById('copy-target');
      if (node && sel) {
        range.selectNodeContents(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }
  return (
    <div className="pre">
      <div id="copy-target">{children}</div>
      <button className="btn" onClick={copy}>
        {done ? 'copied' : label}
      </button>
    </div>
  );
}
