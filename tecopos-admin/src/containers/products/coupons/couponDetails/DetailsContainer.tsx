import { useState } from "react";
import TabNav from "../../../../components/navigation/TabNav";
import General from "./General";
import Restrictions from "./Restrictions";
import Limits from "./Limits";
import { CouponInterface } from "../../../../interfaces/ServerInterfaces";
import { createContext } from "react";
import Button from "../../../../components/misc/Button";
import Modal from "../../../../components/modals/GenericModal";
import AlertContainer from "../../../../components/misc/AlertContainer";
import { useNavigate } from "react-router-dom";
import CouponModalEdit from "../CouponModalEdit";
import useServerCoupon from "../../../../api/useServerCoupons";

interface CouponCtx {
  coupon: CouponInterface | null;
  updateCoupon: Function;
  deleteCoupon: Function;
  isFetching: boolean;
  updateState: Function;
  getCoupon: Function;
}

const detailCouponContext: Partial<CouponCtx> = {};

export const DetailCouponContext = createContext(detailCouponContext);

interface Detail {
  coupon: CouponInterface | null;
  crud: {
    getCoupon?: Function;
    updateCoupon: Function;
    deleteCoupon?: Function;
    isFetching: boolean;
    updateState: Function;
  };
  closeModal: Function;
}

const DetailsContainer = ({ coupon, crud, closeModal }: Detail) => {
  const [cashTab, setCashTab] = useState("details");
  const [editModal, setEditModal] = useState(false);
  const [alert, setAlert] = useState(false);

  const { isLoading } = useServerCoupon();

  const { updateCoupon, deleteCoupon, isFetching, getCoupon, updateState } =
    crud;

  const deleteAction = () => {
    const callback = (id: number) => {
      updateState(id);
      closeModal();
    };
    deleteCoupon!(coupon?.id, callback);
  };

  return (
    <>
      <DetailCouponContext.Provider
        value={{
          coupon,
          updateCoupon,
          deleteCoupon,
          isFetching,
          getCoupon,
          updateState,
        }}
      >
        {cashTab === "details" && <General source={null} />}
        {cashTab === "restriction" && <Restrictions source={null} />}
        {cashTab === "limits" && <Limits source={null} />}

        {alert && (
          <Modal state={alert} close={setAlert}>
            <AlertContainer
              onAction={deleteAction}
              onCancel={() => setAlert(false)}
              title={`Eliminar ${coupon?.code}`}
              text="Seguro que desea eliminar este cupón?"
            />
          </Modal>
        )}

        {editModal && (
          <Modal state={editModal} close={setEditModal} size="m">
            <CouponModalEdit
              coupon={coupon}
              loading={isLoading}
              crud={crud}
              closeModal={() => setEditModal(false)}
            />
          </Modal>
        )}
      </DetailCouponContext.Provider>

      <div className="flex justify-end py-5 gap-3">
        <Button
          name="Editar"
          color="slate-600"
          textColor="slate-600"
          action={() => {
            setEditModal(true);
          }}
          outline
        />
        <Button name="Borrar" color="slate-600" action={() => setAlert(true)} />
      </div>
    </>
  );
};

export default DetailsContainer;
