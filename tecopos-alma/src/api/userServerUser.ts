import { useState } from "react";
import {
  PaginateInterface,
  UserInterface,
} from "../interfaces/ServerInterfaces";
import query from "./APIServices";
import useServer from "./useServer";
import { Flip, toast } from "react-toastify";
import { updateUserState } from "../store/slices/initSlice";
import { useAppDispatch } from "../store/hooks";
import { useNavigate, useParams } from "react-router-dom";
import { generateUrlParams } from "../utils/helpers";
import { BasicType } from "../interfaces/LocalInterfaces";

const useServerUser = () => {
  const { manageErrors } = useServer();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allUsers, setAllUsers] = useState<Array<UserInterface>>([]);
  const [user, setUser] = useState<UserInterface | null>(null);
  const [modalWaiting, setModalWaiting] = useState<boolean>(false);
  const [modalWaitingError, setModalWaitingError] = useState<string | null>(
    null
  );
  const [waiting, setWaiting] = useState<boolean>(false);
  const dispatch = useAppDispatch();

  const addUser = async (data: BasicType, callback: Function) => {
    setIsFetching(true);
    await query
      .post("/control/user", data)
      .then(async (resp) => {
        setAllUsers([resp.data, ...allUsers]);
        callback && callback();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const getAllUsers = async (filter: BasicType) => {
    setIsLoading(true);
    await query
      .get(`/control/users${generateUrlParams(filter)}`)
      .then((resp) => {
        const { currentPage, totalItems, totalPages, items } = resp.data;
        setPaginate({ totalItems, totalPages, currentPage });
        setAllUsers(items);
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };

  const getUser = async (id: any) => {
    setIsLoading(true);
    await query
      .get(`/control/user/${id}`)
      .then((resp) => {
        setUser(resp.data);
      })
      .catch((error) => manageErrors(error));
    setIsLoading(false);
  };

  const updateUser = async (
    userId: number,
    data: BasicType,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/control/user/${userId}`, data)
      .then(async (resp) => {
        setUser(resp.data);
        const newUsers = [...allUsers];
        const idx = newUsers.findIndex((user) => user.id === userId);
        newUsers.splice(idx, 1, resp.data);
        setAllUsers(newUsers);
        callback && callback();
        toast.success("Actualización exitosa");
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const updateMyUser = (
    data: Partial<UserInterface>,
    closeModal?: Function
  ) => {
    setModalWaiting(true);
    const userID = data.id;
    delete data.id;
    query
      .patch(`/control/user/${userID}`, data)
      .then(async (resp) => {
        dispatch(updateUserState(resp.data));
        setWaiting(false);
        toast.success("Actualización exitosa", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      })
      .catch((error) => {
        let errorMsg = "";
        if (error.response?.data?.message) {
          errorMsg = error.response?.data?.message;
        } else {
          errorMsg = "Ha ocurrido un error. Contacte al administrador";
        }
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Flip,
        });
        setIsLoading(false);
      });
  };

  const resetUserPsw = async (email: string, callback?:Function) => {
    setIsFetching(true);
    await query
      .post(`/control/user/request-password`, { email })
      .then(() => {
        toast.success("Operación completada con éxito");
        callback&&callback();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };

  const deleteUser = async (userId: number, callback?: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/control/user/${userId}`, {})
      .then(() => {
        toast.success("Usuario Eliminado con éxito");
        const newUsers = allUsers.filter((user) => user.id !== userId);
        setAllUsers(newUsers);
        callback && callback();
      })
      .catch((error) => manageErrors(error));
    setIsFetching(false);
  };
  return {
    paginate,
    isLoading,
    isFetching,
    waiting,
    modalWaiting,
    allUsers,
    user,
    getAllUsers,
    addUser,
    getUser,
    updateUser,
    updateMyUser,
    deleteUser,
    resetUserPsw,
    manageErrors,
    modalWaitingError,
  };
};
export default useServerUser;
