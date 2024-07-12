import { useContext, useEffect } from "react";
import { Control, useFieldArray } from "react-hook-form";
import useServerOrders from "../../../../api/useServerOrders";
import { OnlineOrderContext } from "../OnlineOrderDetailContainer";
import GenericTable, { DataTableInterface } from "../../../../components/misc/GenericTable";
import Check from "../../../../components/forms/GenericCheck";
import { formatCalendar, formatCurrency } from "../../../../utils/helpers";
import { translatePaymetMethods } from "../../../../utils/translate";
import SpinnerLoading from "../../../../components/misc/SpinnerLoading";
import Button from "../../../../components/misc/Button";


interface PartialListInterface {
  setPartialView: Function;
  control: Control;
}

const PartialList = ({ setPartialView, control }: PartialListInterface) => {
  const { order } = useContext(OnlineOrderContext);
  const { isLoading, prepaids, getPrepaids: getPrepaid } = useServerOrders();
  const { fields, append, remove } = useFieldArray<Record<string, any>>({
    name: "prepaidPayment",
    control,
  });

  const {
    client: { id: clientId },
  } = order!;

  useEffect(() => {
    getPrepaid({ clientId, status: "PAID" });
  }, []);

  const changePaidSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const selected = prepaids.find(
        (paid) => paid.id === Number(e.target.value)
      );
      append({
        paymentId: selected?.id,
        payment: selected?.paymentNumber,
        amount: selected?.amount,
        codeCurrency: selected?.codeCurrency,
      });
    } else {
      const unSelected = prepaids.findIndex(
        (paid) => paid.id === Number(e.target.value)
      );
      remove(unSelected);
    }
  };
  const titles = ["", "No. Pago", "Monto", "Forma de pago", "Fecha"];

  const tableData: DataTableInterface[] = [];
  prepaids.forEach((paid) => {
    tableData.push({
      payload: {
        "": (
          <Check
            value={paid.id}
            onChange={changePaidSelected}
            defaultChecked={
              !!fields.find((item: any) => item.paymentId === paid.id)
            }
          />
        ),
        "No. Pago": paid.paymentNumber,
        Monto: formatCurrency(paid.amount, paid.codeCurrency),
        "Forma de pago": translatePaymetMethods(paid.paymentWay),
        Fecha: formatCalendar(paid.createdAt),
      },
    });
  });

  return isLoading ? (
    <div className="flex w-full h-96 justify-center items-center">
      <SpinnerLoading text="Buscando anticipos " />
    </div>
  ) : (
    <div className="mt-5">
      <div className="h-96 border border-gray rounded-sm mb-5">
        <GenericTable tableData={tableData} tableTitles={titles} />
      </div>

      <Button
        name="Aceptar"
        color="slate-600"
        full
        action={() => setPartialView(false)}
      />
    </div>
  );
};

export default PartialList;
