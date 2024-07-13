import { useState } from 'react';

import query from './APIServices';
import useServerMain from './useServer';

import { generateUrlParams } from '../utils/helpers';
import { toast } from 'react-toastify';
import { BasicType } from '../interfaces/localInterfaces';
import { PaginateInterface } from '../interfaces/serverInterfaces';

const useServerRoles = () => {
	const { manageErrors } = useServerMain();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [paginate, setPaginate] = useState<PaginateInterface | null>(null);
	const [allRoles, setAllRoles] = useState<any>([]);
	const [allPermissions, setAllPermissions] = useState<any>([]);
	const [role, setRole] = useState<any>([]);
	const [tracesEntity, setTracesEntity] = useState<any>([]);

  const getAllRoles = async (filter: BasicType) => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/roles${generateUrlParams(filter)}`)
      setPaginate({
       totalItems: resp.data.totalItems,
       totalPages: resp.data.totalPages,
        currentPage: resp.data.currentPage,
      });
      setAllRoles(resp.data.items)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };
 
   const deleteRoles = async (id: number, callback?: Function) => {
    
    try {
      callback && callback();
      await query.deleteAPI(`/roles/${id}`, {})
      setAllRoles(allRoles.filter((obj: any) => obj.id !== id))
      toast.success("Rol eliminado exitosamente");
    } catch (error) {
      manageErrors(error);
    }
  };

  const getAllPermissions = async (filter: BasicType) => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/roles/permissions${generateUrlParams(filter)}`)
      setPaginate({
       totalItems: resp.data.totalItems,
       totalPages: resp.data.totalPages,
        currentPage: resp.data.currentPage,
      });
      setAllPermissions(resp.data.items)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getRole = async (id: any): Promise<any> => {
    try {
      setIsLoading(true);
      const response = await query.get(`/roles/${id}`);
      const role = response.data;
      setRole(role);
  
  
      return role;
    } catch (error) {
      console.error(error);
      // Display a user-friendly error message.
    } finally {
      setIsLoading(false);
    }
  };
  const registerRoles = async (
    data: any,
    close: Function
  ) => {
    setIsFetching(true);
    setIsLoading(true)
    await query
    .post("/roles", data)
      .then((resp) => {   

				toast.success('Rol registrado satisfactoriamente');
				close();
			})
			.catch((e) => {
				manageErrors(e);
			});
		setIsFetching(false);
		setIsLoading(false);
	};

  //Postman -> 'entity / update'
  const updateRoles = async (
    id: number | null | undefined,
    dataRoles: any,
  
    callback?: Function
  ) => {
    setIsFetching(true);
    try {
      let update = await query.patch(`/roles/${id}`, dataRoles)
      //Update the object with the specific id of entity
      let updatedRoles = allRoles.map((obj: any) => (obj.id === id ? update.data : obj));
      setAllRoles(updatedRoles);
      toast.success("Rol actualizado exitosamente");
      callback && callback();
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsFetching(false);
    }
  };
	/* const getTracesEntity = async (id:number) => {
    setIsLoading(true);
    try {
      let resp = await query.get(`/traces/entity/${id}`)
      //setPaginate({
      //  totalItems: resp.data.totalItems,
      //  totalPages: resp.data.totalPages,
      //  currentPage: resp.data.currentPage,
      //});
      setTracesEntity(resp.data)
    } catch (error) {
      manageErrors(error);
    } finally {
      setIsLoading(false);
    }
  };*/

	return {
		paginate,
		isLoading,
		isFetching,
		allRoles,
		role,
		getRole,
		tracesEntity,
		getAllRoles,
		updateRoles,
		//getTracesEntity,
		getAllPermissions,
		allPermissions,
		manageErrors,
		deleteRoles,
		registerRoles,
	};
};

export default useServerRoles;
