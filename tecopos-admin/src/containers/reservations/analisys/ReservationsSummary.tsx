import { useEffect, useState } from "react";
import Breadcrumb from "../../../components/navigation/Breadcrumb";
import { CalendarIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { useServerBilling } from "../../../api/useServerBilling";
import LoadingSpin from "../../../components/misc/LoadingSpin";
import ADIT from "./graphics/ADIT";
import TotalReservesByProducts from "./graphics/TotalReservesByProducts";
import TotalReservesByStatus from "./graphics/TotalReservesByStatus";
import NextAppointments from "./graphics/NextAppointments";
import GenericTable, {
  FilterOpts,
} from "../../../components/misc/GenericTable";
import { BasicType } from "../../../interfaces/InterfacesLocal";

const ReservationSummary = () => {
  const { AllSummaryOrders, GetAllSummaryOrders } = useServerBilling();

  useEffect(() => {
    GetAllSummaryOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {}, [AllSummaryOrders]);
  const [filter, setFilter] = useState<BasicType>({ page: 1 });

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "datepicker-range",
      filterCode: "rage",
      name: "Rango de fecha",
    },
  ];

  return (
    <div>
      {AllSummaryOrders === undefined ? (
        <LoadingSpin color="black" />
      ) : (
        <div className="w-full">
          <Breadcrumb
            icon={<CalendarIcon className="h-6 text-gray-500" />}
            paths={[{ name: "Reservaciones" }, { name: "Análisis" }]}
          />

          {/* <GenericTable
            tableTitles={[]}
            tableData={[]}
            filterComponent={{ availableFilters, filterAction }}
          /> */}

          <div className="flex flex-row md:flex-col w-full gap-y-4">
            <ADIT AllSummaryOrders={AllSummaryOrders} />
            <div className="flex w-full gap-x-4">
              <div className="w-[50%] bg-white p-2 rounded-xl ">
                {/* Total de reservas por producto */}
                <TotalReservesByProducts />
              </div>
              <div className="w-[50%] bg-white p-2 rounded-xl  ">
                <TotalReservesByStatus />
              </div>
            </div>

            <div className="flex w-full gap-x-4">
              <div className="w-[100%] bg-white p-2 rounded-xl">
                <NextAppointments
                  orderByMonth={AllSummaryOrders?.orderByMonth!}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationSummary;
