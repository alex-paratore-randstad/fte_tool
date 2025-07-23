
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Welcome to Randstad FTE Vision"
        description="Your central hub for managing and analyzing Full-Time Equivalent resources."
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            This application provides the tools you need to effectively track allocations, manage team data, and generate insightful reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p>
            Navigate through the application using the sidebar to access different modules. Here’s a quick overview of what you can do:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li><strong>Dashboard:</strong> Get a high-level overview of FTE allocation and key metrics.</li>
            <li><strong>Weekly Allocation:</strong> Enter and update FTE allocations for your team members.</li>
            <li><strong>Reporting:</strong> Analyze FTE data across various dimensions like cost center, leader, and region.</li>
            <li><strong>Team Management:</strong> View and manage your team roster.</li>
          </ul>
          <div className="mt-4">
            <Button asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
