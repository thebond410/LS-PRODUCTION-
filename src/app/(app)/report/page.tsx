import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";

export default function ReportPage() {
  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <p className="text-muted-foreground">Generate and view reports.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production Wise</SelectItem>
                <SelectItem value="delivery">Delivery Wise</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Table/List" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list1">List 1</SelectItem>
                <SelectItem value="list2">List 2</SelectItem>
                <SelectItem value="list3">List 3</SelectItem>
              </SelectContent>
            </Select>
        </CardContent>
      </Card>

      <div className="text-center text-muted-foreground py-10">
        <FileText className="mx-auto h-12 w-12" />
        <h3 className="mt-2 text-sm font-medium">No report generated</h3>
        <p className="mt-1 text-sm">Select filters above to generate a report.</p>
      </div>
    </div>
  );
}
