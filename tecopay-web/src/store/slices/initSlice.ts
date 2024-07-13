import { createSlice } from '@reduxjs/toolkit';
import {
	PermissionCodes,
	RolesInterface,
	UserInterface,
} from '../../interfaces/serverInterfaces';
import { RootState } from '../root';
import { SelectInterface } from '../../interfaces/localInterfaces';

interface InitialInterface {
	user: UserInterface | null;
	roles: RolesInterface[];
	allowedPermissions:PermissionCodes[];
	entityTypes:SelectInterface[];
}

const initialState: InitialInterface = {
	user: null,
	roles: [],
	allowedPermissions:[],
	entityTypes:[]
};

const initSlice = createSlice({
	initialState,
	name: 'init',
	reducers: {
		//Users--------------------------------------------------------------------------------------
		setFullInfo: (_, action) => ({
			user: action.payload.user,
			roles: action.payload.roles,
			allowedPermissions: action.payload.allowedPermissions,
			entityTypes:action.payload.entityTypes
		}),
		//Roles--------------------------------------------------------------------------------------
		setRoles: (state, action) => ({
			...state,
			roles: [action.payload, ...state.roles],
		}),
		editRoleState: (state, action) => {
			const newRoles = [...state.roles];
			const idx = newRoles.findIndex((item) => item.id === action.payload.id);
			newRoles.splice(idx, 1, action.payload);
			return { ...state, roles: newRoles };
		},
		deleteRoleState: (state, action) => {
			const newRoles = [...state.roles].filter(item=>item.id!==action.payload);
			return { ...state, roles: newRoles };
		},
	},
});

export const { setFullInfo, setRoles, editRoleState, deleteRoleState } = initSlice.actions;

export default initSlice.reducer;
