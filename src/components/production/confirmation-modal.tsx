
"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import type { ProductionEntry } from "@/types";

interface ConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProductionEntry[] | null;
}

export function ConfirmationModal({ isOpen, onOpenChange, data }: ConfirmationModalProps) {
  const { state, dispatch } = useAppContext();
  const { settings } = state;
  const { toast } = useToast();

  const handleConfirm = () => {
    if (data) {
      const validEntries: ProductionEntry[] = [];
      const invalidEntries: string[] = [];
      
      data.forEach(entry => {
        const machineNum = parseInt(entry.machineNumber, 10);
        if (isNaN(machineNum) || machineNum > settings.maxMachineNumber) {
          invalidEntries.push(`Taka ${entry.takaNumber} (Machine ${entry.machineNumber})`);
        } else {
          validEntries.push(entry);
        }
      });
      
      if (invalidEntries.length > 0) {
        toast({
          variant: "destructive",
          title: "Invalid Machine Number",
          description: `The following entries have machine numbers exceeding the maximum of ${settings.maxMachineNumber}: ${invalidEntries.join(', ')}`,
        });
      }

      if (validEntries.length > 0) {
        dispatch({ type: 'ADD_PRODUCTION_ENTRIES', payload: validEntries });
        toast({
          title: "Success",
          description: `${validEntries.length} production entries have been added.`,
        });
      }
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Extracted Data</AlertDialogTitle>
          <AlertDialogDescription>
            Please review the extracted data below. Confirm to add these entries to your production list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="h-60 w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taka</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Meter</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{entry.takaNumber}</TableCell>
                  <TableCell>{entry.machineNumber}</TableCell>
                  <TableCell>{entry.meter}</TableCell>
                  <TableCell>{entry.date}</TableCell>
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
