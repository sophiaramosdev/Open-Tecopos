import moment from "moment";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { selectUserSession } from "../../store/userSessionSlice";
import MyRadio from "../commos/MyRadio";
import MyTextarea from "../commos/MyTextArea";

const DetailsCommon = ({ status, initialValues, setInitialValues, data }) => {
  const { business } = useAppSelector(state=>state.init);
  const [initialValue, setinitialValue] = useState(initialValues);
  useEffect(() => {
    status === "open" && setInitialValues(initialValue);
  }, [initialValue]);

  const [isChecked, setIsChecked] = useState(
    status === "open" && initialValue?.priceSystemChecked
  );
  const handleChecked = (value) => {
    setinitialValue({ ...initialValue, systemPriceId: value });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setinitialValue({ ...initialValue, [name]: value });
  };
  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Detalles del Ciclo económico
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">{data?.name}</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Abierto el</dt>
            <dd className="mt-1 text-sm flex gap-4 text-gray-900 sm:col-span-2 sm:mt-0">
              <p>Fecha: {moment(data.openDate).format("DD-MM-YYYY")}</p>
              <p>Hora: {moment(data.openDate).format("LT")}</p>
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Abierto por</dt>
            <dd className="mt-1 text-sm flex gap-4 text-gray-900 sm:col-span-2 sm:mt-0">
              <p>Usuario: {data.openBy.username}</p>
              <p>Correo: {data.openBy.email}</p>
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Cerrado el</dt>
            {status === "open" ? (
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                -
              </dd>
            ) : (
              <dd className="mt-1 text-sm flex gap-4 text-gray-900 sm:col-span-2 sm:mt-0">
                <p>Fecha: {moment(data.closedDate).format("DD-MM-YYYY")}</p>
                <p>Hora: {moment(data.closedDate).format("LT")}</p>
              </dd>
            )}
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Cerrado por</dt>
            {status === "open" ? (
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                -
              </dd>
            ) : (
              <dd className="mt-1 text-sm flex gap-4 text-gray-900 sm:col-span-2 sm:mt-0">
                <p>Usuario: {data.closedBy?.username}</p>
                <p>Correo: {data.closedBy?.email}</p>
              </dd>
            )}
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Notas</dt>
            {status === "open" && (
              <MyTextarea
                areaclass="col-span-2"
                name="observations"
                type="text"
                placeholder=""
                value={initialValue?.observations}
                onChange={handleChange}
              />
            )}
            {status === "closed" && (
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {data?.observations}
              </dd>
            )}
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">
              Sistema de precio
            </dt>
            {status === "open" && (
              <div className="flex col-span-2 flex-wrap gap-4 sm:gap-8">
                {business.priceSystems?.map((item) => (
                  <div
                    onClick={() => setIsChecked(item.name)}
                    className="whitespace-nowrap"
                    key={item.id}
                  >
                    <MyRadio
                      id={item.id}
                      name="systemPriceId"
                      label={item.name}
                      checked={isChecked === item.name}
                      value={item.id}
                      customFunc={() => handleChecked(item.id)}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </div>
            )}
            {status === "closed" && (
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {data.priceSystem?.name}
              </dd>
            )}
          </div>
        </dl>
      </div>
    </div>
  );
};

export default DetailsCommon;
