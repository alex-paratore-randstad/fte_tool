'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { getFteForecastAction } from '@/app/actions';
import type { GenerateFTEForecastOutput } from '@/ai/flows/generate-fte-forecast';
import { Loader2 } from 'lucide-react';
import { accounts } from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { useToast } from '@/hooks/use-toast';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

const forecastFormSchema = z.object({
  accountName: z.string({ required_error: 'Please select an account.' }),
  priorFTEData: z
    .array(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format.'),
        fte: z.coerce
          .number({ invalid_type_error: 'FTE must be a number' })
          .positive('FTE must be positive'),
      })
    )
    .length(4, 'You must provide exactly 4 months of data.'),
});

type ForecastFormValues = z.infer<typeof forecastFormSchema>;

const defaultMonths = () => {
  const months = [];
  const d = new Date();
  d.setMonth(d.getMonth() - 4);
  for (let i = 0; i < 4; i++) {
    d.setMonth(d.getMonth() + 1);
    months.push({
      month: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      fte: 100 + i * 5,
    });
  }
  return months;
};

export default function ForecastingClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [forecast, setForecast] = useState<GenerateFTEForecastOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<ForecastFormValues>({
    resolver: zodResolver(forecastFormSchema),
    defaultValues: {
      accountName: '',
      priorFTEData: defaultMonths(),
    },
  });

  const { fields } = useFieldArray({
    name: 'priorFTEData',
    control: form.control,
  });

  async function onSubmit(data: ForecastFormValues) {
    setIsLoading(true);
    setForecast(null);
    const result = await getFteForecastAction(data);
    if (result.success && result.data) {
      setForecast(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error Generating Forecast',
        description: result.error || 'An unknown error occurred.',
      });
    }
    setIsLoading(false);
  }

  const chartData = forecast?.forecast.map(item => ({
      month: new Date(item.month + '-02').toLocaleString('default', { month: 'short' }),
      fte: item.fte,
  }));

  const chartConfig = {
      fte: {
          label: 'Forecasted FTE',
          color: 'hsl(var(--chart-1))',
      },
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Forecast Parameters</CardTitle>
              <CardDescription>
                Provide historical data to generate the forecast.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.name}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Prior 4 Months FTE Data</FormLabel>
                <div className="grid gap-4 mt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`priorFTEData.${index}.month`}
                        render={({ field }) => (
                          <FormItem>
                            <Input {...field} placeholder="YYYY-MM" />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`priorFTEData.${index}.fte`}
                        render={({ field }) => (
                          <FormItem>
                            <Input type="number" {...field} placeholder="FTE" />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Forecast
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <div className="lg:col-span-2">
      {isLoading && (
        <Card className="flex h-full min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating forecast, please wait...</p>
            </div>
        </Card>
      )}

      {forecast && (
        <Card>
            <CardHeader>
                <CardTitle>12-Month Forecast for {form.getValues('accountName')}</CardTitle>
                <CardDescription>The following is the AI-generated forecast based on the data provided.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="h-[250px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} content={<ChartTooltipContent />} />
                            <Legend content={<ChartLegendContent />} />
                            <Bar dataKey="fte" fill="var(--color-fte)" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Month</TableHead>
                    <TableHead className="text-right">Forecasted FTE</TableHead>
                    <TableHead>Rationale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.forecast.map((item) => (
                    <TableRow key={item.month}>
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-right font-mono">{item.fte.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.rationale}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
             <CardFooter className="justify-end gap-2">
                <Button variant="outline">Request Changes</Button>
                <Button>Approve Forecast</Button>
            </CardFooter>
        </Card>
      )}

      {!isLoading && !forecast && (
        <Card className="flex h-full min-h-[500px] items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Forecast Generated</h3>
            <p className="text-muted-foreground">
              Enter historical data and click "Generate Forecast" to see results.
            </p>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}
