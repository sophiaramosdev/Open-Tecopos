import { useContext } from "react";
import { AddUserCtx } from "./NewUserWizzard";
import { SelectInterface } from "../../../../interfaces/InterfacesLocal";
import { useAppSelector } from "../../../../store/hooks";
import MultiSelect from "../../../../components/forms/Multiselect";
import Button from "../../../../components/misc/Button";

const UserRolesComponent = () => {
  
  const { control, beforeStep, watch } = useContext(AddUserCtx);
  const { roles, areas } = useAppSelector((state) => state.nomenclator);
  const {user} = useAppSelector(state=>state.init);

  const userType = watch && watch("type");
  const currentRoles = watch ? watch("roles") : [];

  const dataRoles: SelectInterface[] = roles
    .filter((item) =>{
      const managerRoles = !!user?.roles.find(item=>["OWNER", "GROUP_OWNER"].includes(item.code)) ? ["ADMIN"] : [];
      return userType === "worker"
        ? !["OWNER", "ADMIN", "GROUP_OWNER"].includes(item.code)
        : managerRoles.includes(item.code)
    })
    .map((item) => ({ id: item.code, name: item.name }));

    
  const salesAreas: SelectInterface[] = areas
    .filter((item) => item.type === "SALE")
    .map((item) => ({ id: item.id, name: item.name }));

     const productionAreas: SelectInterface[] = areas
     .filter((item) => item.type === "MANUFACTURER")
     .map((item) => ({ id: item.id, name: item.name })); 

     const stockAreas: SelectInterface[] = areas
     .filter((item) => item.type === "STOCK")
     .map((item) => ({ id: item.id, name: item.name })); 

     const accessPointAreas: SelectInterface[] = areas
     .filter((item) => item.type === "ACCESSPOINT")
     .map((item) => ({ id: item.id, name: item.name }));

  return (
    <>
      <div className=" flex flex-col gap-3 h-96 pt-3">
        <MultiSelect
          name="roles"
          data={dataRoles}
          label="Roles"
          control={control}
        />
        {Array.isArray(currentRoles) &&
          currentRoles.some(value=> ["MANAGER_SALES","WEITRESS"].includes(value)) && (
            <MultiSelect
              name="allowedSalesAreas"
              data={salesAreas}
              label="Áreas de venta"
              control={control}
            />
          )}
          {Array.isArray(currentRoles) &&
          currentRoles.includes("MANAGER_PRODUCTION") && (
            <MultiSelect
              name="allowedManufacturerAreas"
              data={productionAreas}
              label="Áreas de producción"
              control={control}
            />
          )}
          {Array.isArray(currentRoles) &&
          currentRoles.includes("MANAGER_AREA") && (
            <MultiSelect
              name="allowedStockAreas"
              data={stockAreas}
              label="Almacenes"
              control={control}
            />
          )}
          {Array.isArray(currentRoles) &&
          currentRoles.some(value=> ["MANAGER_ACCESS_POINT"].includes(value)) && (
            <MultiSelect
              name="allowedAccessPointAreas"
              data={accessPointAreas}
              label="Puntos de acceso"
              control={control}
            />
          )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <Button
          name="Atrás"
          color="indigo-600"
          textColor="slate-700"
          action={() => beforeStep && beforeStep()}
          outline
        />
        <Button name="Finalizar" color="slate-600" type="submit" />
      </div>
    </>
  );
};

export default UserRolesComponent;
