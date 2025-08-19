
"use client";

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, CircleDotDashed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractProductionData } from '@/ai/flows/extract-production-data-from-image';
import { ProductionEntry } from '@/types';
import { ConfirmationModal } from './confirmation-modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AddEntryDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ProductionEntry[] | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { toast } = useToast();
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
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
  }, [open]);

  const handleDataExtraction = async (base64Data: string) => {
    setIsLoading(true);
    try {
        const result = await extractProductionData({ photoDataUri: base64Data });

        if (result && result.entries && result.entries.length > 0) {
          setExtractedData(result.entries);
          setIsConfirmationOpen(true);
        } else {
          toast({
            variant: "destructive",
            title: "Extraction Failed",
            description: "No data could be extracted from the image. Please try again with a clearer image.",
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
      setIsLoading(false);
      setOpen(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Entry</Button>
        </DialogTrigger>
        <DialogContent className="max-w-full w-full h-full sm:max-w-md sm:h-auto p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Scan Production Log</DialogTitle>
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

      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        data={extractedData}
      />
    </>
  );
}
