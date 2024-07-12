import { Cog8ToothIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { GrAdd, GrTrash } from "react-icons/gr";
import useServerBusiness from "../../api/useServerBusiness";
import CurrencyAmountInput from "../../components/forms/CurrencyAmountInput";
import Input from "../../components/forms/Input";
import TextArea from "../../components/forms/TextArea";
import AlertContainer from "../../components/misc/AlertContainer";
import Button from "../../components/misc/Button";
import Fetching from "../../components/misc/Fetching";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../components/misc/GenericTable";
import { BtnActions } from "../../components/misc/MultipleActBtn";
import Modal from "../../components/modals/GenericModal";
import { BasicType, SelectInterface } from "../../interfaces/InterfacesLocal";
import { Regions } from "../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../store/hooks";
import { cleanObj, formatCurrency } from "../../utils/helpers";
import Breadcrumb, {
  PathInterface,
} from "../../components/navigation/Breadcrumb";
import AsyncComboBox from "../../components/forms/AsyncCombobox";
import Paginate from "../../components/misc/Paginate";

const RegionConfig = () => {
  const {
    getAllRegions,
    allRegions,
    paginate,
    addRegion,
    editRegion,
    deleteRegion,
    isFetching,
    isLoading,
  } = useServerBusiness();
  const { availableCurrencies } = useAppSelector(
    (state) => state.init.business!
  );

  const initValue = { state: false };

  const [filter, setFilter] = useState<BasicType>();

  const [formModal, setFormModal] = useState<{
    state: boolean;
    data?: Regions;
  }>(initValue);

  useEffect(() => {
    getAllRegions(filter);
  }, [filter]);

  //Data for table ---------------------------------------------------------------
  const tableTitle = [
    "Sitio",
    "Precio de envío",
    "Provincia",
    "Municipio",
    "Descripción",
  ];

  const dataTable: DataTableInterface[] = allRegions.map((item) => ({
    rowId: item.id,
    payload: {
      Sitio: item.name,
      "Precio de envío": formatCurrency(
        item.price.amount,
        item.price.codeCurrency
      ),
      Provincia: item.province?.name ?? "",
      Municipio: item.municipality?.name ?? "",
      Descripción: item.description,
    },
  }));

  const actions: BtnActions[] = [
    {
      title: "Agregar región",
      action: () => setFormModal({ state: true }),
      icon: <GrAdd />,
    },
  ];

  const rowActions = (id: number) => {
    const currentRegion = allRegions.find((item) => item.id === id);
    setFormModal({ state: true, data: currentRegion });
  };

  const availableFilters: FilterOpts[] = [
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
        defaultParams: { countryId: 54 },
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
    {
      format: "select",
      filterCode: "codeCurrency",
      name: "Moneda",
      data: availableCurrencies.map((currency) => ({
        id: currency.code,
        name: currency.code,
      })),
    },
  ];

  const filterAction = (data: BasicType) => setFilter(data);

  //--------------------------------------------------------------------------------

  //CRUD Form manage -------------------------------------------------------------------
  const add = (data: BasicType) => {
    addRegion(data, () => setFormModal(initValue));
  };

  const upd = (id: number, data: BasicType) => {
    editRegion(id, data, () => setFormModal(initValue));
  };

  const del = (id: number) => {
    deleteRegion(id, () => setFormModal(initValue));
  };

  //------------------------------------------------------------------------------------

  //Breadcrumb ----------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Configuraciones",
    },
    {
      name: "Regiones de envío",
    },
  ];
  //-----------------------------------------------------------------------------------------

  return (
    <div>
      <Breadcrumb
        icon={<Cog8ToothIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={tableTitle}
        tableData={dataTable}
        actions={actions}
        rowAction={rowActions}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
        loading={isLoading}
      />
      {formModal.state && (
        <Modal state={formModal.state} close={() => setFormModal(initValue)}>
          <FormRegion
            action={formModal.data ? upd : add}
            formData={formModal.data}
            isFetching={isFetching}
            delRegion={del}
          />
        </Modal>
      )}
    </div>
  );
};

//====================================================================================

interface RegionsProps {
  formData?: Regions;
  isFetching: boolean;
  action: Function;
  delRegion: Function;
}

const FormRegion = ({
  action,
  isFetching,
  formData,
  delRegion,
}: RegionsProps) => {
  const { control, handleSubmit, watch } = useForm();
  const { business } = useAppSelector((state) => state.init);

  const [delAlert, setDelAlert] = useState(false);

  const currencies =
    business?.availableCurrencies.map((item) => item.code) ?? [];

  const onSubmit: SubmitHandler<BasicType> = (data) => {
    formData
      ? action(formData.id, cleanObj(data))
      : action(cleanObj(data));
  };

  const provinceId = watch("provinceId") ?? formData?.province?.id;

  return (
    <div>
      {isFetching && <Fetching />}
      {formData && (
        <div className="absolute top-5 right-10">
          <Button
            color="red-600"
            textColor="red-600"
            icon={<TrashIcon className="text-red-500 h-5" />}
            action={() => setDelAlert(true)}
            outline
          />
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
        <Input
          name="name"
          label="Nombre"
          control={control}
          defaultValue={formData?.name}
          rules={{ required: "Este campo es requerido" }}
        />
        <CurrencyAmountInput
          name="price"
          control={control}
          label="Precio de envío"
          currencies={currencies}
          defaultValue={formData?.price}
          rules={{ required: "Este campo es requerido" }}
        />
        <AsyncComboBox
          name="provinceId"
          dataQuery={{
            url: "/public/provinces",
            defaultParams: { countryId: 54 },
          }}
          normalizeData={{ id: "id", name: "name" }}
          control={control}
          label="Provincia *"
          defaultItem={
            formData?.province
              ? {
                  id: formData?.province.id,
                  name: formData.province.name,
                }
              : undefined
          }
          rules={{ required: "* Requerido" }}
        />
        <AsyncComboBox
          name="municipalityId"
          dataQuery={{
            url: "/public/municipalities",
            defaultParams: { countryId: 54, provinceId },
          }}
          normalizeData={{ id: "id", name: "name" }}
          dependendValue={{ provinceId }}
          control={control}
          label="Municipio *"
          defaultItem={
            formData?.municipality
              ? {
                  id: formData?.municipality.id,
                  name: formData.municipality.name,
                }
              : undefined
          }
          rules={{ required: "* Requerido" }}
        />
        <TextArea
          name="description"
          label="Descripción"
          control={control}
          defaultValue={formData?.description}
        />
        <div className="flex justify-end py-2">
          <Button
            name={formData ? "Actualizar" : "Agregar"}
            color="slate-600"
            type="submit"
          />
        </div>
      </form>

      {delAlert && (
        <Modal state={delAlert} close={setDelAlert}>
          <AlertContainer
            title={`Eliminar ${formData?.name}`}
            text="Seguro desea eliminar esta región?"
            onAction={() => {
              delRegion(formData?.id);
              setDelAlert(false);
            }}
            onCancel={setDelAlert}
          />
        </Modal>
      )}
    </div>
  );
};

export default RegionConfig;
