import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../../../../store/hooks";
import Select from "../../../../../components/forms/Select";
import Button from "../../../../../components/misc/Button";
import ReceiptContext from "../ReceiptContext";

const DispatchModal = ({close}:{close:Function}) => {
  const { control, handleSubmit } = useForm();
  const { areas } = useAppSelector((state) => state.nomenclator);
  const { receipt, dispatchReceipt, isFetching, updateOuterList } = useContext(ReceiptContext);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    const callback = ()=>{
      updateOuterList!(receipt?.id, {status:"DISPATCHED"});
      close();
    }
    dispatchReceipt!(receipt!.id, data, callback);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Select
        data={areas}
        name="stockAreaToId"
        control={control}
        label="Área destino"
        placeholder="Seleccione un área destino"
        rules={{required: true}}
      />
      <div className="flex justify-end w-full py-3">
        <Button
          name="Aceptar"
          color="slate-600"
          type="submit"
          loading={isFetching}
        />
      </div>
    </form>
  );
};

export default DispatchModal;
