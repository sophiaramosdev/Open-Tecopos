import { useState } from "react";
import {
  UserInterface,
  SumaryInterface,
  TotalSubscripion,
  TotalType,
} from "../interfaces/ServerInterfaces";
import { useAppDispatch } from "../store/hooks";
import query from "../api/APIServices";
import { useNavigate, useParams } from "react-router-dom";
import { toast, Flip } from "react-toastify";
import { generateUrlParams } from "../utils/helpers";
import { setKeys } from "../store/slices/sessionSlice";
import { updateUserState } from "../store/slices/initSlice";
import mediaQuery from "./APIMediaServer"

export interface PaginateInterface {
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export interface CheckFieldInterface {
  [field: string]: boolean;
}

export interface ImageLoad {
  id: number;
  src: string;
  hash: string;
}
const useServer = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchingError, setFetchingError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [modalWaiting, setModalWaiting] = useState<boolean>(false);
  const [modalWaitingError, setModalWaitingError] = useState<string | null>(
    null
  );
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allUsers, setAllUsers] = useState<Array<UserInterface>>([]);
  const [user, setUser] = useState<UserInterface | null>(null);
  const [sumaryData, setSumaryData] = useState<SumaryInterface | null>(null);
  const [imgPreview, setImgPreview] = useState<ImageLoad[]>([]);
  const dispatch = useAppDispatch();
  const redirect = useNavigate();
  const { id } = useParams();

  const manageErrors = (error: any) => {
    console.log(error);
    if (error.response?.data?.message) {
      toast.error(error.response?.data?.message);
      return;
    } else {
      toast.error(
        "Upss, ha ocurrido un error inesperado. \n Intente de nuevo o consulte con su administrador..."
      );
      return;
    }
  };

  const uploadImg = async (data: FormData, multiple: boolean = false) => {
    setIsFetching(true);
    await mediaQuery
      .post("/files", data)
      .then((resp) => {
        if (multiple) {
          setImgPreview([
            ...imgPreview,
            ...resp.data.map((item: any) => ({
              id: item.id,
              src: item.src,
              hash: item.blurHash,
            })),
          ]);
        } else {
          setImgPreview([
            {
              id: resp.data[0].id,
              src: resp.data[0].src,
              hash: resp.data[0].blurHash,
            },
          ]);
        }
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const updateImgLocal = (data: ImageLoad[]) => {
    setImgPreview(data);
  };

  const logIn = async (data: Record<string, string | number | boolean>) => {
    setIsFetching(true);
    await query
      .post("/security/login", data)
      .then((resp) => {
        dispatch(setKeys(resp.data));
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const logOut = () => {
    query.post("/security/logout", {}).then((data) => {
      if (data.status === 204) {
        dispatch(setKeys(null))
        redirect("/");
      }
    });
  };

  const getSumaryData = async () => {
    setIsLoading(true);
    await query
      .get("/control/reports/summary")
      .then((resp) => {
        const totalBySubscriptionPlan: TotalSubscripion[] =
          resp.data.totalBySubscriptionPlan.map((item: TotalSubscripion) => {
            switch (item.code) {
              case "CUSTOM":
                return { ...item, code: "PERSONALIZADO" };

              case "STANDARD":
                return { ...item, code: "BÁSICO" };

              case "FREE":
                return { ...item, code: "GRATUITO" };

              case "FULL":
                return { ...item, code: "PROFESIONAL" };

              case "POPULAR":
                return item;
            }
          });

        const totalByType: TotalType[] = resp.data.totalByType.map(
          (item: TotalType) => {
            switch (item.type) {
              case "RESTAURANT":
                return { ...item, type: "RESTAURANTE" };

              case "SHOP":
                return { ...item, type: "TIENDA" };

              case "DATE":
                return { ...item, type: "CITAS" };

              case "PRODUCTION":
                return { ...item, type: "PRODUCCIÓN" };

              default:
                return;
            }
          }
        );
        setSumaryData({ ...resp.data, totalBySubscriptionPlan, totalByType });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };


  const addUser = (data: Partial<UserInterface>, closeModal: Function) => {
    setIsFetching(true);
    query
      .post("/control/user", { ...data, businessId: Number(id) })
      .then((resp) => {
        getAllUsers();
        setIsFetching(false);
        toast.success("Usuario insertado con éxito", {
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
        closeModal(false);
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
        setIsFetching(false);
      });
  };

  const getAllUsers = async (page: number = 1, offset: number = 6) => {
    setWaiting(true);
    await query
      .get(
        `/control/users?orderBy=createdAt&order=DESC&businessId=${id}&per_page=${offset}&page=${page}`
      )
      .then((resp) => {
        const { currentPage, totalItems, totalPages, items } = resp.data;
        setPaginate({ totalItems, totalPages, currentPage });
        setAllUsers(items);
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          setWaitingError(error.response.data.message);
        } else {
          setWaitingError(
            "Ha ocurrido un error mientras se cargaban los datos ..."
          );
        }
      });
    setWaiting(false);
  };

  const getUser = async (id: number) => {
    setModalWaiting(true);
    await query
      .get(`/control/user/${id}`)
      .then((resp) => {
        setUser(resp.data);
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          setWaitingError(error.response.data.message);
        } else {
          setWaitingError(
            "Ha ocurrido un error mientras se cargaban los datos ..."
          );
        }
      });
    setModalWaiting(false);
  };

  const findUser = async (user: string) => {
    setWaiting(true);
    await query
      .get(
        `/control/users?businessId=${id}&search=${user}&orderBy=createdAt&order=DESC`
      )
      .then((resp) => {
        setAllUsers(resp.data.items);
        setPaginate({
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
          currentPage: resp.data.currentPage,
        });
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          setWaitingError(error.response.data.message);
        } else {
          setWaitingError(
            "Ha ocurrido un error mientras se cargaban los datos ..."
          );
        }
      });
    setWaiting(false);
  };

  const updateUser = (data: Partial<UserInterface>, closeModal?: Function) => {
    setIsFetching(true);
    query
      .patch(`/control/user/${data.id}`, data)
      .then(async (resp) => {
        await getAllUsers(paginate?.currentPage);
        setUser(resp.data);
        setIsFetching(false);
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
        closeModal && closeModal(false);
        setIsFetching(false);
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
        setIsFetching(false);
      });
  };

  const updateMyUser = (data: Partial<UserInterface>,
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
        closeModal && closeModal(false);
        setModalWaiting(false);
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
        setModalWaiting(false);
      });
  };

  const resetUserPsw = async (email: string) => {
    setIsFetching(true);
    await query
      .post(`/control/user/request-password`, { email })
      .then((resp) => {
        toast.success("Operación completada con éxito", {
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
      });
    setIsFetching(false);
  };

  const deleteUser = async (userId: number, closeModal: Function) => {
    setModalWaiting(true);
    await query
      .deleteAPI(`/control/user/${userId}`, {})
      .then(async () => {
        await getAllUsers(paginate?.currentPage ?? 1);
        toast.success("Usuario Eliminado con éxito", {
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
        setModalWaiting(false);
        closeModal();
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
        setModalWaiting(false);
      });
  };



  return {
    sumaryData,
    loadingError,
    fetchingError,
    waitingError,
    modalWaitingError,
    paginate,
    isLoading,
    isFetching,
    waiting,
    modalWaiting,
    allUsers,
    user,
    imgPreview,
    logIn,
    logOut,
    getSumaryData,
    getAllUsers,
    addUser,
    getUser,
    findUser,
    updateUser,
    updateMyUser,
    deleteUser,
    resetUserPsw,
    manageErrors,
    uploadImg,
    updateImgLocal
  };
};

export default useServer;
