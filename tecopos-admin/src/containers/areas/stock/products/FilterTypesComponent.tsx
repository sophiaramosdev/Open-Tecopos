import React, { useState, useEffect } from "react";
import Checkbox, { CheckboxData } from "../../../../components/forms/CustomCheckbox";
import Button from "../../../../components/misc/Button";

interface FilterTypesProps {
  selectedFilter: number[];
  setSelectedFilter: Function;
  availables:CheckboxData[]
}

const FilterTypesComponent = ({
  selectedFilter,
  setSelectedFilter,
  availables
}: FilterTypesProps) => {
  const [selected, setSelected] = useState<CheckboxData[]>([]);
  

  useEffect(() => {
    setSelected(
      availables.filter((item) => selectedFilter.includes(Number(item.value)))
    );
  }, []);

  return (
    <div className="grid grid-cols-1 h-full">
      <Checkbox
        data={availables}
        selected={selected}
        setSelected={setSelected}
        show="col"
      />

      <div className="py-3 w-full self-end">
        <Button
          name="Aceptar"
          color="slate-600"
          action={() => setSelectedFilter(selected.map((item) => item.value))}
          full
        />
      </div>
    </div>
  );
};

export default FilterTypesComponent;
