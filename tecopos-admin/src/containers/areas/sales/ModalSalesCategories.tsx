import React from "react";
import Checkbox from "../../../components/forms/Checkbox";
import { BasicNomenclator } from "../../../interfaces/ServerInterfaces";
import Button from "../../../components/misc/Button";

interface SalesCategories {
  update: Function;
  data: BasicNomenclator[];
  selected: BasicNomenclator[];
  setSelected: Function;
  closeModal: Function;
  areaId: number;
  isFetching: boolean;
}

const ModalSalesCategories = ({
  selected,
  setSelected,
  update,
  data,
  closeModal,
  areaId,
  isFetching
}: SalesCategories) => {
  return (
    <div>
      <h2 className="text-lg text-gray-700 font-semibold mb-5 text-center underline">
        Categorías de venta
      </h2>
      <div className="h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-300">
        <Checkbox data={data} selected={selected} setSelected={setSelected} />
      </div>
      <div className="py-3 flex justify-end">
        <Button
          name="Aceptar"
          color="slate-600"
          action={() =>
            update(
              areaId,
              { categories: selected.map((item) => item.id) },
              closeModal
            )
          }
          disabled={isFetching}
          loading={isFetching}
        />
      </div>
    </div>
  );
};

export default ModalSalesCategories;
