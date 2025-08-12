
'use client';

import { PageHeader } from '@/components/page-header';
import { TeamContent } from '@/components/team/team-content';


export default function TeamPage() {
  
  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Team Management"
          description="View and manage your team."
        />
        <TeamContent />
      </div>
    </>
  );
}
