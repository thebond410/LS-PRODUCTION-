
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
import { useAppContext, toSnakeCase } from "@/context/AppContext";
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
  taka_number TEXT PRIMARY KEY NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_taka_number
      FOREIGN KEY(taka_number) 
	  REFERENCES production_entries(taka_number)
	  ON DELETE CASCADE
);`;

export default function SettingsPage() {
  const { state, dispatch } = useAppContext();
  const { toast } = useToast();
  const { settings, supabase } = state;

  const form = useForm<SettingsType>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });
  
  useEffect(() => {
    form.reset(settings);
  }, [settings, form.reset]);
  
  const productionTables = form.watch('productionTables');

  const onSubmit: SubmitHandler<SettingsType> = async (data) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: data });

    if(supabase) {
        const { supabaseUrl, supabaseKey, ...settingsToStore } = data;
        const { error } = await supabase
            .from('app_settings')
            .upsert({ id: 1, settings: settingsToStore }, { onConflict: 'id' });

        if (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } else {
            toast({ title: 'Success', description: 'Settings have been saved.' });
        }
    } else {
         toast({ title: 'Saved Locally', description: 'Settings saved locally. Connect to internet to sync.' });
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your application.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <FormField control={form.control} name="maxMachineNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Machines</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 12" {...field} /></FormControl>
                   <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="productionTables"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Number of Production Lists</FormLabel>
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
                            <FormLabel className="font-normal">{num}</FormLabel>
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
                  <FormLabel>List {i+1} Taka Range</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name={`listTakaRanges.list${i+1}.start`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Start No." {...field} /></FormControl>
                      </FormItem>
                    )} />
                     <FormField control={form.control} name={`listTakaRanges.list${i+1}.end`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="End No." {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="scanApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scan API Key</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter your API key" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="supabaseUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supabase URL</FormLabel>
                  <FormControl><Input placeholder="https://....supabase.co" {...field} readOnly /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supabaseKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supabase Anon Key</FormLabel>
                  <FormControl><Input type="password" placeholder="ey..." {...field} readOnly /></FormControl>
                   <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle>Database Schema</CardTitle>
               <CardDescription>Run this SQL in your Supabase editor to set up tables.</CardDescription>
            </CardHeader>
            <CardContent>
               <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>View SQL Schema</AccordionTrigger>
                  <AccordionContent>
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                      <code>{sqlScript}</code>
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          
          <Button type="submit" className="w-full">Save Settings</Button>
        </form>
      </Form>
    </div>
  );
}
