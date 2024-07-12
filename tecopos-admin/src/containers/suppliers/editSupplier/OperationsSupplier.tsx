
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Movement, SupplierInterfaces } from "../../../interfaces/ServerInterfaces";
import GenericTable, { DataTableInterface } from "../../../components/misc/GenericTable";
import { translateMeasure,  } from '../../../utils/translate';
import MovementsTypeBadge from "../../../components/misc/badges/MovementsTypeBadge";
import moment from "moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinusCircle } from "@fortawesome/free-solid-svg-icons";

interface WizzardInterface{
  isLoading: boolean;
  currentSupplier: SupplierInterfaces | null;
  supplierOperation: Movement[];
}

const OperationsSupplier = ({isLoading, currentSupplier, supplierOperation}:WizzardInterface) => {

  const {control, handleSubmit} = useForm({mode:"onChange"})
  const { fields, append, remove } = useFieldArray({
    control,
    name: "phones",
  });

  useEffect(() => {
    const phones = currentSupplier?.phones.map(item=>({number:item.number, description:item.description}));
    append(phones)

  }, [])

  const tableTitles = ["Nombre", "Operación", "Cantidad", "Fecha", "Usuario"];
    const displayData: Array<DataTableInterface> = [];

    supplierOperation?.map(item =>
        displayData.push({
            rowId: item.id,
            payload: {
              Nombre: item.product.name,
              Operación: <MovementsTypeBadge operation={item.operation} />,
              Cantidad: `${item.quantity} ${translateMeasure(
                item.product.measure
              )}`,
              Fecha: `${moment(item.createdAt).format("DD/MM/YYYY hh:mm A")}`,
              Usuario: `${
                item.movedBy !== null ? (
                  item.movedBy.displayName
                ) : (
                  <FontAwesomeIcon
                    icon={faMinusCircle}
                    className="text-gray-400 h-4"
                  />
                )
              }`,
            },
        })
    );
 
  return (
    <div>
      
        <div className="h-96">
          
        <GenericTable
          tableTitles={tableTitles}
          tableData={displayData}
          
          /* paginateComponent={
              <Paginate action={(page: number) => setFilter({...filter,page})} data={paginate} />
          } */
          loading={ isLoading }
            />
      </div>
  
    </div>
  );
};

export default OperationsSupplier;
