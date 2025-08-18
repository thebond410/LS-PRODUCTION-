
"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { ProductionEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilePenLine, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";

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

const formatShortDate = (dateString: string) => {
  if (!dateString) return '';
  const parts = dateString.split('/');
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return dateString;
};

export function ProductionList() {
  const { state, dispatch } = useAppContext();
  const { settings, productionEntries, deliveryEntries } = state;
  const { productionTables, listTakaRanges } = settings;
  const [selectedList, setSelectedList] = useState<string>("all");

  const [editingTaka, setEditingTaka] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<ProductionEntry | null>(null);

  const deliveredTakaNumbers = new Set(deliveryEntries.map(d => d.takaNumber));

  const handleEditClick = (entry: ProductionEntry) => {
    setEditingTaka(entry.takaNumber);
    setEditedEntry(entry);
  };

  const handleCancelClick = () => {
    setEditingTaka(null);
    setEditedEntry(null);
  };

  const handleSaveClick = () => {
    if (editedEntry) {
      dispatch({ type: 'UPDATE_PRODUCTION_ENTRY', payload: editedEntry });
      handleCancelClick();
    }
  };
  
  const handleDeleteClick = (takaNumber: string) => {
    if (confirm(`Are you sure you want to delete Taka ${takaNumber}?`)) {
      dispatch({ type: 'DELETE_PRODUCTION_ENTRY', payload: takaNumber });
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedEntry) {
      setEditedEntry({ ...editedEntry, [e.target.name]: e.target.value });
    }
  };

  const allTableData = Array.from({ length: productionTables }, (_, i) => {
    const listKey = `list${i + 1}` as keyof typeof listTakaRanges;
    const range = listTakaRanges[listKey];
    return {
      title: `List ${i + 1}`,
      entries: filterEntriesByRange(productionEntries, range.start, range.end),
    }
  });

  const tableData = selectedList === "all" 
    ? allTableData 
    : allTableData.filter((_, index) => `list${index + 1}` === selectedList);

  if (productionEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No production entries yet.</p>
        <p className="text-sm">Click 'Add Entry' to start.</p>
      </div>
    );
  }

  const renderCellContent = (entry: ProductionEntry, field: keyof ProductionEntry) => {
    const isEditing = editingTaka === entry.takaNumber && editedEntry;
    
    if (isEditing) {
      return (
        <Input
          name={field}
          value={editedEntry[field]}
          onChange={handleInputChange}
          className="h-5 p-1 text-[10px] font-bold"
          disabled={field === 'takaNumber'} // Don't allow editing taka number as it's the key
        />
      );
    }
    
    if (field === 'date') {
      return formatShortDate(entry.date);
    }
    
    return entry[field];
  };

  return (
    <div className="space-y-2">
      <div className="px-2">
        <Select value={selectedList} onValueChange={setSelectedList}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select a list" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lists</SelectItem>
            {Array.from({ length: productionTables }).map((_, i) => (
              <SelectItem key={i} value={`list${i + 1}`}>List {i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2px] px-[2px]">
        {tableData.map((data, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader className="p-2">
              <CardTitle className="text-base">{data.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
              {data.entries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-[2px] text-[10px] font-bold h-6 text-sky-600">Taka</TableHead>
                      <TableHead className="p-[2px] text-[10px] font-bold h-6 text-red-600">M/C</TableHead>
                      <TableHead className="p-[2px] text-[10px] font-bold h-6 text-green-600">Meter</TableHead>
                      <TableHead className="p-[2px] text-[10px] font-bold h-6 text-purple-600">DT</TableHead>
                      <TableHead className="p-[2px] text-[10px] font-bold text-right h-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow key={entry.takaNumber} className={cn("m-[2px] h-6", deliveredTakaNumbers.has(entry.takaNumber) && "bg-destructive/10")}>
                        <TableCell className="p-[2px] text-[10px] font-bold relative text-sky-600">
                          {renderCellContent(entry, 'takaNumber')}
                          {deliveredTakaNumbers.has(entry.takaNumber) && (
                            <Badge variant="destructive" className="absolute -top-2 -right-2 text-[8px] p-0.5 h-auto">Delivered</Badge>
                          )}
                        </TableCell>
                        <TableCell className="p-[2px] text-[10px] font-bold text-red-600">{renderCellContent(entry, 'machineNumber')}</TableCell>
                        <TableCell className="p-[2px] text-[10px] font-bold text-green-600">{renderCellContent(entry, 'meter')}</TableCell>
                        <TableCell className="p-[2px] text-[10px] font-bold text-purple-600">{renderCellContent(entry, 'date')}</TableCell>
                        <TableCell className="p-[2px] text-right">
                          {editingTaka === entry.takaNumber ? (
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
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDeleteClick(entry.takaNumber)}>
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
                <p className="text-muted-foreground text-xs text-center py-4">
                  No entries for this list.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
