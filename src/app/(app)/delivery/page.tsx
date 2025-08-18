
"use client";

import { useState, useRef, useEffect } from 'react';
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
import { Camera, PlusCircle, Loader2, FilePenLine, Trash2, Check, X } from 'lucide-react';
import { DeliveryEntry, ProductionEntry } from '@/types';
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<DeliveryEntry | null>(null);


  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: { partyName: '', lotNumber: '', takaNumber: '', machineNumber: '', meter: '' },
  });

  const { setValue, trigger, watch, getValues, reset } = form;
  const partyName = watch('partyName');
  const lotNumber = watch('lotNumber');
  const isScanDisabled = !partyName || !lotNumber || isScanning;

  const addDeliveryEntry = (data: DeliveryFormData, tpNumber?: number) => {
    const newDeliveryEntry: DeliveryEntry = {
      id: new Date().toISOString() + Math.random(), // Ensure unique ID
      partyName: data.partyName,
      lotNumber: data.lotNumber,
      deliveryDate: new Date().toLocaleDateString('en-GB'), // dd/mm/yyyy
      takaNumber: data.takaNumber,
      meter: data.meter,
      machineNumber: data.machineNumber,
      tpNumber: tpNumber
    };

    dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: newDeliveryEntry });
    toast({ title: 'Success', description: `Taka ${data.takaNumber} marked as delivered.` });
    reset({ partyName: data.partyName, lotNumber: data.lotNumber, takaNumber: '', machineNumber: '', meter: '' });
  };

  const validateDeliveryData = (entry: { takaNumber: string, machineNumber: string, meter: string }): { valid: boolean, error?: string } => {
    const productionEntry = productionEntries.find(p => p.takaNumber === entry.takaNumber);

    if (!productionEntry) {
      return { valid: false, error: `Taka Number ${entry.takaNumber} not found` };
    }
    if (productionEntry.machineNumber !== entry.machineNumber) {
        return { valid: false, error: `For Taka ${entry.takaNumber}, Machine Number does not match` };
    }
    if (productionEntry.meter !== entry.meter) {
        return { valid: false, error: `For Taka ${entry.takaNumber}, Meter does not match` };
    }
    const isDelivered = deliveryEntries.some(d => d.takaNumber === entry.takaNumber);
    if (isDelivered) {
      return { valid: false, error: `Taka Number ${entry.takaNumber} has already been delivered.` };
    }
    return { valid: true };
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
  
        if (result && result.entries.length > 0) {
          let allEntriesValid = true;
          for (const entry of result.entries) {
            const { valid, error } = validateDeliveryData(entry);
            if (!valid) {
              toast({ variant: 'destructive', title: 'Validation Error', description: error });
              allEntriesValid = false;
              break; 
            }
          }
  
          if (allEntriesValid) {
            const currentPartyName = getValues('partyName');
            const currentLotNumber = getValues('lotNumber');
            let tpNumber: number | undefined = undefined;

            if (result.entries.length > 1) {
              const maxTp = deliveryEntries.reduce((max, entry) => Math.max(max, entry.tpNumber || 0), 0);
              tpNumber = maxTp + 1;
            }

            result.entries.forEach(entry => {
              addDeliveryEntry({
                partyName: currentPartyName,
                lotNumber: currentLotNumber,
                takaNumber: entry.takaNumber,
                machineNumber: entry.machineNumber,
                meter: entry.meter,
              }, tpNumber);
            });
            toast({ title: 'Scan Successful', description: `${result.entries.length} entries extracted and added.` });
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
    const { valid, error } = validateDeliveryData(data);
    if (!valid) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error });
      return;
    }
    addDeliveryEntry(data);
  };

  const handleEditClick = (entry: DeliveryEntry) => {
    setEditingId(entry.id);
    setEditedEntry(JSON.parse(JSON.stringify(entry)));
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditedEntry(null);
  };

  const handleSaveClick = () => {
    if (editedEntry) {
      dispatch({ type: 'UPDATE_DELIVERY_ENTRY', payload: editedEntry });
      handleCancelClick();
    }
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: id });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedEntry) {
      setEditedEntry({ ...editedEntry, [e.target.name]: e.target.value });
    }
  };

  const renderCellContent = (entry: DeliveryEntry, field: keyof DeliveryEntry) => {
    if (editingId === entry.id && editedEntry) {
      // Don't render input for 'tpNumber'
      if (field === 'tpNumber' || field === 'id' || field === 'takaNumber') {
         // Special handling for tpNumber display
         if (field === 'takaNumber' && entry.tpNumber) {
          return <>{entry.takaNumber} <span className="text-red-500 font-bold">TP {entry.tpNumber}</span></>;
        }
        return entry[field as keyof typeof entry]?.toString() || '';
      }
      return (
        <Input
          name={field}
          value={editedEntry[field as keyof typeof editedEntry]?.toString() || ''}
          onChange={handleInputChange}
          className="h-5 p-1 text-[10px] font-bold"
        />
      );
    }
    if (field === 'takaNumber' && entry.tpNumber) {
        return <>{entry.takaNumber} <span className="text-red-500 font-bold">TP {entry.tpNumber}</span></>;
    }
    return entry[field as keyof typeof entry]?.toString() || '';
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
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isScanDisabled}>
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isScanDisabled}
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
                <TableHead className="p-1 text-[12px] font-bold h-8">Date</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Taka</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">M/C</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Meter</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Party</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8">Lot</TableHead>
                <TableHead className="p-1 text-[12px] font-bold h-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...deliveryEntries].reverse().map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="p-1 text-[11px] font-bold truncate max-w-[60px]">{renderCellContent(entry, 'deliveryDate')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'takaNumber')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'machineNumber')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'meter')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold truncate max-w-[80px]">{renderCellContent(entry, 'partyName')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'lotNumber')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold text-right">
                    {editingId === entry.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600" onClick={handleSaveClick}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={handleCancelClick}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEditClick(entry)}>
                          <FilePenLine className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteClick(entry.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </TableCell>
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
