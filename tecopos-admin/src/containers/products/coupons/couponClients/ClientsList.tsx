import React, { useEffect, useState } from "react";
import {
  BasicType,
  SelectInterface,
} from "../../../../interfaces/InterfacesLocal";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../../components/misc/GenericTable";
import { formatDateTime } from "../../../../utils/functions";
import Paginate from "../../../../components/misc/Paginate";
import { BtnActions } from "../../../../components/misc/MultipleActBtn";
import { BsFiletypeXlsx } from "react-icons/bs";
import {
  ClientInterface,
  CouponInterface,
} from "../../../../interfaces/ServerInterfaces";
import useServerCouponClients from "../../../../api/useServerCouponClients";
import Modal from "../../../../components/modals/GenericModal";
import Input from "../../../../components/forms/Input";
import Button from "../../../../components/misc/Button";
import { SubmitHandler, useForm } from "react-hook-form";
import EditOnlineClientContainer from "../../../onlineClients/editClient/EditOnlineClientContainer";
import useServerOnlineClients from "../../../../api/useServerOnlineClients";

const ClientsList = ({ coupon }: { coupon: CouponInterface | null }) => {
  const {
    paginate,
    allClients,
    client,
    getAllClients,
    isLoading,
    isFetching,
    editClient,
    deleteClient,
    getClient,
  } = useServerOnlineClients();

  const [filter, setFilter] = useState<BasicType>({ page: 1 });
  const [editClientModal, setEditClientModal] = useState(false);

  useEffect(() => {
    getAllClients({ coupons: coupon?.code ?? null });
  }, [filter]);

  //Data
  const titles: string[] = [
    "Nombre",
    "Correo electrónico",
    "Teléfono",
    "Dirección",
    "Registro",
    "Forma",
  ];
  const couponClientsDisplay: Array<DataTableInterface> = [];

  allClients.forEach((item) =>
    couponClientsDisplay.push({
      rowId: item.id,
      payload: {
        Nombre:
          item.firstName || item.lastName
            ? `${item?.firstName ?? ""} ${item?.lastName ?? ""}`
            : "-",
        "Correo electrónico": item?.email??"-",
        Teléfono: item.phones[0] ? item.phones[0].number : "-",
        Dirección: item.address ? item.address.street_1 : "-",
        Registro: item?.createdAt ? formatDateTime(item?.createdAt) : "-",
        Forma: item?.registrationWay,
      },
    })
  );

  const sexSelector: SelectInterface[] = [
    {
      id: "female",
      name: "Femenino",
    },
    {
      id: "male",
      name: "Masculino",
    },
  ];

  //Filtros ------------------------------------------------------------------------
  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "select",
      filterCode: "sex",
      name: "Sexo",
      data: sexSelector,
    },
  ];
  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };
  const [exportModal, setExportModal] = useState(false);

  const actions: BtnActions[] = [
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  const rowAction = (e: any) => {
    getClient(e);
    setEditClientModal(true);
  };

  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar cliente",
  };

  return (
    <>
      <GenericTable
        tableTitles={titles}
        tableData={couponClientsDisplay}
        rowAction={rowAction}
        actions={actions}
        loading={isLoading}
        searching={searching}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            couponCode={coupon?.code}
            closeModal={() => setExportModal(false)}
          />
        </Modal>
      )}

      {editClientModal && (
        <Modal state={editClientModal} close={setEditClientModal} size="m">
          <EditOnlineClientContainer
            client={client!}
            editClient={editClient}
            deleteClient={deleteClient}
            isFetching={isFetching}
            isLoading={isLoading}
            callback={()=>setEditClientModal(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default ClientsList;

interface ExportContainer {
  couponCode: string | undefined;
  closeModal: Function;
}

const ExcelFileExport = ({ couponCode, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportCouponsClients, isLoading } = useServerCouponClients();
  //const { stockId } = useParams();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    //stockId && exportStockProducts(stockId, data.name, closeModal());

    exportCouponsClients(couponCode, data.name, closeModal());
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
