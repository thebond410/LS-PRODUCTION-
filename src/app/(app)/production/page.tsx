import { AddEntryDialog } from "@/components/production/add-entry-dialog";
import { ProductionList } from "@/components/production/production-list";

export default function ProductionPage() {
  return (
    <div className="space-y-2">
      <header className="flex justify-between items-center px-2 pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Production</h1>
          <p className="text-muted-foreground text-sm">Manage your production entries.</p>
        </div>
        <AddEntryDialog />
      </header>
      <ProductionList />
    </div>
  );
}
