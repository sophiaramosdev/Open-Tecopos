import { SubmitHandler, useForm } from "react-hook-form";
import { translatePaymetMethods } from "../../../../../utils/translate";
import { TrashIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDate } from "../../../../../utils/helpers";

interface Props {
  close: Function;
  action: Function;
  data: any;
}
export const EditPay = ({ close, action, data }: Props) => {
  // Hooks
  const {
    handleSubmit,
  } = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = () => {
    action(data.id);
    close();
  };

  return (
    <>
      <form className="px-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="">
          {/* payments */}
          <div className="flex flex-col pt-2 gap-2 items-start ">
            <div className="flex justify-end w-full">
              <button type="submit">
                <TrashIcon className="w-7 text-red-500 cursor-pointer " />
              </button>
            </div>
            <>
                <div className="flex flex-col gap-y-3">
                  <h3 className="font-semibold flex gap-x-2">
                    Monto:
                    <span className="font-normal">
                      {formatCurrency(data.amount, data.codeCurrency)}
                    </span>
                  </h3>

                  <h3 className="font-semibold flex gap-x-2">
                    Método de pago:
                    <span className="font-normal">
                      {translatePaymetMethods(data.paymentWay)}
                    </span>
                  </h3>
                  <h3 className="font-semibold flex gap-x-2">
                    Fecha de pago:
                    <span className="font-normal">
                      {formatDate(data.createdAt)}
                    </span>
                  </h3>
                  {data.operationNumber && (
                    <h3 className="font-semibold flex gap-x-2">
                      Registro de caja:
                      <span className="font-normal">
                        {data.operationNumber}
                      </span>
                    </h3>
                  )}
                  {data.observations && (
                    <h3 className="font-semibold flex flex-col gap-x-2">
                     Observaciones:
                      <span className="font-normal text-slate-500 opacity-80">
                        {data.observations}
                      </span>
                    </h3>
                  )}
                </div>
            </>
          </div>
          <footer className="flex w-full gap-x-3 mt-5 ">
            {/* <Button
              name="Cancelar"
              color="white"
              textColor="blue-800"
              outline
              type="button"
              action={() => close()}
              full
            />

            <Button
              name="Editar"
              color="indigo-700"
              type="submit"
              //action={onSubmit}
              full
            /> */}
          </footer>
        </div>
      </form>
    </>
  );
};
