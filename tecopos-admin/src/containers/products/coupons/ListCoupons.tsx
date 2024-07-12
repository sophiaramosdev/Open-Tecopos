import {
  MegaphoneIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import useServerCoupons from "../../../api/useServerCoupons";
import GenericTable, {
  DataTableInterface,
  FilterOpts,
} from "../../../components/misc/GenericTable";
import { BtnActions } from "../../../components/misc/MultipleActBtn";
import Paginate from "../../../components/misc/Paginate";
import Modal from "../../../components/modals/GenericModal";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
// --------------------------------------
import NewWizardContainer from "./newCouponModal/NewWizardContainer";
// --------------------------------------
import { BsFiletypeXlsx } from "react-icons/bs";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../components/forms/Input";
import Button from "../../../components/misc/Button";
import {
  BasicType,
  SelectInterface,
} from "../../../interfaces/InterfacesLocal";
import CouponDiscountTypeBadge from "../../../components/misc/badges/CouponDiscountTypeBadge";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "../../../utils/functions";
import { getCouponTypes } from "../../../utils/stylesHelpers";
import DetailCouponContainer from "./DetailCouponContainer";

export const ListCoupons = () => {
  const {
    paginate,
    getAllCoupons,
    allCoupons,
    addCoupon,
    outLoading,
    isFetching,
    updateCouponsState
  } = useServerCoupons();

  const [filter, setFilter] = useState<BasicType>({ page: 1 });
  const [detailModal, setDetailModal] = useState<number | null>(null);

  //----------------------------------------------------------------------------------------------------

  const [newCouponModal, setNewCouponModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    getAllCoupons(filter);
  }, [filter]);

  //Action after click in RowTable
  const rowAction = (id: number) => setDetailModal(id);

  //Data to display in Table------------------------------------------------------------------
  //Data
  const titles: string[] = [
    "Código",
    "Tipo",
    "Importe",
    "Fecha de caducidad",
    "Descripción",
  ];
  const couponDisplay: Array<DataTableInterface> = [];
  allCoupons.map((item) =>
    couponDisplay.push({
      rowId: item.id,
      payload: {
        Código: item?.code,
        Tipo: <CouponDiscountTypeBadge type={item.discountType} />,
        Importe: item.amount,
        "Fecha de caducidad": formatDateTime(item?.expirationAt),
        Descripción: (
          <p className="text-left ml-16 pl-20">{item?.description}</p>
        )
      },
    })
  );

  const actions: BtnActions[] = [
    {
      title: "Añadir Cupón",
      action: () => setNewCouponModal(true),
      icon: <PlusIcon className="h-5" />,
    },
    {
      title: "Exportar a excel",
      action: () => setExportModal(true),
      icon: <BsFiletypeXlsx />,
    },
  ];

  //--------------------------------------------------------------------------------------------------
  const discountTypes = getCouponTypes("PERCENT,FIXED_PRODUCT,FIXED_CART");

  //Filtros ------------------------------------------------------------------------
  const dicountTypeSelectorData: SelectInterface[] =
    discountTypes.map((item) => ({ id: item.value, name: item.title })) ?? [];
  const availableFilters: FilterOpts[] = [
    //Filter by productCategories index 0
    {
      format: "input",
      filterCode: "amountFrom",
      name: "Importe desde",
    },
    {
      format: "input",
      filterCode: "amountTo",
      name: "Importe hasta",
    },
    {
      format: "select",
      filterCode: "discountType",
      name: "Tipo de Descuento",
      data: dicountTypeSelectorData,
    },
    {
      format: "datepicker",
      filterCode: "expirationAt",
      name: "Fecha de expiración",
    },
    {
      format: "boolean",
      filterCode: "freeShipping",
      name: "Envío Gratis",
    },

    {
      format: "boolean",
      filterCode: "individualUse",
      name: "Uso Individual",
    },
  ];

  const filterAction = (data: BasicType | null) => {
    data ? setFilter({ ...filter, ...data }) : setFilter({ page: 1 });
  };

  //---------------------------------------------------------------------------------

  //Breadcrumb ---------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Mis Productos",
    },
    {
      name: "Cupones",
    },
  ];
  //------------------------------------------------------------------------------------

  const searching = {
    action: (search: string | null) =>
      setFilter(search ? { search } : { page: 1 }),
    placeholder: "Buscar Cupón",
  };

  return (
    <>
      <Breadcrumb
        icon={<ShoppingBagIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableTitles={titles}
        tableData={couponDisplay}
        rowAction={rowAction}
        actions={actions}
        loading={outLoading}
        searching={searching}
        filterComponent={{ availableFilters, filterAction }}
        paginateComponent={
          <Paginate
            action={(page: number) => setFilter({ ...filter, page })}
            data={paginate}
          />
        }
      />

      {newCouponModal && (
        <Modal
          state={newCouponModal}
          close={() => setNewCouponModal(false)}
          size="m"
        >
          <NewWizardContainer
            action={addCoupon}
            closeModal={() => setNewCouponModal(false)}
            loading={isFetching}
          />
        </Modal>
      )}

      {!!detailModal && (
        <Modal
          state={!!detailModal}
          close={() => setDetailModal(null)}
          size="l"
        >
          <DetailCouponContainer
            id={detailModal}
            updateState={updateCouponsState}
            closeModal={() => setDetailModal(null)}
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
};

interface ExportContainer {
  filter: BasicType;
  closeModal: Function;
}

const ExcelFileExport = ({ filter, closeModal }: ExportContainer) => {
  const { handleSubmit, control } = useForm();
  const { exportCoupons, isLoading } = useServerCoupons();

  const onSubmit: SubmitHandler<Record<string, string>> = (data) => {
    exportCoupons(filter, data.name, closeModal());
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
