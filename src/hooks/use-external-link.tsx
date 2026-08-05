'use client';

import { useCallback } from 'react';
import { ExternalLinkToastBody } from '@/components/external-link-toast';
import { useToast } from '@/hooks/use-toast';
import { openExternalLink } from '@/lib/external-link';

/**
 * Opens external links, with a visible fallback for the case Domo currently
 * hits: its host frame accepts our navigate message and then refuses the
 * destination because the domain is not on its allowlist. That refusal is
 * invisible to us, so without this the click appears to do nothing at all.
 *
 * The navigate attempt still runs first, so the moment Domo allowlists the
 * domain this starts opening a tab on its own with no code change.
 */
export function useExternalLink() {
  const { toast } = useToast();

  return useCallback(
    (url: string) => {
      openExternalLink(url, () => {
        toast({
          title: "Couldn't open that link from inside Domo",
          description: <ExternalLinkToastBody url={url} />,
          // Radix auto-dismisses after 5s by default, which is not enough time
          // to read and copy a long URL. Keep it up until the user closes it
          // with the toast's X. (TOAST_REMOVE_DELAY in use-toast only governs
          // cleanup *after* dismissal, so it does not help here. A finite value
          // is deliberate: setTimeout coerces Infinity to 0, which would make
          // the toast vanish instantly.)
          duration: 10 * 60 * 1000,
        });
      });
    },
    [toast]
  );
}
