import axios from "axios";
import { setKeys } from "../store/slices/sessionSlice";
import { closeSystem } from "../store/actions/globals";

const baseUrl = `${process.env.REACT_APP_API_HOST}${process.env.REACT_APP_VERSION_API}`;
const no_authentication = ["/security/login"];
const no_include_business = ["/administration/my-branches"];
const axiosApiInstance = axios.create();

let store: any;
export const injectStore = (_store: any) => {
    store = _store;
};

// Request interceptor for API calls
axiosApiInstance.interceptors.request.use(
    async config => {
        const rute = config.url?.split(baseUrl)[1] ?? "";

        const session = store?.getState().session;
        const keys = session?.key;
        const activeBusinessId = session?.businessId;

        let myHeader: any = {};
        if (activeBusinessId !== null && !no_include_business.includes(rute)) {
            myHeader["X-App-BusinessId"] = activeBusinessId;
        }

        config.headers = {
            ...config.headers,
            Accept: "*/*",
            "Content-Type": "application/json",
            "X-App-Origin": "Tecopos-Admin",
            ...myHeader,
        };

        if (keys !== null && !no_authentication.includes(rute)) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${keys.token}`,
            };
        }
        return config;
    },
    error => {
        Promise.reject(error);
    }
);

// Response interceptor for API calls
axiosApiInstance.interceptors.response.use(
    response => {
        return response;
    },
    async function (error) {
        const originalRequest = error.config;

        if (error.response.status === 403) {
            store.dispatch(setKeys(null));
            return Promise.reject(error);            
        }

        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const keys = store.getState().session.key;

            if (keys) {
                return await post(
                        `/security/refresh-token`,
                        {
                            refresh_token: keys.refresh_token,
                        }
                    )
                    .then(async response => {
                        const new_session = {
                            token: response.data.token,
                            refresh_token: response.data.refresh_token,
                        };

                        store.dispatch(setKeys(new_session));

                        axiosApiInstance.defaults.headers.common[
                            "Authorization"
                        ] = "Bearer " + response.data.token;

                        return axiosApiInstance(originalRequest);
                    })
                    .catch(async error => {
                        store.dispatch(closeSystem(null));
                        return Promise.reject(error);
                    });
            }
        }

        return Promise.reject(error);
    }
);

const get = async (path: string) => {
    const request = {
        url: `${baseUrl + path}`,
        method: "GET",
    };

    return axiosApiInstance.get(request.url);
};

const post = async (path: string, body: object, config = {}) => {
    const request = {
        url: `${baseUrl + path}`,
        method: "POST",
    };

    return axiosApiInstance.post(request.url, body, config);
};

const put = async (path: string, body: object) => {
    const request = {
        url: `${process.env.REACT_APP_API_HOST}${process.env.REACT_APP_VERSION_API}${path}`,
        method: "PUT",
    };

    return axiosApiInstance.put(request.url, body);
};

const patch = async (path: string, body: object) => {
    const request = {
        url: `${process.env.REACT_APP_API_HOST}${process.env.REACT_APP_VERSION_API}${path}`,
        method: "PATCH",
    };

    return axiosApiInstance.patch(request.url, body);
};

const deleteAPI = async (path: string, body: object) => {
    const request = {
        url: `${process.env.REACT_APP_API_HOST}${process.env.REACT_APP_VERSION_API}${path}`,
        method: "DELETE",
    };

    return axiosApiInstance.delete(request.url, { data: body });
};

export default {
    get,
    post,
    put,
    patch,
    deleteAPI,
};
