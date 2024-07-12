import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import useLoadData from "../../hooks/useLoadData";
import {
  selectModalStates,
  setAvaliableForContent,
} from "../../store/modalProductSlice";
import { selectUserSession } from "../../store/userSessionSlice";
import { getProductTypeIcon } from "../../utils/functions";

const MyNewProductSelectModal = ({
  handleOptionsProducts,
  onFocus,
  content,
}) => {
  const dispatch = useAppDispatch();
  useLoadData();

  const modalStates = useAppSelector(selectModalStates);
  const {business} = useAppSelector(state=>state.init);

  useEffect(() => {
    dispatch(
      setAvaliableForContent(
        business?.configurationsKey
          .find((item) => item.key === "type_products")
          .value.split(",") ?? []
      )
    );
  }, [modalStates.activeStepModal, modalStates.show]);

  return (
    <div className="w-full h-full flex flex-col gap-4 md:flex-row md:justify-between md:flex-wrap p-4">
      {content?.map((item, index) => (
        <div
          onClick={() =>
            handleOptionsProducts({
              name: item.name,
              code: item.code,
              color: item.bgColor,
            })
          }
          className={`${
            onFocus === item.name
              ? `${item.color} shadow-md shadow-gray-900 -translate-y-0.5`
              : "ring-1 ring-slate-500"
          } p-4 rounded-md cursor-pointer w-full duration-150 md:max-w-[48%]`}
          key={index}
        >
          <div className="flex gap-3 items-center">
            <FontAwesomeIcon
              className={`${
                onFocus === item.name ? item.textColor : "text-slate-500"
              }`}
              icon={getProductTypeIcon(item.code)}
            />
            <h3
              className={`${
                onFocus === item.name ? item.textColor : "text-slate-500"
              } font-semibold`}
            >
              {item.name}
            </h3>
          </div>
          <p
            className={`${
              onFocus === item.name ? "text-black" : "text-slate-500"
            } text-sm`}
          >
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default MyNewProductSelectModal;
