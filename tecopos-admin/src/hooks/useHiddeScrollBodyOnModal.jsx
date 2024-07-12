import { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectModalStates } from "../store/modalProductSlice";

const useHiddeScrollBodyOnModal = () => {
  const modalStates = useSelector(selectModalStates);
  useEffect(() => {
    modalStates.show
      ? document.body.classList.add(`overflow-hidden`)
      : document.body.classList.remove(`overflow-hidden`);
  }, [modalStates.show]);
};

export default useHiddeScrollBodyOnModal;
