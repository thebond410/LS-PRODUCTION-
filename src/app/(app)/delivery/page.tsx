
"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppContext, toSnakeCase } from "@/context/AppContext";
import { useToast } from '@/hooks/use-toast';
import { Camera, PlusCircle, Loader2, FilePenLine, Trash2, Check, X, Upload, CircleDotDashed } from 'lucide-react';
import { DeliveryEntry, ProductionEntry } from '@/types';
import { extractDeliveryData, ExtractDeliveryDataOutput } from '@/ai/flows/extract-delivery-data-from-image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const deliverySchema = z.object({
  partyName: z.string().min(2, "Party name is required"),
  lotNumber: z.string().min(1, "Lot number is required"),
  takaNumber: z.string().min(1, "Taka number is required"),
  meter: z.string().min(1, "Meter is required"),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString.split('/').reverse().join('-'));
    if (isNaN(date.getTime())) return dateString;
    return `${date.getDate()}/${date.getMonth() + 1}`;
};

const filterEntriesByRange = (entries: ProductionEntry[], start?: string, end?: string) => {
  if (!start || !end) return entries;
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  if (isNaN(startNum) || isNaN(endNum)) return entries;

  return entries.filter(entry => {
    const takaNum = parseInt(entry.takaNumber, 10);
    return !isNaN(takaNum) && takaNum >= startNum && takaNum <= endNum;
  });
};


export default function DeliveryPage() {
  const { state, dispatch } = useAppContext();
  const { settings, productionEntries, deliveryEntries, supabase } = state;
  const { listTakaRanges } = settings;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<DeliveryEntry | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  
  const [selectedList, setSelectedList] = useState<string>("all");

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: { partyName: '', lotNumber: '', takaNumber: '', meter: '' },
  });

  const { watch, getValues, reset } = form;
  const partyName = watch('partyName');
  const lotNumber = watch('lotNumber');
  const isScanDisabled = !partyName || !lotNumber || isLoading;

  useEffect(() => {
    if (isCameraDialogOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      };
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraDialogOpen]);

  const processExtractedData = (result: ExtractDeliveryDataOutput) => {
    if (!result || result.entries.length === 0) {
      toast({
        variant: "destructive",
        title: "Extraction Failed",
        description: "No data could be extracted. Please try a clearer image.",
      });
      return;
    }
    
    const entriesToAdd: (Omit<DeliveryFormData, 'partyName'|'lotNumber'> & {machineNumber: string})[] = [];

    for (const entry of result.entries) {
      const { valid, error, machineNumber } = validateDeliveryData(entry);
      if (!valid || !machineNumber) {
        toast({ variant: 'destructive', title: 'Validation Error', description: error });
        return;
      }
      entriesToAdd.push({ ...entry, machineNumber });
    }

    if(entriesToAdd.length === 1) {
      addDeliveryEntry(entriesToAdd[0]);
       toast({ title: 'Scan Successful', description: `1 entry extracted and added.` });
    } else if (entriesToAdd.length > 1) {
      addMultipleDeliveryEntries(entriesToAdd);
       toast({ title: 'Scan Successful', description: `${result.entries.length} entries extracted and added.` });
    }
    
    const currentPartyName = getValues('partyName');
    const currentLotNumber = getValues('lotNumber');
    reset({ partyName: currentPartyName, lotNumber: currentLotNumber, takaNumber: '', meter: '' });
  };


  const handleDataExtraction = async (base64Data: string) => {
    setIsLoading(true);
    try {
      const result = await extractDeliveryData({ photoDataUri: base64Data });
      processExtractedData(result);

      if (result.entries.length > 1 || fileInputRef.current?.value) {
         setIsCameraDialogOpen(false);
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Something went wrong during data extraction.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        handleDataExtraction(dataUri);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => handleDataExtraction(reader.result as string);
    reader.onerror = () => {
      toast({ variant: "destructive", title: "File Error", description: "Could not read file." });
    };
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsCameraDialogOpen(false);
  };


  const addDeliveryEntry = async (data: Omit<DeliveryFormData, 'partyName'|'lotNumber'> & { machineNumber: string }, tpNumber?: number) => {
    if (!supabase) return;

    const currentPartyName = getValues('partyName');
    const currentLotNumber = getValues('lotNumber');
    
    const newDeliveryEntry: DeliveryEntry = {
      id: new Date().toISOString() + Math.random(),
      partyName: currentPartyName,
      lotNumber: currentLotNumber,
      deliveryDate: new Date().toLocaleDateString('en-GB'),
      takaNumber: data.takaNumber,
      meter: data.meter,
      machineNumber: data.machineNumber,
      tpNumber: tpNumber
    };

    dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: newDeliveryEntry });

    const { error } = await supabase.from('delivery_entries').insert(toSnakeCase(newDeliveryEntry));
    if (error) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: newDeliveryEntry.id });
    }
  };
  
  const addMultipleDeliveryEntries = async (entries: (Omit<DeliveryFormData, 'partyName'|'lotNumber'> & { machineNumber: string })[]) => {
    if (!supabase) return;

    const currentPartyName = getValues('partyName');
    const currentLotNumber = getValues('lotNumber');
    let tpNumber: number | undefined = undefined;

    if (entries.length > 1) {
        const maxTp = deliveryEntries.reduce((max, entry) => Math.max(max, entry.tpNumber || 0), 0);
        tpNumber = maxTp + 1;
    }

    const newEntries: DeliveryEntry[] = entries.map(entry => ({
        id: new Date().toISOString() + Math.random() + entry.takaNumber,
        partyName: currentPartyName,
        lotNumber: currentLotNumber,
        deliveryDate: new Date().toLocaleDateString('en-GB'),
        takaNumber: entry.takaNumber,
        meter: entry.meter,
        machineNumber: entry.machineNumber,
        tpNumber: tpNumber
    }));
    
    dispatch({ type: 'ADD_DELIVERY_ENTRIES', payload: newEntries });
    
    const { error } = await supabase.from('delivery_entries').insert(newEntries.map(toSnakeCase));
    if (error) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        newEntries.forEach(entry => dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: entry.id }));
    }
  }

  const validateDeliveryData = (entry: { takaNumber: string, meter: string }): { valid: boolean, error?: string, machineNumber?: string } => {
    let sourceEntries = productionEntries;
    if (selectedList !== "all") {
        const listKey = selectedList as keyof typeof listTakaRanges;
        const range = listTakaRanges[listKey];
        sourceEntries = filterEntriesByRange(productionEntries, range.start, range.end);
    }

    const productionEntry = sourceEntries.find(p => p.takaNumber === entry.takaNumber);

    if (!productionEntry) {
      return { valid: false, error: `Taka Number ${entry.takaNumber} not found` };
    }
    if (productionEntry.meter !== entry.meter) {
        return { valid: false, error: `For Taka ${entry.takaNumber}, Meter does not match` };
    }
    const isDelivered = deliveryEntries.some(d => d.takaNumber === entry.takaNumber);
    if (isDelivered) {
      return { valid: false, error: `Taka Number ${entry.takaNumber} has already been delivered.` };
    }
    return { valid: true, machineNumber: productionEntry.machineNumber };
  };

  const onSubmit: SubmitHandler<Omit<DeliveryFormData, 'machineNumber'>> = (data) => {
    const { valid, error, machineNumber } = validateDeliveryData(data);
    if (!valid || !machineNumber) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error });
      return;
    }
    addDeliveryEntry({ ...data, machineNumber });
    toast({ title: 'Success', description: `Taka ${data.takaNumber} marked as delivered.` });
    const currentPartyName = getValues('partyName');
    const currentLotNumber = getValues('lotNumber');
    reset({ partyName: currentPartyName, lotNumber: currentLotNumber, takaNumber: '', meter: '' });
  };

  const handleEditClick = (entry: DeliveryEntry) => {
    setEditingId(entry.id);
    setEditedEntry(JSON.parse(JSON.stringify(entry)));
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditedEntry(null);
  };

  const handleSaveClick = async () => {
    if (!editedEntry || !supabase) return;
    
    const originalEntry = deliveryEntries.find(d => d.id === editedEntry.id);
    dispatch({ type: 'UPDATE_DELIVERY_ENTRY', payload: editedEntry });
    handleCancelClick();

    const { error } = await supabase.from('delivery_entries').update(toSnakeCase(editedEntry)).eq('id', editedEntry.id);
    if (error) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        if(originalEntry) dispatch({ type: 'UPDATE_DELIVERY_ENTRY', payload: originalEntry });
    } else {
        toast({ title: 'Success', description: `Entry updated.` });
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!supabase) return;
    
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const originalEntry = deliveryEntries.find(d => d.id === id);
      dispatch({ type: 'DELETE_DELIVERY_ENTRY', payload: id });

      const { error } = await supabase.from('delivery_entries').delete().eq('id', id);
      if (error) {
          toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
          if(originalEntry) dispatch({ type: 'ADD_DELIVERY_ENTRY', payload: originalEntry });
      } else {
          toast({ title: 'Success', description: 'Entry deleted.'});
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedEntry) {
      setEditedEntry({ ...editedEntry, [e.target.name]: e.target.value });
    }
  };

  const renderCellContent = (entry: DeliveryEntry, field: keyof DeliveryEntry) => {
    if (editingId === entry.id && editedEntry) {
      if (field === 'id' || field === 'takaNumber' || field === 'deliveryDate' || field === 'machineNumber') {
         if (field === 'takaNumber' && entry.tpNumber) {
          return <>{entry.takaNumber} <span className="text-red-500 font-bold">TP {entry.tpNumber}</span></>;
        }
        if (field === 'deliveryDate') {
            return formatShortDate(entry.deliveryDate);
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
    if (field === 'deliveryDate') {
        return formatShortDate(entry.deliveryDate);
    }
    return entry[field as keyof typeof entry]?.toString() || '';
  };
  
  const totalTakas = deliveryEntries.length;
  const totalMeters = deliveryEntries.reduce((sum, entry) => sum + (parseFloat(entry.meter) || 0), 0).toFixed(2);


  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery</h1>
          <p className="text-muted-foreground">Log new deliveries and view history.</p>
        </div>
        <div className="w-40">
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger>
                <SelectValue placeholder="Select List" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lists</SelectItem>
                 {Array.from({ length: settings.productionTables }).map((_, i) => (
                  <SelectItem key={i} value={`list${i + 1}`}>List {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>New Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="partyName" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Party Name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lotNumber" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Lot No." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField control={form.control} name="takaNumber" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input placeholder="Taka No." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="meter" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input placeholder="Meter" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                    </div>
                    <Button type="submit" className="h-10">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </div>
                   <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                      <DialogTrigger asChild>
                         <Button type="button" variant="outline" className="w-full" disabled={isScanDisabled}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                          Scan Delivery Slip
                        </Button>
                      </DialogTrigger>
                       <DialogContent className="max-w-full w-full h-full sm:max-w-md sm:h-auto p-0">
                          <div className="flex flex-col h-full">
                              <DialogHeader className="p-4 border-b">
                                  <DialogTitle>Scan Delivery Slip</DialogTitle>
                              </DialogHeader>
                              <div className="flex-grow bg-black relative">
                                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                  <canvas ref={canvasRef} className="hidden" />
                                  {hasCameraPermission === false && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                          <Alert variant="destructive" className="m-4">
                                              <AlertTitle>Camera Access Denied</AlertTitle>
                                              <AlertDescription>Enable camera permissions to use this feature.</AlertDescription>
                                          </Alert>
                                      </div>
                                  )}
                                  {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                       <Loader2 className="h-8 w-8 animate-spin text-white" />
                                    </div>
                                  )}
                              </div>
                              <div className="p-4 border-t grid grid-cols-2 gap-2">
                                  <Button onClick={handleCapture} disabled={!hasCameraPermission || isLoading}>
                                      <CircleDotDashed className="mr-2" /> Capture
                                  </Button>
                                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                      <Upload className="mr-2" /> Upload
                                      <input ref={fileInputRef} type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                  </Button>
                              </div>
                          </div>
                      </DialogContent>
                    </Dialog>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {deliveryEntries.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-420px)] lg:h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="p-2 text-xs h-auto">Date</TableHead>
                    <TableHead className="p-2 text-xs h-auto">
                        <div>Taka</div>
                        <div className="text-primary font-bold">{totalTakas}</div>
                    </TableHead>
                    <TableHead className="p-2 text-xs h-auto">M/C</TableHead>
                    <TableHead className="p-2 text-xs h-auto">Meter</TableHead>
                    <TableHead className="p-2 text-xs h-auto">Party</TableHead>
                    <TableHead className="p-2 text-xs h-auto">Lot</TableHead>
                    <TableHead className="p-2 text-xs h-auto text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...deliveryEntries].sort((a, b) => new Date(b.deliveryDate.split('/').reverse().join('-')).getTime() - new Date(a.deliveryDate.split('/').reverse().join('-')).getTime() || (b.tpNumber || 0) - (a.tpNumber || 0) || parseInt(b.takaNumber) - parseInt(a.takaNumber)).map((entry) => (
                    <TableRow key={entry.id} className="h-10">
                      <TableCell className="p-2 text-xs font-medium truncate max-w-[35px]">{renderCellContent(entry, 'deliveryDate')}</TableCell>
                      <TableCell className="p-2 text-xs font-medium">{renderCellContent(entry, 'takaNumber')}</TableCell>
                      <TableCell className="p-2 text-xs font-medium">{renderCellContent(entry, 'machineNumber')}</TableCell>
                      <TableCell className="p-2 text-xs font-medium">{renderCellContent(entry, 'meter')}</TableCell>
                      <TableCell className="p-2 text-xs font-medium truncate max-w-[50px]">{renderCellContent(entry, 'partyName')}</TableCell>
                      <TableCell className="p-2 text-xs font-medium">{renderCellContent(entry, 'lotNumber')}</TableCell>
                      <TableCell className="p-2 text-xs font-medium text-right">
                        {editingId === entry.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={handleSaveClick}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleCancelClick}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditClick(entry)}>
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell className="p-2 font-bold" colSpan={3}>Total Meters</TableCell>
                        <TableCell className="p-2 font-bold">{totalMeters}</TableCell>
                        <TableCell colSpan={3}></TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
              </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">No deliveries recorded yet.</p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
