import {
  ArrowPathRoundedSquareIcon,
  ClipboardDocumentListIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import ReportContainer from "../areas/stock/reports/ReportContainer";
import BillingAnalysis from "../billing/analysis/BillingAnalysis";
import EconomicCyclesAnalysis from "../economicCycles/analysis/EconomicCyclesAnalysis";

function AllReports() {
  return (
    <div className="space-y-3">
      <div>
        <span className="flex gap-2 text-gray-700 items-center font-medium text-base px-2 mb-2">
          <RectangleGroupIcon className="h-6 text-gray-500" /> Mis almacenes
        </span>
        <ReportContainer breadcrumb={false} />
      </div>
      <div>
        <span className="flex gap-2 text-gray-700 items-center font-medium text-base px-2 mb-2">
          <ArrowPathRoundedSquareIcon className="h-6 text-gray-500" /> Ciclos
          económicos
        </span>
        <EconomicCyclesAnalysis breadcrumb={false} />
      </div>
      <div>
        <span className="flex gap-2 text-gray-700 items-center font-medium text-base px-2 mb-2">
          <ClipboardDocumentListIcon className="h-6 text-gray-500" />{" "}
          Facturación
        </span>
        <BillingAnalysis breadcrumb={false} />
      </div>
    </div>
  );
}

export default AllReports;
