
"use client";

import { useAppContext } from "@/context/AppContext";
import { ProductionEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FilePenLine, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

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

export function ProductionList() {
  const { state } = useAppContext();
  const { settings, productionEntries, deliveryEntries } = state;
  const { productionTables, listTakaRanges } = settings;

  const deliveredTakaNumbers = new Set(deliveryEntries.map(d => d.takaNumber));

  const tableData = Array.from({ length: productionTables }, (_, i) => {
    const listKey = `list${i + 1}` as keyof typeof listTakaRanges;
    const range = listTakaRanges[listKey];
    return filterEntriesByRange(productionEntries, range.start, range.end);
  });

  if (productionEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No production entries yet.</p>
        <p className="text-sm">Click 'Add Entry' to start.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2px] px-[2px]">
      {tableData.map((entries, index) => (
        <Card key={index} className="flex flex-col">
          <CardHeader className="p-2">
            <CardTitle className="text-base">List {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-grow">
            {entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="p-[2px] text-[10px] font-bold">Taka</TableHead>
                    <TableHead className="p-[2px] text-[10px] font-bold">M/C</TableHead>
                    <TableHead className="p-[2px] text-[10px] font-bold">Meter</TableHead>
                    <TableHead className="p-[2px] text-[10px] font-bold">DT</TableHead>
                    <TableHead className="p-[2px] text-[10px] font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.takaNumber} className={cn("m-[2px]", deliveredTakaNumbers.has(entry.takaNumber) && "bg-destructive/10")}>
                      <TableCell className="p-[2px] text-[10px] font-bold relative">
                        {entry.takaNumber}
                        {deliveredTakaNumbers.has(entry.takaNumber) && (
                          <Badge variant="destructive" className="absolute -top-2 -right-2 text-[8px] p-0.5 h-auto">Delivered</Badge>
                        )}
                      </TableCell>
                      <TableCell className="p-[2px] text-[10px] font-bold">{entry.machineNumber}</TableCell>
                      <TableCell className="p-[2px] text-[10px] font-bold">{entry.meter}</TableCell>
                      <TableCell className="p-[2px] text-[10px] font-bold">{entry.date}</TableCell>
                      <TableCell className="p-[2px] text-right">
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <FilePenLine className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-xs text-center py-4">
                No entries for this list.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
