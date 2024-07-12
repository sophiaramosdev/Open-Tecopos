import { useContext } from "react";
import Button from "../../../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import ReceiptContext from "../ReceiptContext";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";

const AccountModal = ({close}:{close:Function}) => {
  const { control, handleSubmit } = useForm();
  const { receipt, extractFoundsFrom, isFetching } = useContext(ReceiptContext);

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    extractFoundsFrom!(receipt!.id, data, close);
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <AsyncComboBox
        dataQuery={{
          url: "/administration/bank/account",
          defaultParams: { page: 1 },
        }}
        normalizeData={{ id: "id", name: ["name", "address"] }}
        name="accountId"
        control={control}
        label="Área destino"
        placeholder="Seleccione un cuenta"
        rules={{required:true}}
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

export default AccountModal;
