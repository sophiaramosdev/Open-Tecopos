import TextArea from "../../../../components/forms/TextArea";
import { useForm, SubmitHandler } from "react-hook-form";
import Button from "../../../../components/misc/Button";
import DateInput from "../../../../components/forms/DateInput";


interface DuplicateInterface {
  action: Function;
  loading:boolean
}

const DuplicateOrderForm = ({action, loading}:DuplicateInterface) => {
  const { control, handleSubmit } = useForm<Record<string, string | number>>();
  const onSubmit: SubmitHandler<Record<string, string | number>> = (data) => {
    action(data);
  };

  //Data for Select in Update case --------------------------------------------------------------
  const statusOpt = [
    { label: "CREADO", value: "CREATED", disabled: true },
    { label: "ACTIVO", value: "ACTIVE" },
    { label: "CERRADO", value: "CLOSED" },
  ];
  //-------------------------------------------------------------------------------------------------

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex h-96">
          <div className="w-full border border-slate-300 p-3 rounded-md ">
            <h3 className="text-lg font font-semibold mb-2 underline">
              Duplicar Orden
            </h3>
            <DateInput
              label="Fecha de Orden"
              name="openDate"
              control={control}
              rules={{ required: "Campo Requerido" }}
            />

            <TextArea
              label="Agregue una nota"
              name="observations"
              control={control}
            />
          </div>
        </div>
        <div className="flex justify-center py-3 px-16 ">
          <Button
            color="slate-600"
            name="Duplicar orden"
            type="submit"
            loading={loading}
            full
          />
        </div>
      </form>
    </>
  );
};

export default DuplicateOrderForm;
