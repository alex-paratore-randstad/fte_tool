'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/external-link';

/**
 * Body of the toast shown when a link cannot be opened from inside Domo.
 *
 * Everything lives in this one toast on purpose: `TOAST_LIMIT` is 1
 * (src/hooks/use-toast.ts), so raising a second toast to report a failed copy
 * would replace this one and take the URL away with it — exactly when the user
 * needs to read it.
 */
export function ExternalLinkToastBody({ url }: { url: string }) {
  const urlRef = useRef<HTMLParagraphElement>(null);
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');

  const handleCopy = useCallback(async () => {
    if (await copyToClipboard(url)) {
      setStatus('copied');
      return;
    }

    // Expected inside Domo: the async Clipboard API needs
    // allow="clipboard-write" on the iframe, which Domo does not set, and the
    // execCommand fallback needs a focused document. Select the text instead so
    // the user only has to press the copy shortcut.
    setStatus('manual');
    const node = urlRef.current;
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [url]);

  return (
    <div className="space-y-2">
      <p>Copy the address and paste it into a new browser tab.</p>
      <p
        ref={urlRef}
        className="select-all break-all rounded bg-muted/50 p-2 font-mono text-xs"
      >
        {url}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" className="h-7" onClick={handleCopy}>
          {status === 'copied' ? 'Copied' : 'Copy link'}
        </Button>
        {status === 'manual' && (
          <span className="text-xs">Selected — press Ctrl+C (⌘C on Mac)</span>
        )}
      </div>
    </div>
  );
}
