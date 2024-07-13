import { createSlice } from "@reduxjs/toolkit";
import { RolesInterface, UserInterface } from "../../interfaces/serverInterfaces";

interface InitialState{
    key:{token:string, refresh_token:string}|null,
    staticBar:boolean
}

const initialState:InitialState = {
    key:null,
    staticBar:true,
}

const sessionSlice = createSlice({
    initialState,
    name:"session",
    reducers:{
        setKeys:(state,action)=>({...state,key:action.payload}),
        changeStaticBar:(state)=>({...state,staticBar:!state.staticBar}),
    },
}
);

export const {setKeys, changeStaticBar} = sessionSlice.actions;
export default sessionSlice.reducer