import { useEffect } from "react";
import {BarChar} from "../../../components/misc/Chart";
import moment from "moment";
import useServerBusiness from "../../../api/useServerBusiness";
import { useParams } from "react-router-dom";
import Loading from "../../../components/misc/Loading";
import SpinnerLoading from "../../../components/misc/SpinnerLoading";

const Resumen = () => {
  //const { reports,incomes } = useContext(BusinessContext);
  const { getBusinessResume, incomes, reports, isLoading } =
    useServerBusiness();
  const { businessId } = useParams();

  useEffect(() => {
    getBusinessResume(businessId!);
  }, []);

  let dateRangeToChart;
  if (incomes) {
    dateRangeToChart =
      "Del " +
      moment(incomes[0].date).format("D [de] MMMM") +
      " al " +
      moment(incomes[incomes.length - 1].date).format("D [de] MMMM");
  }

  if (isLoading)
    return (
      <div className="flex h-96 justify-center items-center">
        <SpinnerLoading />
      </div>
    );

  return (
    <div className="grid sm:grid-cols-2 grid-cols-1 gap-6 mx-auto">
      <div className="border-t border-gray-200 md:inline-block">
        <div className="sm:block overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-3 sm:px-6">
            <h3 className="text-md font-medium leading-6 text-gray-900">
              Áreas
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 sm:gap-4">
                <dt className="text-md font-medium text-gray-500">
                  Puntos de Venta:
                </dt>
                <dd className="text-md font-bold text-center text-gray-900">
                  {reports?.areas.SALE}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 sm:gap-4">
                <dt className="text-md font-medium text-gray-500">
                  Procesado:
                </dt>
                <dd className="text-md font-bold text-center text-gray-900">
                  {reports?.areas.MANUFACTURER}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 sm:gap-4">
                <dt className="text-md font-medium text-gray-500">
                  Almacenes:
                </dt>
                <dd className="text-md font-bold text-center text-gray-900">
                  {reports?.areas.STOCK}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 mt-5 m:inline-block">
        <div className="sm:block  overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-3 sm:px-6">
            <h3 className="text-md font-medium leading-6 text-gray-900">
              Productos
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 sm:gap-4">
                <dt className="text-md font-medium text-gray-500">Cantidad:</dt>
                <dd className="text-md font-bold text-center text-gray-900">
                  {reports?.products.total}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 sm:gap-4">
                <dt className="text-md font-medium text-gray-500">En Venta:</dt>
                <dd className="text-md font-bold text-center text-gray-900">
                  {reports?.products.totalInSale}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="flex border-gray-200 h-full w-full">
        <BarChar
          title={dateRangeToChart}
          name="Ventas Totales"
          xlabels={incomes?.map((item) => item.day)}
          dataShow={incomes?.map((item) => item.totalIncome)}
        />
      </div>
    </div>
  );
};

export default Resumen;
