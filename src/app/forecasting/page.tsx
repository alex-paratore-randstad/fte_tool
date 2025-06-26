import { PageHeader } from '@/components/page-header';
import ForecastingClient from '@/components/forecasting-client';

export default function ForecastingPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Forecasting"
        description="Generate a 12-month FTE forecast for an account using historical data."
      />
      <ForecastingClient />
    </div>
  );
}
