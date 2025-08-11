
'use client';

import { PageHeader } from '@/components/page-header';
import { FtePrototypeContent } from '@/components/fte_prototype/fte-prototype-content';

export default function FtePrototypePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Prototype Data"
        description="This page fetches live data from the fte_prototype AppDB collection."
      />
      <FtePrototypeContent />
    </div>
  );
}
