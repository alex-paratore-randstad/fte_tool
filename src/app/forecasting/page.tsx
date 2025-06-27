import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForecastingPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Forecasting"
        description="Generate a 12-month FTE forecast for an account using historical data."
      />
      <Card>
        <CardHeader>
            <CardTitle>Feature Temporarily Disabled</CardTitle>
            <CardDescription>
                The AI forecasting feature is currently unavailable while we resolve a technical issue.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>We are working to bring this feature back online as soon as possible. Please check back later.</p>
        </CardContent>
      </Card>
    </div>
  );
}
