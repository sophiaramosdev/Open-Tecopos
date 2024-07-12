/* eslint-disable array-callback-return */
/* eslint-disable react-hooks/exhaustive-deps */
import { PlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, createContext } from "react";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../components/misc/GenericTable";
import Paginate from "../../components/misc/Paginate";
import Modal from "../../components/modals/GenericModal";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import AddClientWizzard from "./addClient/AddClientWizzard";
import { BsFiletypeXlsx } from "react-icons/bs";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../components/forms/Input";
import Button from "../../components/misc/Button";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import useServerOnlineClients from "../../api/useServerOnlineClients";
import { formatCalendar } from "../../utils/helpers";
import { translateRegWay } from "../../utils/translate";
import EditOnlineClientContainer from "./editClient/EditOnlineClientContainer";
import {
  OnlineClientInterface,
  OrderInterface,
  PaginateInterface,
} from "../../interfaces/ServerInterfaces";
import { Client } from "../../interfaces/Interfaces";

interface ClientContex {
  getMainClientInfo: Function;
  clientOrders: OrderInterface[];
  isLoading: boolean;
  isEdit: boolean;
  isGetClient: boolean;
  paginate: PaginateInterface;
  setAllOrderState: Function;
  allOrdes: OrderInterface[];
  editOrder: Function;
  fetchingOrder: boolean;
  updateAllOrderState: Function;
  getClient: (id:number|string) => Promise<void>;
  clientServer : OnlineClientInterface | null
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ClientContex = createContext<Partial<ClientContex>>({});

const OnlineClientsContainer = () => {
  const {
    getAllClients,
    addClient,
    editClient,
    deleteClient,
    allClients,
    paginate,
    isLoading,
    isFetching,
    getMainClientInfo,
    clientOrders,
    getClient,
    client : clientServer,
    isEdit,
    isGetClient
  } = useServerOnlineClients();


  const [filter, setFilter] = useState<
    Record<string, string | number | boolean | null>
  >({ page: 1 });
  const [addClientModal, setAddClientModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [client, setClient] = useState<OnlineClientInterface | null>(null);

  useEffect(() => {
    getAllClients(filter);
  }, [filter]);

  //Data for table ------------------------------------------------------------------------
  const tableTitles = [
    "Nombre",
    "Carnet de Identidad",
    "Correo electrónico",
    "Categoría",
    "Teléfono",
    "Municipio",
    "Provincia",
    "País",
    "Fecha de registro",
    "Forma de registro",
  ];
  const tableData: DataTableInterface[] = [];
  allClients.map((item) => {
    tableData.push({
      rowId: item.id,
      payload: {
        Nombre: `${item?.firstName ?? ""} ${item?.lastName ?? ""}`,
        "Carnet de Identidad": item?.ci ?? "",
        "Correo electrónico": item?.email,
        Categoría: item?.customerCategory?.name,
        Teléfono: item?.phones?.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <p>{item.number}</p>
          </div>
        )),
        Municipio: item?.address?.municipality?.name,
        Provincia: item?.address?.province?.name,
        País: item?.address?.country?.name,
        "Fecha de registro": formatCalendar(item.createdAt),
        "Forma de registro": translateRegWay(item?.registrationWay),
      },
    });
  });

  const searching = {
    action: (search: string) => setFilter({ ...filter, search }),
    placeholder: "Buscar cliente",
  };

  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Agregar cliente",
      action: () => setAddClientModal(true),
    },
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  //------------------Old ----------------- --->
  // const rowAction = (id: number) => {
  //   if (verifyRoles(["ADMIN"])) {
  //     navigate(`/clients/${id}`);
  //   }else{
  //     const current = allClients.find(cust=>cust.id === id);
  //     if(current) setClient(current)
  //   }
  // };
  //------------------Old ----------------- --->
  const rowAction = (id: number) => {
    //if (verifyRoles(["ADMIN"])) {
    // setAllOrderClient(true);
    const current = allClients.find((cust) => cust.id === id);
    if (current) setClient(current);
    //}
  };

  //Filters-----------------------------------
  const registrationSelector: SelectInterface[] = [
    {
      id: "WOO",
      name: "WOO",
    },
    {
      id: "ONLINE",
      name: "ONLINE",
    },
    {
      id: "POS",
      name: "POS",
    },
  ];

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

  const availableFilters: FilterOpts[] = [
    //País
    {
      format: "select",
      filterCode: "countryId",
      name: "País",
      asyncData: {
        url: "/public/countries",
        idCode: "id",
        dataCode: "name",
      },
    },
    //Provincia
    {
      format: "select",
      filterCode: "provinceId",
      name: "Provincia",
      dependentOn: "countryId",
      asyncData: {
        url: "/public/provinces",
        idCode: "id",
        dataCode: "name",
      },
    },
    //Municipio
    {
      format: "select",
      filterCode: "municipalityId",
      name: "Municipio",
      dependentOn: "provinceId",
      asyncData: {
        url: "/public/municipalities",
        idCode: "id",
        dataCode: "name",
      },
    },
    //Forma de registro
    {
      format: "select",
      filterCode: "registrationWay",
      name: "Forma de registro",
      data: registrationSelector,
    },
    //Nacimiento desde
    {
      format: "datepicker",
      filterCode: "birthFrom",
      name: "Fecha de nacimiento desde",
    },
    //Nacimiento hasta
    {
      format: "datepicker",
      filterCode: "birthTo",
      name: "Fecha de nacimiento hasta",
    },
    //Forma de registro
    {
      format: "select",
      filterCode: "sex",
      name: "Sexo",
      data: sexSelector,
    },
  ];

  const filterAction = (data: BasicType) => setFilter(data);
  //----------------------------------------------------------------------------------

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Clientes",
    },
    {
      name: "Todos",
    },
  ];
  //------------------------------------------------------------------------------------
  return (
    <div>
      <Breadcrumb
        icon={<UsersIcon className="h-6 text-gray-500" />}
        paths={paths}
      />

      <div className="sm:grid grid-cols-12 gap-3">
        {/* <SideNav
          tabs={tags}
          action={(to: string) => setcurrentClientTab(to)}
          className="col-span-4 sm:col-span-2"
        /> */}

        <div className="sm:col-span-12 ">
          <GenericTable
            tableData={tableData}
            tableTitles={tableTitles}
            loading={isLoading}
            searching={searching}
            actions={actions}
            rowAction={rowAction}
            filterComponent={{ availableFilters, filterAction }}
            paginateComponent={
              <Paginate
                action={(page: number) => setFilter({ ...filter, page })}
                data={paginate}
              />
            }
            showSpecificColumns={true}
            specificColumnSpaceToSave={"clients"}
          />
        </div>
      </div>

      {/* {allOrderClient && (
        <Modal state={allOrderClient} close={setAllOrderClient} size="l">
          <DetailOnlineClientContainerV2 clientId={client?.id} />
        </Modal>
      )} */}

      {addClientModal && (
        <Modal state={addClientModal} close={setAddClientModal} size="m">
          <AddClientWizzard
            addClient={addClient}
            isFetching={isFetching}
            closeModal={() => setAddClientModal(false)}
          />
        </Modal>
      )}
      <ClientContex.Provider
        value={{ getMainClientInfo, clientOrders, paginate, isLoading ,getClient,clientServer,isEdit,isGetClient}}
        // value={{ getMainClientInfo, clientOrders, paginate, isLoading }}
      >
        {client && (
          <Modal state={!!client} close={() => setClient(null)} size="l">
            <EditOnlineClientContainer
              client={client!}
              editClient={(id: number, data: any) => {
                editClient(id, data, setClient);
              }}
              deleteClient={deleteClient}
              isFetching={isFetching}
              isLoading={isLoading}
            />
          </Modal>
        )}
      </ClientContex.Provider>

      {exportModal && (
        <Modal state={exportModal} close={setExportModal}>
          <ExcelFileExport
            filter={filter}
            closeModal={() => setExportModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportClients, isLoading } = useServerOnlineClients();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportClients(filter, data.name, closeModal());
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

export default OnlineClientsContainer;
