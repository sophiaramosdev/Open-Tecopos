import { PermissionInterface } from './serverInterfaces';

export interface SelectInterface {
	id: string | number | null;
	name: string;
	disabled?: boolean;
}

export interface BasicNomenclator {
	id: number | string;
	name: string;
	description?: string;
}

export interface SelledProductReport {
	salesCategory: string;
	products: {
		name: string;
		areaSale: string;
		salesPrice: { amount: number; codeCurrency: string }[];
		quantity: number;
		totalSale: { amount: number; codeCurrency: string }[];
	}[];
	subtotalSales: { amount: number; codeCurrency: string }[];
}

export interface LocalPermissionInterface {
	category:
		| 'Entidades'
		| 'Cuentas'
		| 'Solicitudes'
		| 'Tarjetas'
		| 'Trazas'
		| 'Usuarios'
		| 'Transacciones';
	permissions: PermissionInterface[];
}

export type BasicType = Record<string, string | number | boolean | null>;
