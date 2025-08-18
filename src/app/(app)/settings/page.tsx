
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
import { useEffect } from 'react';

const settingsSchema = z.object({
  scanApiKey: z.string().optional(),
  supabaseUrl: z.string().url().or(z.literal('')),
  supabaseKey: z.string().or(z.literal('')),
  productionTables: z.coerce.number().min(1).max(3),
  maxMachineNumber: z.coerce.number().min(1, "Must have at least 1 machine"),
  listTakaRanges: z.object({
    list1: z.object({ start: z.string(), end: z.string() }),
    list2: z.object({ start: z.string(), end: z.string() }),
    list3: z.object({ start: z.string(), end: z.string() }),
  }),
});

const sqlScript = `-- SQL Schema for LS Production Tracker

-- Table to store app settings (as a JSONB object)
CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1, -- Singleton row
  settings JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Table to store production entries
CREATE TABLE production_entries (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  taka_number TEXT NOT NULL UNIQUE,
  machine_number TEXT,
  meter TEXT,
  date TEXT, -- Storing as TEXT to match app logic
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store delivery entries
CREATE TABLE delivery_entries (
  id TEXT PRIMARY KEY, -- Using the app-generated string ID
  party_name TEXT NOT NULL,
  lot_number TEXT,
  delivery_date TEXT, -- Storing as TEXT to match app logic
  taka_number TEXT NOT NULL,
  meter TEXT,
  machine_number TEXT,
  tp_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
`;

export default function SettingsPage() {
  const { state, dispatch } = useAppContext();
  const { toast } = useToast();

  const form = useForm<SettingsType>({
    resolver: zodResolver(settingsSchema),
    // We use defaultValues to initialize the form with the state
    defaultValues: state.settings,
  });
  
  // Use useEffect to reset the form when the state changes.
  // This is important because the state might be initialized after the component mounts.
  useEffect(() => {
    form.reset(state.settings);
  }, [state.settings, form.reset]);
  
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
              <CardTitle className="text-base">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
               <FormField control={form.control} name="maxMachineNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Number of Machines</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 12" {...field} className="h-8"/></FormControl>
                   <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="productionTables"
                render={({ field }) => (
                  <FormItem className="space-y-2 pt-2">
                    <FormLabel className="text-sm">Number of Production Lists</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={String(field.value)}
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
              <CardTitle className="text-base">API Keys</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              <FormField control={form.control} name="scanApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Scan API Key</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter your API key" {...field} className="h-8"/></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="supabaseUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Supabase URL</FormLabel>
                  <FormControl><Input placeholder="https://....supabase.co" {...field} className="h-8" readOnly /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supabaseKey" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Supabase Anon Key</FormLabel>
                  <FormControl><Input type="password" placeholder="ey..." {...field} className="h-8" readOnly /></FormControl>
                   <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-base">Database Schema</CardTitle>
               <CardDescription className="text-xs">Run this SQL in your Supabase editor to set up tables.</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
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
