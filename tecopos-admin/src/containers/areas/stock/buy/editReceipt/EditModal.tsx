import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Button from "../../../../../components/misc/Button";
import ReceiptContext from "../ReceiptContext";
import TextArea from "../../../../../components/forms/TextArea";

const EditModal = ({close}:{close:Function}) => {
  const { control, handleSubmit } = useForm();
  const { receipt, updateReceipt, isFetching } = useContext(ReceiptContext);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    updateReceipt!(receipt!.id, data, close);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextArea
        name="observations"
        control={control}
        label="Observaciones"
        placeholder="Detalles del informe de recepción"
        rules={{required: true}}
        defaultValue={receipt?.observations}
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

export default EditModal;
