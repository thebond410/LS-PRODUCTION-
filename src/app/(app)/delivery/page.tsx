
"use client";

import { useState, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppContext } from "@/context/AppContext";
import { useToast } from '@/hooks/use-toast';
import { Camera, PlusCircle, Loader2 } from 'lucide-react';
import { DeliveryEntry } from '@/types';
import { extractDeliveryData } from '@/ai/flows/extract-delivery-data-from-image';

const deliverySchema = z.object({
  partyName: z.string().min(2, "Party name is required"),
  lotNumber: z.string().min(1, "Lot number is required"),
  takaNumber: z.string().min(1, "Taka number is required"),
  machineNumber: z.string().min(1, "Machine number is required"),
  meter: z.string().min(1, "Meter is required"),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

export default function DeliveryPage() {
  const { state, dispatch } = useAppContext();
  const { productionEntries, deliveryEntries } = state;
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: { partyName: '', lotNumber: '', takaNumber: '', machineNumber: '', meter: '' },
  });

  const { setValue, trigger } = form;

  const validateDeliveryData = (data: { takaNumber: string, machineNumber: string, meter: string, date?: string }) => {
    const productionEntry = productionEntries.find(p => p.takaNumber === data.takaNumber);

    if (!productionEntry) {
      toast({ variant: 'destructive', title: 'Validation Error', description: `Taka Number not found` });
      return false;
    }

    if (productionEntry.machineNumber !== data.machineNumber) {
      toast({ variant: 'destructive', title: 'Validation Error', description: `Machine number not match` });
      return false;
    }
    
    if (productionEntry.meter !== data.meter) {
      toast({ variant: 'destructive', title: 'Validation Error', description: `Meter not match` });
      return false;
    }

    const isDelivered = deliveryEntries.some(d => d.takaNumber === data.takaNumber);
    if (isDelivered) {
      toast({ variant: 'destructive', title: 'Error', description: `Taka number ${data.takaNumber} has already been delivered.` });
      return false;
    }
    return true;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const result = await extractDeliveryData({ photoDataUri: base64Data });

        if (result) {
          setValue('takaNumber', result.takaNumber);
          setValue('machineNumber', result.machineNumber);
          setValue('meter', result.meter);
          
          const isValid = validateDeliveryData(result);
          if (isValid) {
            toast({ title: 'Scan Successful', description: 'Data extracted and validated.' });
          }
          
        } else {
          toast({
            variant: "destructive",
            title: "Extraction Failed",
            description: "No data could be extracted. Please try a clearer image.",
          });
        }
      } catch (error) {
        console.error("Extraction error:", error);
        toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: "Something went wrong during data extraction.",
        });
      } finally {
        setIsScanning(false);
        // Reset the file input
        if(fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setIsScanning(false);
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "Could not read the selected file.",
      });
    };
  };

  const onSubmit: SubmitHandler<DeliveryFormData> = (data) => {
    if (!validateDeliveryData(data)) {
      return;
    }

    const newDeliveryEntry: DeliveryEntry = {
      id: new Date().toISOString(),
      partyName: data.partyName,
      lotNumber: data.lotNumber,
      deliveryDate: new Date().toLocaleDateString('en-GB'), // dd/mm/yyyy
      takaNumber: data.takaNumber,
      meter: data.meter,
      machineNumber: data.machineNumber
    };

    dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: newDeliveryEntry });
    toast({ title: 'Success', description: `Taka ${data.takaNumber} marked as delivered.` });
    form.reset({ ...form.getValues(), takaNumber: '', machineNumber: '', meter: '' });
  };

  return (
    <div className="space-y-2">
      <header className="px-2 pt-2">
        <h1 className="text-xl font-bold text-gray-800">Delivery</h1>
        <p className="text-muted-foreground text-sm">Record new deliveries.</p>
      </header>

      <Card className="mx-2">
        <CardContent className="p-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <FormField control={form.control} name="partyName" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Party Name" {...field} className="h-8" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lotNumber" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Lot No." {...field} className="h-8"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isScanning}>
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isScanning}
                  />
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <FormField control={form.control} name="takaNumber" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Taka No." {...field} className="h-8"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="machineNumber" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="M/C No." {...field} className="h-8"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="meter" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Meter" {...field} className="h-8"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <Button type="submit" className="h-8">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mx-2">
        <CardHeader className="p-2">
          <CardTitle className="text-base font-bold">Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {deliveryEntries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-1 text-[12px] font-bold h-8">Taka</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Party</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Meter</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...deliveryEntries].reverse().slice(0, 10).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="p-1 text-[11px] font-bold">{entry.takaNumber}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold truncate max-w-[80px]">{entry.partyName}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{entry.meter}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{entry.deliveryDate}</TableCell>
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
