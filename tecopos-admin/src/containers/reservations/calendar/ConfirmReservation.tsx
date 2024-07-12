import { useState, createContext, useEffect, useMemo, useContext } from "react";
import DetailsReservationTab from "./editReservationsTabs/DetailsReservationTab";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import { useForm } from "react-hook-form";
import { ReservationsContext } from "./CalendarReservation";
import Fetching from "../../../components/misc/Fetching";
import moment from "moment";
import ImageComponent from "../../../components/misc/Images/Image";
import useServerProduct from "../../../api/useServerProducts";
import Button from "../../../components/misc/Button";

interface Props {
  close: Function;
}

const ConfirmReservation = ({ close }: Props) => {
  //Manage Tabs --------------------------------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState("details");

  const { getReservation, reservation, isFetching, selectEvent, confirmOrder } =
    useContext(ReservationsContext);
  const {
    getProduct,
    product,
    isFetching: isFetchingProduct,
  } = useServerProduct();

  useEffect(() => {
    getReservation && getReservation(selectEvent);
  }, []);

  useEffect(() => {
    if (reservation?.productId) {
      getProduct && getProduct(reservation?.productId.toString());
    }
  }, [reservation]);
  const { watch, control, handleSubmit } = useForm();

  const onSubmit = (data: any) => {};

  if (isFetching || isFetchingProduct) return <Fetching />;
  
  if (product?.resources.length === 0) {
    close();
    confirmOrder && confirmOrder(reservation?.orderReceiptId);
    return <></>;
  }

  return (
    <div className=" h-[400px] ">
      <header>
        <div className="flex justify-center gap-5">
          <h2 className="text-lg text-gray-700 font-medium text-center">
            Confirmar reserva
          </h2>
        </div>
        <section className="grid grid-cols-2">
          <section className="">
            <h3 className="flex gap-x-2 font-semibold">
              Servicio: {""}
              <p className="font-normal">{reservation?.name}</p>
            </h3>
          </section>
        </section>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className=" flex flex-col h-fit  justify-between"
      >
        <div>
          {(product?.resources?.length || 0) > 0 && (
            <AsyncComboBox
              dataQuery={{
                url: "/administration/resource-business",
                defaultParams: {
                  productId: reservation?.productId as number,
                },
              }}
              normalizeData={{
                id: "id",
                name: ["code"],
              }}
              label="Recurso "
              name=""
              control={control}
              rules={{
                required: "Este campo es requerido",
              }}
            />
          )}
        </div>
        <footer className="grid grid-cols-3 gap-x-5 items-end justify-end mt-60  ">
          <div></div>
          <div></div>
          <div className="col-start-3">
            <Button
              name="Confirmar"
              color="indigo-700 "
              type="submit"
              full
              disabled={isFetching}
              loading={isFetching}
            />
          </div>
        </footer>
      </form>
    </div>
  );
};

export default ConfirmReservation;
