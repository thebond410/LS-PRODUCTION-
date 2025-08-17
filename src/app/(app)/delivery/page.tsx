"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppContext } from "@/context/AppContext";
import { useToast } from '@/hooks/use-toast';
import { Camera, PlusCircle } from 'lucide-react';
import { DeliveryEntry } from '@/types';

const deliverySchema = z.object({
  partyName: z.string().min(2, "Party name is required"),
  lotNumber: z.string().min(1, "Lot number is required"),
  takaNumber: z.string().min(1, "Taka number is required"),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

export default function DeliveryPage() {
  const { state, dispatch } = useAppContext();
  const { productionEntries, deliveryEntries } = state;
  const { toast } = useToast();
  
  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: { partyName: '', lotNumber: '', takaNumber: '' },
  });

  const onSubmit: SubmitHandler<DeliveryFormData> = (data) => {
    // Check if taka exists in production
    const takaExists = productionEntries.some(p => p.takaNumber === data.takaNumber);
    if (!takaExists) {
      toast({ variant: 'destructive', title: 'Error', description: `Taka number ${data.takaNumber} not found in production.` });
      return;
    }

    // Check if taka is already delivered
    const isDelivered = deliveryEntries.some(d => d.takaNumber === data.takaNumber);
    if (isDelivered) {
      toast({ variant: 'destructive', title: 'Error', description: `Taka number ${data.takaNumber} has already been delivered.` });
      return;
    }

    const newDeliveryEntry: DeliveryEntry = {
      id: new Date().toISOString(),
      ...data,
      deliveryDate: new Date().toLocaleDateString('en-GB'), // dd/mm/yyyy
    };

    dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: newDeliveryEntry });
    toast({ title: 'Success', description: `Taka ${data.takaNumber} marked as delivered.` });
    form.reset({ ...form.getValues(), takaNumber: '' }); // Reset only taka number
  };

  return (
    <div className="space-y-4">
      <header className="p-4 pb-0">
        <h1 className="text-2xl font-bold text-gray-800">Delivery</h1>
        <p className="text-muted-foreground">Record new deliveries.</p>
      </header>

      <Card className="mx-4">
        <CardHeader>
          <CardTitle>New Delivery Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="partyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Name</FormLabel>
                    <FormControl><Input placeholder="Enter party name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lotNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot No.</FormLabel>
                    <FormControl><Input placeholder="Enter lot number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="takaNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taka Number</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="Scan or enter taka no." {...field} />
                      <Button type="button" variant="outline" size="icon"><Camera className="h-4 w-4" /></Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Delivery
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mx-4">
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveryEntries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taka</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...deliveryEntries].reverse().slice(0, 10).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.takaNumber}</TableCell>
                  <TableCell>{entry.partyName}</TableCell>
                  <TableCell>{entry.deliveryDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No deliveries recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
