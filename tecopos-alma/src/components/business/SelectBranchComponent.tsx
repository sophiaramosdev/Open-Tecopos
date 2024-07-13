import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import AsyncComboBox from "../forms/AsyncCombobox";
import { useParams } from "react-router-dom";
import Button from "../misc/Button";
import useServerBranch from "../../api/useServerBranch";
import { BasicType } from "../../interfaces/LocalInterfaces";

interface BranchSelect {
  manageBranch: {
    addBranch: (
      businessId: string,
      data: BasicType,
      callback?: Function
    ) => void;
    isFetching: boolean;
  };
  currentBranches: number[];
  close: Function;
}

const SelectBranchComponent = ({ manageBranch, currentBranches, close }: BranchSelect) => {
  const { handleSubmit, control } = useForm();
  const { businessId } = useParams();
  const { addBranch, isFetching} = manageBranch;

  const onSubmit: SubmitHandler<Record<string, number>> = (data) => {
    addBranch(businessId!, data, close);
  };
  return (
    <div className="w-full">
      <h5>Insertar negocio hijo</h5>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex gap-2 items-center w-full mt-3"
      >
        <AsyncComboBox
          className="w-full"
          name="branchId"
          dataQuery={{ url: "/control/business" }}
          normalizeData={{ id: "id", name: "name", disabled: currentBranches }}
          control={control}
        />
        <Button
          name="Insertar"
          color="primary"
          textColor="primary"
          type="submit"
          loading={isFetching}
          disabled={isFetching}
          outline
        />
      </form>
    </div>
  );
};

export default SelectBranchComponent;
