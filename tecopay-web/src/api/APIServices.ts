import axios from 'axios';
import { setKeys } from '../store/slices/sessionSlice';

//Data
//"https://apidevpay.tecopos.com"
const baseUrl = process.env.REACT_APP_API_HOST;

//Authentication
//"https://idapidev.tecopos.com/api"  +   "/v1"
const baseAuthUrl = `https://idapidev.tecopos.com/api/v1`;

//URL with No auth
const noAuth = [
	'https://idapidev.tecopos.com/api/v1/login',
	'https://idapidev.tecopos.com/api/v1/refresh_token',
];

export const controller = new AbortController();

//const no_authentication = ["/identity/login"];
const axiosApiInstance = axios.create();

let store: any;
export const injectStore = (_store: any) => {
	store = _store;
};

// Request interceptor for API calls
axiosApiInstance.interceptors.request.use(
	async (config) => {
		const url = config.url || '';
        config.signal = controller.signal;
		config.headers['X-App-Origin'] = 'Tecopay-Web';

		const session = store?.getState().session;
		const keys = session?.key;

		//@ts-ignore
		config.headers = {
			...config.headers,
			Accept: '*/*',
			'Content-Type': 'application/json',
		};

		if (noAuth.includes(config.url!)) return config;

		if (!!keys) {
			//@ts-ignore
			config.headers = {
				...config.headers,
				Authorization: `Bearer ${keys.token}`,
			};
			return config;
		}		

		throw new Error('No auth');
	},
	(error) => {
		Promise.reject(error);
	},
);

// Response interceptor for API calls
axiosApiInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	async function (error) {
		const originalRequest = error.config;

		if (
			[403, 401].includes(error.response?.status) &&
			!originalRequest._retry
		) {
			originalRequest._retry = true;
			const keys = store.getState().session.key;

			if (keys) {
				return await postAuth(`/refresh-token`, {
					refresh_token: keys.refresh_token,
				})
					.then((response) => {
						store.dispatch(setKeys(response.data));

						axiosApiInstance.defaults.headers.common['Authorization'] =
							'Bearer ' + response.data.token;

						return axiosApiInstance(originalRequest);
					})
					.catch((error) => {
						store.dispatch(setKeys(null));
						return Promise.reject(error);
					});
			}
		}

		return Promise.reject(error);
	},
);

const get = async (path: string) => {
	const request = {
		url: `${baseUrl + path}`,
		method: 'GET',		
	};

	return axiosApiInstance.get(request.url);
};

const post = async (path: string, body: object, config = {}) => {
	const request = {
		url: `${baseUrl + path}`,
		method: 'POST',
	};

	return axiosApiInstance.post(request.url, body, config);
};

const postAuth = async (path: string, body: object, config = {}) => {
	const request = {
		url: `${baseAuthUrl + path}`,
		method: 'POST',
	};

	return axiosApiInstance.post(request.url, body, config);
};

const getAuth = async (path: string) => {
	const request = {
		url: `${baseAuthUrl + path}`,
		method: 'GET',
	};

	return axiosApiInstance.get(request.url);
};

const put = async (path: string, body: object) => {
	const request = {
		url: `${baseUrl}${path}`,
		method: 'PUT',
	};

	return axiosApiInstance.put(request.url, body);
};

const patch = async (path: string, body: object) => {
	const request = {
		url: `${baseUrl}${path}`,
		method: 'PATCH',
	};

	return axiosApiInstance.patch(request.url, body);
};

const deleteAPI = async (path: string, body: object) => {
	const request = {
		url: `${baseUrl}${path}`,
		method: 'DELETE',
	};

	return axiosApiInstance.delete(request.url, { data: body });
};

export default {
	get,
	post,
	put,
	patch,
	deleteAPI,
	postAuth,
	getAuth,
};
