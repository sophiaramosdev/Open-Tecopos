import { TrashIcon } from "@heroicons/react/24/outline";
import { useState, useContext } from "react";
import AlertContainer from "../../../../components/misc/AlertContainer";
import Button from "../../../../components/misc/Button";
import { DetailCouponContext } from "../CouponModalEdit"
import Modal from "../../../../components/modals/GenericModal";

interface SettingProps{
  closeModal:Function
}

const Setting = ({closeModal}:SettingProps) => {
  const { coupon, deleteCoupon } = useContext(DetailCouponContext);
  const [alert, setAlert] = useState(false);
  return (
    <div className="h-96">
      <div className="flex justify-end">
        <Button
          name="Eliminar Cupón"
          icon={<TrashIcon className="h-5" />}
          color="red-500"
          textColor="red-500"
          colorHover="red-400"
          action={() => setAlert(true)}
          outline
        />
      </div>

      {alert && (
        <Modal state={alert} close={setAlert}>
          <AlertContainer
            onAction={() => deleteCoupon && deleteCoupon(coupon?.id??null, closeModal)}
            onCancel={() => setAlert(false)}
            title={`Eliminar ${coupon?.code}`}
            text="Seguro que desea eliminar este cupón?"
          />
        </Modal>
      )}
    </div>
  );
};

export default Setting;
