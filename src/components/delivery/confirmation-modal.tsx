
"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExtractDeliveryDataOutput } from "@/ai/flows/extract-delivery-data-from-image";

interface ConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: ExtractDeliveryDataOutput['entries'] | null;
  onConfirm: (data: ExtractDeliveryDataOutput['entries']) => void;
}

export function ConfirmationModal({ isOpen, onOpenChange, data, onConfirm }: ConfirmationModalProps) {

  const handleConfirm = () => {
    if (data) {
      onConfirm(data);
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Extracted Data</AlertDialogTitle>
          <AlertDialogDescription>
            Please review the extracted data. Confirm to add these entries to your delivery list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="h-60 w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taka No.</TableHead>
                <TableHead>Meter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{entry.takaNumber}</TableCell>
                  <TableCell>{entry.meter}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
