
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useAppContext } from "@/context/AppContext";
import { useToast } from '@/hooks/use-toast';
import { Camera, PlusCircle, Loader2, FilePenLine, Trash2, Check, X, Upload, Video, CircleDotDashed } from 'lucide-react';
import { DeliveryEntry, ProductionEntry } from '@/types';
import { extractDeliveryData, ExtractDeliveryDataOutput } from '@/ai/flows/extract-delivery-data-from-image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfirmationModal } from '@/components/delivery/confirmation-modal';
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
  const { settings, productionEntries, deliveryEntries } = state;
  const { productionTables, listTakaRanges } = settings;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<DeliveryEntry | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  
  const [extractedData, setExtractedData] = useState<ExtractDeliveryDataOutput['entries'] | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  
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
      // Stop camera stream when dialog closes
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraDialogOpen]);
  
  const processExtractedData = (result: ExtractDeliveryDataOutput) => {
    if (result && result.entries.length > 0) {
      const validatedEntries: (Omit<DeliveryFormData, 'partyName' | 'lotNumber'> & { machineNumber: string })[] = [];
      for (const entry of result.entries) {
        const { valid, error, machineNumber } = validateDeliveryData(entry);
        if (!valid || !machineNumber) {
          toast({ variant: 'destructive', title: 'Validation Error', description: error });
          return; // Stop processing if any entry is invalid
        }
        validatedEntries.push({ takaNumber: entry.takaNumber, meter: entry.meter, machineNumber });
      }

      setExtractedData(result.entries);
      setIsConfirmationOpen(true);
      
    } else {
      toast({
        variant: "destructive",
        title: "Extraction Failed",
        description: "No data could be extracted. Please try a clearer image.",
      });
    }
  };


  const handleDataExtraction = async (base64Data: string) => {
    setIsLoading(true);
    try {
      const result = await extractDeliveryData({ photoDataUri: base64Data });
      processExtractedData(result);
    } catch (error) {
      console.error("Extraction error:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Something went wrong during data extraction.",
      });
    } finally {
      setIsLoading(false);
      setIsCameraDialogOpen(false);
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
  };


  const addDeliveryEntry = (data: Omit<DeliveryFormData, 'machineNumber'> & { machineNumber: string }, tpNumber?: number) => {
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
  };

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

  const handleConfirmExtraction = (confirmedEntries: { takaNumber: string; meter: string }[]) => {
      const currentPartyName = getValues('partyName');
      const currentLotNumber = getValues('lotNumber');
      let tpNumber: number | undefined = undefined;

      if (confirmedEntries.length > 1) {
        const maxTp = deliveryEntries.reduce((max, entry) => Math.max(max, entry.tpNumber || 0), 0);
        tpNumber = maxTp + 1;
      }
      
      const entriesToAdd: (Omit<DeliveryFormData, 'partyName'|'lotNumber'> & {machineNumber: string})[] = [];

      for (const entry of confirmedEntries) {
        const { valid, error, machineNumber } = validateDeliveryData(entry);
        if (!valid || !machineNumber) {
          toast({ variant: 'destructive', title: 'Validation Error', description: error });
          return;
        }
        entriesToAdd.push({ ...entry, machineNumber });
      }

      entriesToAdd.forEach(entry => {
        addDeliveryEntry({
          partyName: currentPartyName,
          lotNumber: currentLotNumber,
          takaNumber: entry.takaNumber,
          machineNumber: entry.machineNumber,
          meter: entry.meter,
        }, tpNumber);
      });
      toast({ title: 'Scan Successful', description: `${confirmedEntries.length} entries extracted and added.` });
      reset({ partyName: currentPartyName, lotNumber: currentLotNumber, takaNumber: '', meter: '' });
  };


  const onSubmit: SubmitHandler<Omit<DeliveryFormData, 'machineNumber'>> = (data) => {
    const { valid, error, machineNumber } = validateDeliveryData(data);
    if (!valid || !machineNumber) {
      toast({ variant: 'destructive', title: 'Validation Error', description: error });
      return;
    }
    addDeliveryEntry({ ...data, machineNumber });
    toast({ title: 'Success', description: `Taka ${data.takaNumber} marked as delivered.` });
    reset({ partyName: data.partyName, lotNumber: data.lotNumber, takaNumber: '', meter: '' });
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
    if (window.confirm('Are you sure you want to delete this entry?')) {
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
      if (field === 'tpNumber' || field === 'id' || field === 'takaNumber' || field === 'deliveryDate') {
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
    <div className="space-y-2">
       <header className="px-2 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-800">Delivery</h1>
            <p className="text-muted-foreground text-sm hidden md:block">Record new deliveries.</p>
        </div>
        <div className="w-32">
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select List" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lists</SelectItem>
                 {Array.from({ length: productionTables }).map((_, i) => (
                  <SelectItem key={i} value={`list${i + 1}`}>List {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
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

                <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={isScanDisabled}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md p-2">
                    <DialogHeader>
                      <DialogTitle>Scan Delivery Slip</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <div className="relative">
                          <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                          <canvas ref={canvasRef} className="hidden" />
                          {hasCameraPermission === false && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                  <Alert variant="destructive" className="m-4">
                                      <AlertTitle>Camera Access Denied</AlertTitle>
                                      <AlertDescription>Enable camera permissions to use this feature.</AlertDescription>
                                  </Alert>
                              </div>
                          )}
                          {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                               <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                          )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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

              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <FormField control={form.control} name="takaNumber" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Taka No." {...field} className="h-8"/></FormControl>
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
          <ScrollArea className="h-[calc(100vh-350px)]">
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
                  <TableCell className="p-1 text-[11px] font-bold truncate max-w-[40px]">{renderCellContent(entry, 'deliveryDate')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'takaNumber')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'machineNumber')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold">{renderCellContent(entry, 'meter')}</TableCell>
                  <TableCell className="p-1 text-[11px] font-bold truncate max-w-[60px]">{renderCellContent(entry, 'partyName')}</TableCell>
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
            <TableFooter>
                <TableRow>
                    <TableCell className="p-1 text-[12px] font-bold h-8">Total</TableCell>
                    <TableCell className="p-1 text-[12px] font-bold h-8">{totalTakas}</TableCell>
                    <TableCell className="p-1 text-[12px] font-bold h-8"></TableCell>
                    <TableCell className="p-1 text-[12px] font-bold h-8">{totalMeters}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                </TableRow>
            </TableFooter>
          </Table>
          </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No deliveries recorded yet.</p>
          )}
        </CardContent>
      </Card>
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        data={extractedData}
        onConfirm={handleConfirmExtraction}
      />
    </div>
  );
}
