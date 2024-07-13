import { SelectInterface } from './localInterfaces';

//Common useServers interfaces -------------
export interface PaginateInterface {
	totalItems: number;
	totalPages: number;
	currentPage: number;
}

//--------------------------------------------

//Entities interfaces ------------------------

export interface EntityInterface {
	id: number;
	name: string;
	status: string;
	address: string;
	phone: string;
	color: string;
	allowCreateAccount: boolean;
	owner: UserInterface;
	categories: EntityCategoryInterface[];
	business: {
		id: number;
		name: string;
	};
	profileImage: ImageInterface;
	entityType: SelectInterface;
}

export interface EntityCategoryInterface {
	id: number;
	name: string;
	color: string;
	isBasic: boolean;
	isActive: boolean;
	cardImage: ImageInterface;
	price: number;
	discount: number;
	description: string;
}

//---------------------------------------------

export interface ImageInterface {
	id: number;
	url: string;
	hash: string;
}

export interface UserRolesInterface {
	role: RolesInterface;
	issueEntity: EntityInterface;
}
//Users interfaces -----------------------------
export interface UserInterface {
	id: number;
	username: string;
	email: string;
	fullName: string;
	avatar?: ImageInterface;
	issueEntityId: number | null;
	issueEntity: EntityInterface;
	isSuperAdmin: boolean;
	roles: UserRolesInterface[];
}

export interface RolesInterface {
	id: number;
	name: string;
	code: string;
	description: string;
	permissions: PermissionInterface[];
}

export interface PermissionInterface {
	id: number;
	code: PermissionCodes;
	name: string;
	description: string;
}
//---------------------------------------------

//Accounts interfaces------
export interface AccountInterface {
	id: number;
	name: string;
	address: string;
	code: string;
	description: string;
	isActive: boolean;
	isBlocked: false;
	isPrivate: true;
	amount: number;
	issueEntity: EntityInterface;
	owner: UserInterface;
	createdBy: UserInterface;
	createdAt: string;
	cards: CardInterface[];
}

export interface AccountOperations {
	id: number;
	operation: string;
	description: string;
	amount: number;
	createdAt: string;
	madeBy: UserInterface;
}

//-----------------------------

export interface CardInterface {
	id: number;
	address: string;
	barCode: string;
	holderName: string;
	description: string;
	expiratedAt: string;
	emitedAt: string;
	minAmountWithoutConfirmation: number | null;
	isBlocked: boolean;
	isActive: boolean;
	isDelivered: boolean;
	account: AccountInterface;
	request: {
		id: 2;
		queryNumber: string;
		status: string;
	};
	category: EntityCategoryInterface;
}

//Reports-----------------
export interface Operations {
	transactionNumber: string;
	amountTransferred: number;
	type: string;
	description: string;
	createdAt: string;

	sourceAccount: {
		id: string | number;
		name: string;
		address: string;
		issueEntity: { id: number; name: string };
	};
	targetAccount: {
		id: number;
		name: string;
		address: string;
		issueEntity: { id: number; name: string };
	};
	sourceCard: {
		address: string;
	};
	targetCard: {
		address: string;
	};
}
export interface DataOfOperations {
	totalItems: number | string;
	currentPage: number | string;
	totalPages: number | string;
	items: Operations[];
}

export interface DataofAccountRecord {
	paginationInfo: {
		totalItems: number;
		totalPages: number;
		currentPage: number;
	};
	records: AccountRecord[];
}
export interface DataofRequestRecord {
	totalItems: number;
	totalPages: number;
	currentPage: number;
	items: AccountRecord[];
}

export interface RequestRecord {
	status: 'CREATED' | 'CLOSED' | 'MODIFIED' | 'CANCELED' | 'DENIED';
	action: string;
	description: string;
	observations: string | null;
	createdAt: string;
	issuedBy: {
		fullName: string;
		username: string;
	};
	request: {
		issueEntityId: number;
		issueEntity: {
			name: string;
		};
	};
}

export interface AccountRecord {
	title: string;
	action: string;
	details: string;
	observations: string | null;
	createdAt: string;
	madeBy: {
		id: number;
		username: string;
	};
}

//-------------------------------------

export type PermissionCodes =
	| 'ENTITIES_VIEW'
	| 'ENTITIES_EDIT'
	| 'USERS_FULL'
	| 'USERS_VIEW'
	| 'USERS_CREATE'
	| 'USERS_EDIT'
	| 'USERS_DELETE'
	| 'ACCOUNTS_FULL'
	| 'ACCOUNTS_RELOAD'
	| 'ACCOUNTS_EDIT'
	| 'ACCOUNTS_DELETE'
	| 'REQUESTS_FULL'
	| 'REQUESTS_CREATE'
	| 'REQUESTS_UPDATE'
	| 'REQUESTS_DELETE'
	| 'CARDS_FULL'
	| 'CARDS_VIEW'
	| 'CARDS_UPDATE'
	| 'TRANSACTIONS_FULL'
	| 'TRANSACTIONS_EXPORT'
	| 'TRACES_ALL'
	| 'TRACES_EXPORT';

export interface DashboardDataInterface {
	issueEntitiesTotal: number;
	usersRegisteredTotal: number;
	accountsTotal: number;
	accountsByEntity: number;
	totalAmountInAccounts: number;
	cardsPrinted: number;
	accountOperations: number;
	cardRequests: number;
	totalTransactions: [];
	totalTransactionsByEntity: {};
	requestStatus: {status:'PRINTED'|'ACCEPTED'|'REQUESTED', count:number}[];
}
