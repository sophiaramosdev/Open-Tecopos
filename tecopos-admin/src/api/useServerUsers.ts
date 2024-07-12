import { useState } from "react";
import query from "./APIServices";
import {
  UserInterface,
  PaginateInterface,
  PersonInterface,
  AccessRecordsInterface,
  SalaryRuleInterface,
  DayAsistanceInterface,
  PersonRecordsInterface,
  HistoricalSalaryInterface,
  SalaryReport,
  humanresourceSummaryInterfaceData,
  SalaryReportPersons,
} from "../interfaces/ServerInterfaces";
import { generateUrlParams } from "../utils/helpers";
import useServer from "./useServerMain";
import { toast } from "react-toastify";
import { BasicType } from "../interfaces/InterfacesLocal";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setPersonCategories,
  setPersonPost,
} from "../store/slices/nomenclatorSlice";

export const useServerUsers = () => {
  const { personCategories, personPosts } = useAppSelector(
    (state) => state.nomenclator
  );
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
  const [allUsers, setAllUsers] = useState<UserInterface[]>([]);
  const [user, setUser] = useState<UserInterface | null>(null);
  const [people, setPeople] = useState<PersonInterface[]>([]);
  const [person, setPerson] = useState<PersonInterface | null>(null);
  const [accessRecords, setAccessRecords] = useState<AccessRecordsInterface[]>(
    []
  );
  const [personRecords, setPersonRecords] = useState<PersonRecordsInterface[]>(
    []
  );

  const [allDaysAsistance, setAllDaysAsistance] = useState<
    DayAsistanceInterface[]
  >([]);
  const [rules, setRules] = useState<SalaryRuleInterface[]>([]);

  const [AllHistoricalSalaries, setAllHistoricalSalaries] =
    useState<HistoricalSalaryInterface | null>(null);

  const [HistoricalSalaryData, setHistoricalSalaryData] =
    useState<SalaryReport | null>(null);

  const [AllPersonSalary, setAllPersonSalary] = useState<
    SalaryReportPersons[] | null
  >(null);

  const [humanresourceSummary, setHumanresourceSummary] =
    useState<humanresourceSummaryInterfaceData | null>(null);

  const { manageErrors } = useServer();

  //Users -------------------------------

  const getAllUsers = async (
    filter: Record<string, string | number | boolean>
  ) => {
    setIsLoading(true);
    await query
      .get(`/security/users${generateUrlParams(filter)}`)
      .then((resp) => {
        setAllUsers(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addUser = async (
    data: Record<string, string | number | boolean>,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/security/user", data)
      .then((resp) => {
        setAllUsers([resp.data, ...allUsers]);
        closeModal();
        toast.success("Usuario agregado satisfactoriamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editUser = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function,
    showToastSuccess?: boolean
  ) => {
    setIsFetching(true);
    await query
      .patch(`/security/user/${id}`, data)
      .then((resp) => {
        const newUsers = [...allUsers];
        const idx = newUsers.findIndex((user) => user.id === id);
        newUsers.splice(idx, 1, resp.data);
        setAllUsers(newUsers);
        setUser(resp.data);
        if (showToastSuccess !== undefined && showToastSuccess !== null) {
          if (showToastSuccess) {
            toast.success("Cambios realizados con éxito");
          }
        } else {
          toast.success("Cambios realizados con éxito");
        }
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getUser = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/security/user/${id}`)
      .then((resp) => setUser(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const deleteUser = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/security/user/${id}`, {})
      .then(() => {
        setAllUsers(allUsers.filter((item) => item.id !== id));
        toast.success("Usuario eliminado");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const resetPsw = async (data: BasicType) => {
    setIsFetching(true);
    await query
      .post("/administration/user/request-password", data)
      .then((resp) => toast.success("Contraseña enviada al correo indicado"))
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const checkEmail = async (email: string) => {
    let response: boolean | string = true;
    setIsFetching(true);
    await query
      .post("/security/check/email", { email })
      .catch(() => (response = "Correo electrónico en uso"));
    setIsFetching(false);
    return response;
  };

  const checkUser = async (username: string) => {
    let response = true;
    setIsFetching(true);
    await query
      .post("/security/check/username", { username })
      .catch(() => (response = false));
    setIsFetching(false);
    return response;
  };

  //----------------------------------------------------------------------------

  //People -------------------------------------------------------------
  const getPeople = async (
    filter: Record<string, string | number | boolean>,
    isActive: boolean
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/humanresource/person${generateUrlParams(filter)}${
          !isActive ? "&isActive=false" : "&isActive=true"
        }`
      )
      .then((resp) => {
        setPeople(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addPerson = async (
    data: Record<string, string | number | boolean>,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/humanresource/person", data)
      .then((resp) => {
        setPeople([resp.data, ...people]);
        closeModal();
        toast.success("Persona agregada satisfactoriamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editPerson = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/humanresource/person/${id}`, data)
      .then((resp) => {
        const newPeople = [...people];
        const idx = newPeople.findIndex((user) => user.id === id);
        newPeople.splice(idx, 1, resp.data);
        setPeople(newPeople);
        toast.success("Cambios realizados con éxito");
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const getPerson = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/humanresource/person/${id}`)
      .then((resp) => setPerson(resp.data))
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const getPersonUser = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/humanresource/person/${id}`)
      .then(async (resp) => {
        setPerson(resp?.data);
        if (resp.data.user !== null) {
          await query
            .get(`/security/user/${resp?.data?.user?.id}`)
            .then((resp) => {
              setUser(resp.data);
            })
            .catch((e) => manageErrors(e));
        }
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  //Este metodo en realidad no elimina de la BD sino que pasa la propiedad isActive del person a false (causa la baja)
  const deletePerson = async (
    id: number,
    callback: Function,
    data: Record<string, string | number | boolean | string[]>
  ) => {
    setIsFetching(true);

    await query
      .patch(
        `/administration/humanresource/person/low/${id}`,
        data === undefined ? { observations: "" } : { observations: data }
      )
      .then((resp) => {
        setPeople(people.filter((item) => item.id !== id));
        toast.success("Usuario causado de baja");
        callback();
      })
      .catch((e) => manageErrors(e));

    setIsFetching(false);
  };
  //-------------------------------------------------------------------------------
  //Categories---------------------------------------------------------
  const addCategory = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/humanresource/personcategory", data)
      .then((resp) => {
        const newCategories = [resp.data, ...personCategories];
        dispatch(setPersonCategories(newCategories));
        callback();
        toast.success("Categoría agregada satisfactoriamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editCategory = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/humanresource/personcategory/${id}`, data)
      .then((resp) => {
        const newCategories = [...personCategories];
        const idx = newCategories.findIndex((cat) => cat.id === id);
        newCategories.splice(idx, 1, resp.data);
        dispatch(setPersonCategories(newCategories));
        toast.success("Cambios realizados con éxito");
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteCategory = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/humanresource/personcategory/${id}`, {})
      .then(() => {
        dispatch(
          setPersonCategories(personCategories.filter((item) => item.id !== id))
        );
        toast.success("Categoría eliminada");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  //-------------------------------------------------------------------------------
  //Post---------------------------------------------------------
  const addPost = async (
    data: Record<string, string | number | boolean>,
    callback: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/humanresource/personpost", data)
      .then((resp) => {
        const newPosts = [resp.data, ...personPosts];
        dispatch(setPersonPost(newPosts));
        callback();
        toast.success("Cargo agregado satisfactoriamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editPost = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/humanresource/personpost/${id}`, data)
      .then((resp) => {
        const newPosts = [...personPosts];
        const idx = newPosts.findIndex((cat) => cat.id === id);
        newPosts.splice(idx, 1, resp.data);
        dispatch(setPersonPost(newPosts));
        toast.success("Cambios realizados con éxito");
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deletePost = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/humanresource/personpost/${id}`, {})
      .then(() => {
        dispatch(setPersonPost(personPosts.filter((item) => item.id !== id)));
        toast.success("Cargo eliminado");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };
  //-------------------------------------------------------------------------------
  //Access Records---------------------------------------
  const getAccessRecords = async (
    filter: Record<string, string | number | boolean>
  ) => {
    setIsLoading(true);
    await query
      .get(`/administration/humanresource/access${generateUrlParams(filter)}`)
      .then((resp) => {
        setAccessRecords(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  //Records---------------------------------------
  const getAllPersonRecords = async (
    filter: Record<string, string | number | boolean>,
    id: number
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/humanresource/person/record/${id}${generateUrlParams(
          filter
        )}`
      )
      .then((resp) => {
        setPersonRecords(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const deleteAccessRecords = async (id: number) => {
    setIsLoading(true);

    await query
      .deleteAPI(`/administration/humanresource/access/${id}`, {})
      .then((resp) => {
        setAccessRecords(accessRecords.filter((record) => record.id !== id));

        toast.success("Registro eliminado con éxito");
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  //Salary  -------------------------------------------------------------
  //Rules
  const getAllRules = async (
    filter?: Record<string, string | number | boolean>
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/humanresource/salary/rules${generateUrlParams(filter)}`
      )
      .then((resp) => {
        setRules(resp.data.items);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const addRule = async (
    data: Record<string, string | number | boolean>,
    closeModal: Function
  ) => {
    setIsFetching(true);
    await query
      .post("/administration/humanresource/salary/rules", data)
      .then((resp) => {
        setRules([resp.data, ...rules]);
        closeModal();
        toast.success("Persona agregada satisfactoriamente");
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const editRule = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/humanresource/salary/rules/${id}`, data)
      .then((resp) => {
        const newRules = [...rules];
        const idx = newRules.findIndex((rule) => rule.id === id);
        newRules.splice(idx, 1, resp.data);
        setRules(newRules);
        toast.success("Cambios realizados con éxito");
        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const deleteRule = async (id: number, callback: Function) => {
    setIsFetching(true);
    await query
      .deleteAPI(`/administration/humanresource/salary/rules/${id}`, {})
      .then(() => {
        setRules(rules.filter((item) => item.id !== id));
        toast.success("Regla eliminada");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  //Salary
  const GetSalaryGeneralReport = async (data: {
    startsAt: string;
    endsAt: string;
    codeCurrency: string;
    strictInPost: boolean;
    businesses: number[];
  }) => {
    setIsFetching(true);

    await query
      .post("/administration/humanresource/salary/report/general", data)
      .then((resp) => {
        toast.success(
          "Reporte de salario generado y agregado a históricos de forma satisfactoria"
        );
      })
      .catch((e) => manageErrors(e));

    setIsFetching(false);
  };

  const FindAllHistoricalSalary = async (
    filter?: Record<string, string | number | boolean>
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/humanresource/salary/historical${generateUrlParams(
          filter
        )}`
      )
      .then((resp) => {
        setAllHistoricalSalaries(resp.data);
        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const GetHistorialSalary = async (id: number) => {
    setIsLoading(true);
    await query
      .get(`/administration/humanresource/salary/historical/${id}`)
      .then((resp) => {
        setHistoricalSalaryData(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const DeleteHistoricalSalary = async (id: number, callback: Function) => {
    setIsLoading(true);
    await query
      .deleteAPI(`/administration/humanresource/salary/historical/${id}`, {})
      .then(() => {
        setAllUsers(allUsers.filter((item) => item.id !== id));
        toast.success("Reporte eliminado");
        callback();
      })
      .catch((e) => manageErrors(e));
      setIsLoading(false);
  };

  const EditHistoricalSalaryReport = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(`/administration/humanresource/salary/historical/${id}`, data)
      .then((resp) => {
        toast.success("Cambios realizados con éxito");

        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  const EditSalaryReportPerson = async (
    id: number,
    data: Record<string, string | number | boolean | string[]>,
    callback?: Function
  ) => {
    setIsFetching(true);
    await query
      .patch(
        `/administration/humanresource/salary/historical/salaryitem/${id}`,
        data
      )
      .then((resp) => {
        toast.success("Cambios realizados con éxito");

        callback && callback();
      })
      .catch((e) => manageErrors(e));
    setIsFetching(false);
  };

  //----------------

  const getDayAsistance = async (data: {
    dateFrom: string;
    businessId?: number;
  }) => {
    setIsLoading(true);
    await query
      .post(`/administration/humanresource/access/report/assistance`, data)
      .then((resp) => {
        if (resp.data.length === 0) {
          toast.warning("No se encontraron resultados");
        } else {
          setAllDaysAsistance(resp.data);
        }
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const registerManualAccess = async (
    data: {
      personId: number;
      areaId: number;
      registeredAt: string;
      recordType: string;
    },
    callback: Function
  ) => {
    setIsLoading(true);
    await query
      .post(`/administration/humanresource/access/manual`, data)
      .then(() => {
        // setAccessRecords([...accessRecords, resp.data]);
        toast.success("Registrado correctamente");
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const registerPersonRecord = async (
    data: {
      observations: string;
      createdAt: string;
      documentId: number;
    },
    personId: number,
    callback: Function
  ) => {
    setIsLoading(true);
    await query
      .post(`/administration/humanresource/person/record/${personId}`, data)
      .then((resp) => {
        toast.success("Registro agregado satisfactoriamente");
        // setAccessRecords([...accessRecords, resp.data]);
        callback();
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };
  //-------------------------------------------------------------------------------

  const getHumanResourcesSummary = async () => {
    setIsLoading(true);
    await query
      .get("/administration/humanresource/report/summarize")
      .then((resp) => {
        setHumanresourceSummary(resp.data);
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  const findAllPersonSalary = async (
    personId: number,
    filter: Record<string, string | number | boolean>
  ) => {
    setIsLoading(true);
    await query
      .get(
        `/administration/humanresource/salary/${personId}${generateUrlParams(
          filter
        )}`
      )
      .then((resp) => {
        setAllPersonSalary(resp.data.items);

        setPaginate({
          currentPage: resp.data.currentPage,
          totalItems: resp.data.totalItems,
          totalPages: resp.data.totalPages,
        });
      })
      .catch((e) => manageErrors(e));
    setIsLoading(false);
  };

  return {
    isFetching,
    isLoading,
    paginate,
    allUsers,
    user,
    people,
    person,
    accessRecords,
    rules,
    getAllUsers,
    getUser,
    addUser,
    editUser,
    deleteUser,
    resetPsw,
    checkEmail,
    checkUser,
    getPeople,
    getPerson,
    addPerson,
    editPerson,
    deletePerson,
    addCategory,
    editCategory,
    deleteCategory,
    addPost,
    editPost,
    deletePost,
    getAccessRecords,
    getAllRules,
    addRule,
    editRule,
    deleteRule,
    getPersonUser,
    GetSalaryGeneralReport,
    getDayAsistance,
    allDaysAsistance,
    registerManualAccess,
    deleteAccessRecords,
    getAllPersonRecords,
    personRecords,
    registerPersonRecord,
    FindAllHistoricalSalary,
    AllHistoricalSalaries,
    HistoricalSalaryData,
    GetHistorialSalary,
    DeleteHistoricalSalary,
    EditHistoricalSalaryReport,
    EditSalaryReportPerson,
    getHumanResourcesSummary,
    humanresourceSummary,
    findAllPersonSalary,
    AllPersonSalary,
  };
};

export default useServerUsers;
