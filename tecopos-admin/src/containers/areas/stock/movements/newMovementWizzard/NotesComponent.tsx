import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import { useContext } from "react";
import { MovementsContext } from "./WizzardContainer";
import AsyncComboBox from "../../../../../components/forms/AsyncCombobox";
import { useAppSelector } from "../../../../../store/hooks";
import useServer from "../../../../../api/useServerMain";

const NotesComponent = () => {
  const { business } = useAppSelector((state) => state.init);
  const {allowRoles: verifyRoles} = useServer();
  const { configurationsKey } = business!;
  const accountModuleActive =
    configurationsKey.find((item) => item.key === "module_accounts")?.value ===
    "true";
  const { watch, control, setCurrentStep, fetching } =
    useContext(MovementsContext);

  const movementType = watch!("movementType");
  const required = ["ADJUST", "OUT", "WASTE"].includes(movementType);

  return (
    <>
      <div className="flex flex-col space-y-3 h-96">
        <div className="w-full h-full border border-slate-300 p-3 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
          <TextArea
            label={`Agregue una nota ${required ? "*" : ""}`}
            name="description"
            control={control}
            rules={{
              required: { value: required, message: "Este campo es requerido" },
            }}
          />
        </div>
        {accountModuleActive &&
          (verifyRoles(['MANAGER_CONTABILITY'])) &&
          movementType === "ENTRY" && (
            <div className="w-full border border-slate-300 p-3 rounded-md flex-grow">
              <AsyncComboBox
                name="accountId"
                label="Cuentas Bancarias"
                control={control}
                dataQuery={{
                  url: "/administration/bank/account",
                  defaultParams: { all_data: true },
                }}
                normalizeData={{ id: "id", name: "name" }}
              />
            </div>
          )}
      </div>
      <div className="grid grid-cols-2 gap-2 py-3 ">
        <Button
          color="blue-700"
          name="Atrás"
          action={() => setCurrentStep!(1)}
          textColor="blue-800"
          full
          outline
        />
        <Button
          color="slate-700"
          name="Finalizar"
          type="submit"
          loading={fetching}
          disabled={fetching}
          full
        />
      </div>
    </>
  );
};

export default NotesComponent;
