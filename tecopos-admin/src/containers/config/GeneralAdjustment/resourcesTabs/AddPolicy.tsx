/* eslint-disable react-hooks/exhaustive-deps */
import { TrashIcon } from "@heroicons/react/24/outline";
import Button from "../../../../components/misc/Button";
import TextArea from "../../../../components/forms/TextArea";
import Toggle from "../../../../components/forms/Toggle";
import {
  Context,
  ContextType,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  translatePolicyFrequencyToSp,
} from "./DiscountPolicy";
import { ReservationPolicy } from "../../../../interfaces/ServerInterfaces";
import { CancelationContext } from "./CancellationPolicy";
import Modal from "../../../../components/misc/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import Input from "../../../../components/forms/Input";
import Select from "../../../../components/forms/Select";

interface Props {
  title: string;
  action?: Function;
  defaultValue?: ReservationPolicy | null;
  context: Context<ContextType<typeof CancelationContext>>;
  type: "discount" | "cancellation";
}
const AddPolicy = ({
  defaultValue,
  action = () => {},
  context,
  title,
  type,
}: Props) => {
  const { isFetching, control, reset, watch = () => {} } = useContext(context);
  const [openAlert, setOpenAlert] = useState<boolean>(false);

  const frequencies = [
    { id: "Días", name: "Días" },
    { id: "Semanas", name: "Semanas" },
    { id: "Meses", name: "Meses" },
  ];
  useEffect(() => {
    return () => {
      reset && reset();
    };
  }, []);

  const validateFrequency = (value: string) => {
    const frequency = watch("frequency");
    if (frequency === "Días" && parseInt(value) > 365) {
      return "El valor máximo para la frecuencia 'Días' es 365.";
    }
    if (frequency === "Semanas" && parseInt(value) > 4) {
      return "El valor máximo para la frecuencia 'Semanas' es 4.";
    }
    if (frequency === "Meses" && parseInt(value) > 12) {
      return "El valor máximo para la frecuencia 'Meses' es 12.";
    }
    return true;
  };

  const quantity = watch("quantity");
  const frequency = watch("frequency");
  const discount = watch("discount");

  const textExample = useMemo(() => {
    const message = type === "cancellation" ? "cancele" : "realice";

    return (
      <p>
        Aplicar un descuento del{" "}
        <span className="font-semibold">{discount ?? "__"}%</span> cuando se {" "}
        {message} una reservación con
        <span className="font-semibold"> {quantity ?? "__"} </span>
        <span className="font-semibold"> {frequency ?? "__"} </span>
        de antelación.
      </p>
    );
  }, [quantity, frequency, discount]);

  return (
    <div className="mt-5 md:mt-0 px-5">
      <div className="flex justify-end mt-2">
        <Button
          icon={<TrashIcon className="w-5 text-red-500 cursor-pointer" />}
          color="gray-400"
          textColor="slate-600"
          action={() => setOpenAlert(true)}
          outline
        />
      </div>
      <div className=" sm:rounded-md sm:overflow-visible">
        <div className=" py-5 bg-white space-y-6   mx-auto">
          <header>
            <h3 className="font-semibold text-xl text-center">{title}</h3>{" "}
          </header>
          <div className="flex flex-col gap-y-5">
            <p>{textExample}</p>
            <Input
              label="Frecuencia"
              name="quantity"
              type="number"
              control={control}
              defaultValue={defaultValue?.quantity}
              rules={{
                validate: {
                  validateFrequency,
                },
                required: "Este campo es requerido",
              }}
            />
            <Select
              label="Criterio"
              name="frequency"
              control={control}
              data={frequencies}
              rules={{
                required: "Este campo es requerido",
              }}
              defaultValue={
                defaultValue ?
                translatePolicyFrequencyToSp(defaultValue?.frequency) : frequencies[0].id
              }
            />
          </div>
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-6">
              <Input
                label=" % Descuento"
                name="discount"
                type="number"
                maxLength={2}
                control={control}
                defaultValue={defaultValue?.discount}
                rules={{
                  validate: {
                    check: (value) => {
                      if (value > 100 || value < 0) {
                        return "El % no debe ser mayor a 100 ni menor que 0";
                      }
                      return true;
                    },
                  },
                  required: "Este campo es requerido",
                }}
              />
            </div>
          </div>

          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <TextArea
              label="Descripción"
              name="description"
              placeholder="Descripción de la política"
              control={control}
              defaultValue={defaultValue && defaultValue.description}
            />
          </div>

          <div>
            <Toggle
              title="Activo"
              name="isActive"
              control={control}
              defaultValue={defaultValue?.isActive ?? true}
            />
          </div>

          <div className="flow-root  pt-6 pb-4 px-4 py-3 sm:px-6">
            <div className="float-right">
              <Button
                color="slate-700"
                type="submit"
                name={`${defaultValue ? "Actualizar" : "Agregar"}`}
                loading={isFetching}
                disabled={isFetching}
              />
            </div>
          </div>
        </div>
        {openAlert && (
          <div className="max-w-sm">
            <Modal state={openAlert} close={setOpenAlert}>
              <AlertContainer
                title={`Eliminar política`}
                onAction={action}
                onCancel={() => setOpenAlert(false)}
                text="¿Seguro que desea eliminar esta política?"
                loading={isFetching}
              />
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPolicy;
