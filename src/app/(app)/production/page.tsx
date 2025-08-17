import { AddEntryDialog } from "@/components/production/add-entry-dialog";
import { ProductionList } from "@/components/production/production-list";

export default function ProductionPage() {
  return (
    <div className="p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Production</h1>
          <p className="text-muted-foreground">Manage your production entries.</p>
        </div>
        <AddEntryDialog />
      </header>
      <ProductionList />
    </div>
  );
}
