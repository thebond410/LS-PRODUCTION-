"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractProductionData } from '@/ai/flows/extract-production-data-from-image';
import { ProductionEntry } from '@/types';
import { ConfirmationModal } from './confirmation-modal';

export function AddEntryDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ProductionEntry[] | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
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
        setOpen(false); // Close the initial dialog
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "Could not read the selected file.",
      });
    };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Entry</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Production Entry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button size="lg" disabled={isLoading}>
              <Camera className="mr-2 h-5 w-5" />
              Scan with Camera
            </Button>
            <Button size="lg" variant="secondary" disabled={isLoading} asChild>
              <label htmlFor="upload-file">
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
                )}
                Upload Image
                <input
                  id="upload-file"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </label>
            </Button>
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
