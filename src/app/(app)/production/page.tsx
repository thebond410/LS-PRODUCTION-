import { ProductionEntryOptions } from "@/components/production/production-entry-options";
import { ProductionList } from "@/components/production/production-list";

export default function ProductionPage() {
  return (
    <div className="space-y-2">
      <header className="flex justify-between items-center px-2 pt-2">
        <div>
          <h1 className="text-sm font-bold text-gray-800">Production</h1>
        </div>
        <ProductionEntryOptions />
      </header>
      <ProductionList />
    </div>
  );
}
