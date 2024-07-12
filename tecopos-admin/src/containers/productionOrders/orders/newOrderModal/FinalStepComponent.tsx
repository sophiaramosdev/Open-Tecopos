import TextArea from "../../../../components/forms/TextArea";
import { useForm, SubmitHandler } from "react-hook-form";
import Button from "../../../../components/misc/Button";
import DateInput from "../../../../components/forms/DateInput";
import Select from "../../../../components/forms/Select";

interface NotesInterface {
  action: Function;
  backAction: Function;
  loading?: boolean;
  defaultData?: Record<string, string | number>;
}

const NotesComponent = ({
  action,
  backAction,
  loading,
  defaultData,
}: NotesInterface) => {
  const { control, handleSubmit } = useForm<Record<string, string | number>>();
  const onSubmit: SubmitHandler<Record<string, string | number>> = (data) => {
    action(data);
  };

  //Data for Select in Update case --------------------------------------------------------------
  const statusOpt = [
    {name:"CREADO", id:"CREATED", disabled:true},
    {name:"ACTIVO", id:"ACTIVE"},
    {name:"CERRADO", id:"CLOSED"}
  ]
  //-------------------------------------------------------------------------------------------------

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex h-96">
          <div className="w-full border border-slate-300 p-3 rounded-md ">
            <div className="grid grid-cols-3 gap-3">
              <div className={`${defaultData ? "col-span-2" : "col-span-2"}`}>
              <DateInput
                label="Fecha de Orden"
                name="openDate"
                control={control}
                rules={{ required: "Campo Requerido" }}
                defaultValue={defaultData ? defaultData.openDate : undefined}
              />
              </div>
              
              {defaultData && <div className="col-span-1">
              <Select data={statusOpt} label="Estado de la orden" control={control} name="status" defaultValue={defaultData ? defaultData.status : undefined} />
              </div>}
              
            </div>
            <TextArea
              label="Agregue una nota"
              name="observations"
              control={control}
              defaultValue={defaultData ? defaultData.observations : undefined}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 py-3 ">
          <Button
            color="blue-700"
            name="Atrás"
            action={backAction}
            textColor="blue-800"
            full
            outline
          />
          <Button
            color="slate-700"
            name="Finalizar"
            type="submit"
            loading={loading}
            full
          />
        </div>
      </form>
    </>
  );
};

export default NotesComponent;
