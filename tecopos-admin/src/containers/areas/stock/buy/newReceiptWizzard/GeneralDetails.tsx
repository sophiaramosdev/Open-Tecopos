import { useContext } from "react";
import ReceiptContext from "../ReceiptContext";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import TextArea from "../../../../../components/forms/TextArea";
import { useAppSelector } from "../../../../../store/hooks";
import Select from "../../../../../components/forms/Select";
import { SelectInterface } from "../../../../../interfaces/InterfacesLocal";

const Details = () => {
  const { control } = useContext(ReceiptContext);
  const { areas } = useAppSelector((state) => state.nomenclator);
  const areasSelector:SelectInterface[] = areas.map(item=>({id:item.id, name:item.name}))
  return (
    <div className="p-3 grid grid-cols-2 gap-3">
      <Select
        data={areasSelector}
        name="stockAreaTo"
        control={control}
        label="Área de destino"
      />
      <AsyncComboBox
        name="accountId"
        dataQuery={{
          url: "/administration/bank/account",
        }}
        normalizeData={{ id: "id", name: "name" }}
        control={control}
        label="Extraer fondos de"
      />
      <div className="col-span-2">
        <TextArea
          name="observations"
          control={control}
          placeholder="Observaciones"
        />
      </div>
    </div>
  );
};

export default Details;
