import { useState, useEffect } from "react";
import { PlusIcon, TruckIcon } from "@heroicons/react/24/outline";
import useServerSupplier from "../../api/useServerSupplier";
import GenericTable, {
  DataTableInterface,
} from "../../components/misc/GenericTable";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import Input from "../../components/forms/Input";
import { SubmitHandler, useForm } from "react-hook-form";
import { BasicType } from "../../interfaces/InterfacesLocal";
import Button from "../../components/misc/Button";
import { BsFiletypeXlsx } from "react-icons/bs";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import AddSupplierWizzard from "./addSupplier/AddSupplierWizzard";
import { useNavigate } from "react-router-dom";
import { SupplierInterfaces } from "../../interfaces/ServerInterfaces";
import DetailSupplier from "./DetailSupplier";
import EditSupplierWizzard from "./editSupplier/EditSupplierWizzard";
export default function ListSuppliers() {
  const navigate = useNavigate();
  const {
    isLoading,
    isFetching,
    allSuppliers,
    paginate,
    getAllSuppliers,
    addSupplier,
    editSupplier,
    deleteSupplier,
  } = useServerSupplier();

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [supplierSelect, setSupplierSelect] =
    useState<SupplierInterfaces | null>(null);
  const [exportModal, setExportModal] = useState(false);

  //Metodo ascociado al filtrado  en DB
  const [filter, setFilter] = useState<
    Record<string, string | number | boolean>
  >({ page: 1 });

  useEffect(() => {
    getAllSuppliers(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  //Data for Table List --------------------------------------------------------------------

  const titles: string[] = ["Nombre", "Dirección", "Teléfono"];
  const displayData: Array<DataTableInterface> = [];

  allSuppliers.map((item) =>
    displayData.push({
      rowId: item.id,
      payload: {
        Nombre: item.name ? item.name : "---",
        Dirección:
          [
            item?.address?.street_1,
            item?.address?.street_2,
            item?.address?.province?.name,
            item?.address?.municipality?.name,
          ]
            .filter((part) => !!part)
            .join(", ") || "---",
        Teléfono: item?.phones[0]?.number ?? "---",
      },
    })
  );

  const rowAction = (id: number) => {
    const current = allSuppliers.find((item) => item.id === id);
    if (current) {
      setSupplierSelect(current);
    }
  };

  const actions = [
    {
      icon: <PlusIcon className="h-7" title="Agregar proveedor" />,
      action: () => setOpenModal(true),
      title: "Nuevo proveedor",
    },
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  let searching = {
    placeholder: "Buscar",
    action: (value: string) => setFilter({ search: value }),
  };

  //--------------------------------------------------------------------------------------------------------

  const paths: PathInterface[] = [
    {
      name: "Proveedores",
    },
  ];

  //--------------------------------------------------------------------------------------

  return (
    <>
      <Breadcrumb
        icon={<TruckIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={titles}
        tableData={displayData}
        rowAction={rowAction}
        actions={actions}
        searching={searching}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
        loading={isLoading}
      />

      {supplierSelect && (
        <Modal
          state={!!supplierSelect}
          close={() => setSupplierSelect(null)}
          size="l"
        >
          <EditSupplierWizzard
            currentSupplier={supplierSelect}
            crud={{
              update: editSupplier,
              del: deleteSupplier,
              isFetching,
              isLoading,
            }}
          />
        </Modal>
      )}

      {openModal && (
        <Modal state={openModal} close={() => setOpenModal(false)} size="m">
          <AddSupplierWizzard /* NewSupplier */
            allSuppliers={allSuppliers}
            addSupplier={addSupplier}
            isFetching={isFetching}
            closeModal={() => setOpenModal(false)}
          />
        </Modal>
      )}

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={filter}
            closeModal={() => setExportModal(false)}
          />
        </Modal>
      )}
    </>
  );
}

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportSuppliers, isLoading } = useServerSupplier();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportSuppliers(filter, data.name, closeModal());
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        name="name"
        label="Nombre del archivo"
        placeholder="Nombre del archivo .xlsx"
        control={control}
        rules={{ required: "Debe indicar un nombre para el archivo" }}
      />
      <div className="flex py-2 justify-end">
        <Button
          type="submit"
          name="Exportar"
          color="slate-600"
          loading={isLoading}
          disabled={isLoading}
        />
      </div>
    </form>
  );
};
