"use client";

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppContext } from "@/context/AppContext";
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsType } from '@/types';

const settingsSchema = z.object({
  scanApiKey: z.string().optional(),
  supabaseUrl: z.string().url().or(z.literal('')),
  supabaseKey: z.string().or(z.literal('')),
  productionTables: z.coerce.number().min(1).max(3),
  listTakaRanges: z.object({
    list1: z.object({ start: z.string(), end: z.string() }),
    list2: z.object({ start: z.string(), end: z.string() }),
    list3: z.object({ start: z.string(), end: z.string() }),
  }),
});

const sqlScript = `-- SQL Schema for LS Production Tracker

-- Table to store production entries
CREATE TABLE production_entries (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  taka_number TEXT NOT NULL UNIQUE,
  machine_number TEXT,
  meter TEXT,
  production_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store delivery entries
CREATE TABLE delivery_entries (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  party_name TEXT NOT NULL,
  lot_number TEXT,
  taka_number TEXT NOT NULL,
  delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key to link with production_entries
  CONSTRAINT fk_taka_number
    FOREIGN KEY(taka_number) 
    REFERENCES production_entries(taka_number)
);
`;

export default function SettingsPage() {
  const { state, dispatch } = useAppContext();
  const { toast } = useToast();

  const form = useForm<SettingsType>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ...state.settings,
      scanApiKey: state.settings.scanApiKey || '',
    },
  });
  
  const productionTables = form.watch('productionTables');

  const onSubmit: SubmitHandler<SettingsType> = (data) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: data });
    toast({ title: 'Success', description: 'Settings have been saved.' });
  };

  return (
    <div className="space-y-2">
      <header className="px-2 pt-2">
        <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your application.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 px-2">
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-base">Production List</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              <FormField
                control={form.control}
                name="productionTables"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">Number of Tables</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={String(field.value)}
                        className="flex space-x-4"
                      >
                        {[1, 2, 3].map(num => (
                          <FormItem key={num} className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={String(num)} />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">{num}</FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {Array.from({ length: productionTables }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <FormLabel className="text-sm">List {i+1} Taka Range</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name={`listTakaRanges.list${i+1}.start`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Start No." {...field} className="h-8"/></FormControl>
                      </FormItem>
                    )} />
                     <FormField control={form.control} name={`listTakaRanges.list${i+1}.end`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="End No." {...field} className="h-8"/></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="p-2">
              <CardTitle className="text-base">Scan API</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              <FormField control={form.control} name="scanApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Scan API Key</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter your API key" {...field} className="h-8"/></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-base">Supabase API</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              <FormField control={form.control} name="supabaseUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Supabase URL</FormLabel>
                  <FormControl><Input placeholder="https://....supabase.co" {...field} className="h-8" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supabaseKey" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Supabase Anon Key</FormLabel>
                  <FormControl><Input type="password" placeholder="ey..." {...field} className="h-8" /></FormControl>
                   <FormMessage />
                </FormItem>
              )} />
               <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-sm py-2">View SQL Schema</AccordionTrigger>
                  <AccordionContent>
                    <pre className="bg-muted p-2 rounded-md text-[10px] overflow-x-auto">
                      <code>{sqlScript}</code>
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          
          <Button type="submit" className="w-full h-9">Save Settings</Button>
        </form>
      </Form>
    </div>
  );
}
