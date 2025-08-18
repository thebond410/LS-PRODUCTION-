
"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/context/AppContext";
import { ProductionEntry, DeliveryEntry } from "@/types";
import { Calendar as CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ReportType = "production" | "delivery" | "";

export default function ReportPage() {
  const { state } = useAppContext();
  const { productionEntries, deliveryEntries } = state;
  
  const [date, setDate] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState<ReportType>("");
  const [list, setList] = useState<string>("");
  const [generatedReport, setGeneratedReport] = useState<{ type: ReportType; data: any[] } | null>(null);

  const handleGenerateReport = () => {
    if (!reportType) {
      alert("Please select a report type.");
      return;
    }

    let filteredData: (ProductionEntry | DeliveryEntry)[] = [];

    if (reportType === 'production') {
      filteredData = productionEntries;
    } else if (reportType === 'delivery') {
      filteredData = deliveryEntries;
    }
    
    if (date?.from && date?.to) {
       filteredData = filteredData.filter(entry => {
        const entryDateStr = 'date' in entry ? entry.date : entry.deliveryDate;
        if (!entryDateStr) return false;
        // Adjusting for dd/mm/yy format to avoid parsing issues
        const dateParts = entryDateStr.split('/');
        if (dateParts.length !== 3) return false;
        const entryDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        
        // Clear time part for accurate date comparison
        const fromDate = new Date(date.from!);
        fromDate.setHours(0,0,0,0);
        const toDate = new Date(date.to!);
        toDate.setHours(23,59,59,999);

        return entryDate >= fromDate && entryDate <= toDate;
      });
    }

    setGeneratedReport({ type: reportType, data: filteredData });
  };

  const renderProductionReport = (data: ProductionEntry[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Taka No.</TableHead>
          <TableHead>Machine</TableHead>
          <TableHead>Meter</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, index) => (
          <TableRow key={index}>
            <TableCell>{entry.takaNumber}</TableCell>
            <TableCell>{entry.machineNumber}</TableCell>
            <TableCell>{entry.meter}</TableCell>
            <TableCell>{entry.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderDeliveryReport = (data: DeliveryEntry[]) => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Taka No.</TableHead>
          <TableHead>Meter</TableHead>
          <TableHead>Party</TableHead>
          <TableHead>Lot</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.deliveryDate}</TableCell>
            <TableCell>{entry.takaNumber}</TableCell>
            <TableCell>{entry.meter}</TableCell>
            <TableCell>{entry.partyName}</TableCell>
            <TableCell>{entry.lotNumber}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );


  return (
    <div className="space-y-2">
      <header className="px-2 pt-2">
        <h1 className="text-xl font-bold text-gray-800">Reports</h1>
        <p className="text-muted-foreground text-sm">Generate and view reports.</p>
      </header>

      <Card className="mx-2">
        <CardHeader className="p-2">
          <CardTitle className="text-base">Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full h-8 justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>

                <Select onValueChange={(value) => setReportType(value as ReportType)} value={reportType}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="production">Production Wise</SelectItem>
                    <SelectItem value="delivery">Delivery Wise</SelectItem>
                </SelectContent>
                </Select>

                <Select onValueChange={setList} value={list}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="Filter by List" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="list1">List 1</SelectItem>
                    <SelectItem value="list2">List 2</SelectItem>
                    <SelectItem value="list3">List 3</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <Button onClick={handleGenerateReport} className="w-full h-9 mt-2">Generate Report</Button>
        </CardContent>
      </Card>
      
      <Card className="mx-2">
        <CardContent className="p-0">
           {generatedReport ? (
             generatedReport.data.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-280px)]">
                    {generatedReport.type === 'production' && renderProductionReport(generatedReport.data as ProductionEntry[])}
                    {generatedReport.type === 'delivery' && renderDeliveryReport(generatedReport.data as DeliveryEntry[])}
                </ScrollArea>
             ) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>No data available for the selected filters.</p>
                </div>
             )
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    <FileText className="mx-auto h-12 w-12" />
                    <h3 className="mt-2 text-sm font-medium">No report generated</h3>
                    <p className="mt-1 text-sm">Select filters above to generate a report.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
