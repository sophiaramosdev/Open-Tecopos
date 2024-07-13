export type PermissionCodeInterface =
	| 'ACCESS_ALL_ENTITIES'
	| 'ACCESS_OWN_ENTITIES'
	| 'CREATE_ENTITIES'
	| 'AVAILABLE_ENTITIES'
	| 'EDIT_ENTITIES'
	| 'DELETE_ENTITIES'
	| 'CREATE_CATEGORIES'
	| 'EDIT_CATEGORIES'
	| 'DELETE_CATEGORIES'
	| 'CREATE_CARD_DESIGNS'
	| 'EDIT_CARD_DESIGNS'
	| 'DELETE_CARD_DESIGNS'
	| 'ACCESS_ALL_ACCOUNTS'
	| 'ACCESS_OWN_ACCOUNTS'
	| 'ACCESS_ACCOUNT_RELOAD'
	| 'ACCESS_ACCOUNT_EDIT'
	| 'ACCESS_ALL_SYSTEM_USERS'
	| 'ACCESS_ENTITY_SYSTEM_USERS'
	| 'CREATE_SYSTEM_USERS'
	| 'EDIT_SYSTEM_USERS'
	| 'DELETE_SYSTEM_USERS'
	| 'ACCESS_ALL_REQUESTS'
	| 'ACCESS_OWN_REQUESTS'
	| 'ACCESS_ALL_ROLES'
	| 'CREATE_ROLES'
	| 'EDIT_ROLES'
	| 'DELETE_ROLES'
	| 'ACCESS_ALL_CARDS'
	| 'ACCESS_OWN_CARDS'
	| 'ACCESS_PENDING_DELIVERY_CARDS'
	| 'ACCESS_DELIVERED_CARDS'
	| 'ACCESS_CARD_ASSIGNMENT'
	| 'ACCESS_ALL_PERMISSIONS'
	| 'ACCESS_ALL_TRANSACTIONS'
	| 'ACCESS_ENTITY_TRANSACTIONS'
	| 'EXPORT_TRANSACTIONS'
	| 'ACCESS_ALL_TRACES'
	| 'ACCESS_ENTITY_TRACES'
	| 'EXPORT_TRACES'
	| 'ACCESS_ALL_CATEGORY_RANKINGS'
	| 'ACCESS_ENTITY_CATEGORY_RANKINGS'
	| 'EXPORT_CATEGORY_RANKINGS'
	| 'ACCESS_ALL_DASHBOARD'
	| 'ACCESS_ENTITY_DASHBOARD';

export interface permData {}
export interface Module {
	idModule: number;
	name: string;
	permissions: Permissions[];
}

export interface Permissions {
	id: number;
	name: string;
	code: PermissionCodeInterface;
	description: string;
}

export const permissionData: Permissions[] = [
	//modulo de entidades
	/* 

     */
	{
		id: 1,
		name: 'Acceso a todas las entidades',
		code: 'ACCESS_ALL_ENTITIES',
		description: 'Otorga acceso para ver todas las entidades',
	},
	{
		id: 2,
		name: 'Acceso a propias entidades',
		code: 'ACCESS_OWN_ENTITIES',
		description: 'Otorga acceso para ver las propias entidades',
	},
	{
		id: 3,
		name: 'Crear entidades',
		code: 'CREATE_ENTITIES',
		description: 'Otorga permisos para crear entidades',
	},
	{
		id: 4,
		name: 'Editar entidades',
		code: 'EDIT_ENTITIES',
		description: 'Otorga permisos para editar entidades',
	},
	{
		id: 5,
		name: 'Eliminar entidades',
		code: 'DELETE_ENTITIES',
		description: 'Otorga permisos para eliminar entidades',
	},
	{
		id: 6,
		name: 'Entidades disponibles para crear cuenta',
		code: 'AVAILABLE_ENTITIES',
		description: 'Otorga permisos para ver entidades disponibles',
	},
	{
		id: 7,
		name: 'Crear categorías',
		code: 'CREATE_CATEGORIES',
		description: 'Otorga permisos para crear categorías',
	},

	{
		id: 8,
		name: 'Editar categorías',
		code: 'EDIT_CATEGORIES',
		description: 'Otorga permisos para editar categorías',
	},

	{
		id: 9,
		name: 'Eliminar categorías',
		code: 'DELETE_CATEGORIES',
		description: 'Otorga permisos para eliminar categorías',
	},

	{
		id: 10,
		name: 'Crear diseños de tarjetas',
		code: 'CREATE_CARD_DESIGNS',
		description: 'Otorga permisos para crear diseños de tarjetas',
	},
	{
		id: 11,
		name: 'Editar diseños de tarjetas',
		code: 'EDIT_CARD_DESIGNS',
		description: 'Otorga permisos para editar diseños de tarjetas',
	},
	{
		id: 12,
		name: 'Eliminar diseños de tarjetas',
		code: 'DELETE_CARD_DESIGNS',
		description: 'Otorga permisos para eliminar diseños de tarjetas',
	},

	{
		id: 13,
		name: 'Acceso total a los usuarios del sistema',
		code: 'ACCESS_ALL_SYSTEM_USERS',
		description: 'Administrador - Supervisor',
	},
	{
		id: 14,
		name: 'Acceso a los usuarios del sistema de mi entidad',
		code: 'ACCESS_ENTITY_SYSTEM_USERS',
		description: 'Dueño de negocio – Responsable de entidad emisora',
	},
	{
		id: 15,
		name: 'Acceso a crear usuarios del sistema',
		code: 'CREATE_SYSTEM_USERS',
		description: 'Dueño de negocio – Responsable de entidad emisora',
	},
	{
		id: 16,
		name: 'Acceso a editar usuarios del sistema',
		code: 'EDIT_SYSTEM_USERS',
		description: 'Dueño de negocio – Responsable de entidad emisora',
	},
	{
		id: 17,
		name: 'Acceso a eliminar usuarios del sistema',
		code: 'DELETE_SYSTEM_USERS',
		description: 'Dueño de negocio – Responsable de entidad emisora',
	},

	{
		id: 18,
		name: 'Acceso a todas las cuentas',
		code: 'ACCESS_ALL_ACCOUNTS',
		description: 'Otorga acceso para ver todas las cuentas',
	},
	{
		id: 19,
		name: 'Acceso a cuentas de propia entidad',
		code: 'ACCESS_OWN_ACCOUNTS',
		description: 'Otorga acceso para ver cuentas de propia entidad',
	},
	{
		id: 20,
		name: 'Acceso a recargar cuentas',
		code: 'ACCESS_ACCOUNT_RELOAD',
		description: 'Otorga acceso para recargar cuentas',
	},
	{
		id: 21,
		name: 'Acceso a editar cuentas',
		code: 'ACCESS_ACCOUNT_EDIT',
		description: 'Otorga acceso para editar cuentas',
	},
	{
		id: 22,
		name: 'Acceso a todas las solicitudes',
		code: 'ACCESS_ALL_REQUESTS',
		description: 'Otorga acceso para ver todas las solicitudes',
	},
	{
		id: 23,
		name: 'Acceso a solicitudes de propia entidad',
		code: 'ACCESS_OWN_REQUESTS',
		description: 'Otorga acceso para ver solicitudes de propia entidad',
	},

	{
		id: 24,
		name: 'Acceso a todos los roles',
		code: 'ACCESS_ALL_ROLES',
		description: 'Otorga acceso para ver todos los roles',
	},
	{
		id: 25,
		name: 'Crear roles',
		code: 'CREATE_ROLES',
		description: 'Otorga permisos para crear roles',
	},
	{
		id: 26,
		name: 'Editar roles',
		code: 'EDIT_ROLES',
		description: 'Otorga permisos para editar roles',
	},
	{
		id: 27,
		name: 'Eliminar roles',
		code: 'DELETE_ROLES',
		description: 'Otorga permisos para eliminar roles',
	},
	{
		id: 28,
		name: 'Acceso a todas las tarjetas',
		code: 'ACCESS_ALL_CARDS',
		description: 'Otorga acceso para ver todas las tarjetas',
	},
	{
		id: 29,
		name: 'Acceso a tarjetas de propia entidad',
		code: 'ACCESS_OWN_CARDS',
		description: 'Otorga acceso para ver tarjetas de propia entidad',
	},
	{
		id: 30,
		name: 'Acceso a tarjetas pendientes de entrega',
		code: 'ACCESS_PENDING_DELIVERY_CARDS',
		description: 'Otorga acceso para ver tarjetas pendientes de entrega',
	},
	{
		id: 31,
		name: 'Acceso a tarjetas entregadas',
		code: 'ACCESS_DELIVERED_CARDS',
		description: 'Otorga acceso para ver tarjetas entregadas',
	},
	{
		id: 32,
		name: 'Acceso a asignación de tarjetas',
		code: 'ACCESS_CARD_ASSIGNMENT',
		description: 'Otorga acceso para asignar tarjetas',
	},
	{
		id: 33,
		name: 'Acceso a todos los permisos',
		code: 'ACCESS_ALL_PERMISSIONS',
		description: 'Otorga acceso para ver todos los permisos',
	},
	{
		id: 34,
		name: 'Acceso a todas las transacciones',
		code: 'ACCESS_ALL_TRANSACTIONS',
		description: 'Otorga acceso para ver todas las transacciones',
	},
	{
		id: 35,
		name: 'Acceso a transacciones de propia entidad',
		code: 'ACCESS_ENTITY_TRANSACTIONS',
		description: 'Otorga acceso para ver transacciones de propia entidad',
	},
	{
		id: 36,
		name: 'Exportar transacciones',
		code: 'EXPORT_TRANSACTIONS',
		description: 'Otorga acceso para exportar transacciones',
	},
	{
		id: 37,
		name: 'Acceso a todos las trazas',
		code: 'ACCESS_ALL_TRACES',
		description: 'Otorga acceso para ver todas las trazas',
	},
	{
		id: 38,
		name: 'Acceso a trazas de propia entidad',
		code: 'ACCESS_ENTITY_TRACES',
		description: 'Otorga acceso para ver trazas de propia entidad',
	},
	{
		id: 39,
		name: 'Exportar trazas',
		code: 'EXPORT_TRACES',
		description: 'Otorga acceso para exportar trazas',
	},
	{
		id: 40,
		name: 'Acceso a todos los rankings de categorías',
		code: 'ACCESS_ALL_CATEGORY_RANKINGS',
		description: 'Otorga acceso para ver todos los rankings de categorías',
	},
	{
		id: 41,
		name: 'Acceso a rankings de categorías de propia entidad',
		code: 'ACCESS_ENTITY_CATEGORY_RANKINGS',
		description:
			'Otorga acceso para ver rankings de categorías de propia entidad',
	},
	{
		id: 42,
		name: 'Exportar rankings de categorías',
		code: 'EXPORT_CATEGORY_RANKINGS',
		description: 'Otorga acceso para exportar rankings de categorías',
	},
	{
		id: 43,
		name: 'Acceso a todo el panel de control',
		code: 'ACCESS_ALL_DASHBOARD',
		description: 'Otorga acceso para ver todo el panel de control',
	},
	{
		id: 44,
		name: 'Acceso al panel de control de propia entidad',
		code: 'ACCESS_ENTITY_DASHBOARD',
		description: 'Otorga acceso para ver el panel de control de propia entidad',
	},
];
/*
module.exports = {
  up: (queryInterface: any, Sequelize: Sequelize) => {
    return queryInterface.bulkInsert("Permissions", [
      // 1
      {
        code: "ACCESS_ALL_ENTITIES",
        name: "Acceso a todas las entidades",
        description: "Otorga acceso para ver todas las entidades",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 2
      {
        code: "ACCESS_OWN_ENTITIES",
        name: "Acceso a propias entidades",
        description: "Otorga acceso para ver las propias entidades",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 3
      {
        code: "CREATE_ENTITIES",
        name: "Crear entidades",
        description: "Otorga permisos para crear entidades",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 4
      {
        code: "EDIT_ENTITIES",
        name: "Editar entidades",
        description: "Otorga permisos para editar entidades",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 5
      {
        code: "DELETE_ENTITIES",
        name: "Eliminar entidades",
        description: "Otorga permisos para eliminar entidades",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 6
      {
        code: "AVAILABLE_ENTITIES",
        name: "Entidades disponibles para crear cuenta",
        description: "Otorga permisos para ver entidades disponibles",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 7
      {
        code: "CREATE_CATEGORIES",
        name: "Crear categorías",
        description: "Otorga permisos para crear categorías",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 8
      {
        code: "EDIT_CATEGORIES",
        name: "Editar categorías",
        description: "Otorga permisos para editar categorías",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 9
      {
        code: "DELETE_CATEGORIES",
        name: "Eliminar categorías",
        description: "Otorga permisos para eliminar categorías",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 10
      {
        code: "CREATE_CARD_DESIGNS",
        name: "Crear diseños de tarjetas",
        description: "Otorga permisos para crear diseños de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 11
      {
        code: "EDIT_CARD_DESIGNS",
        name: "Editar diseños de tarjetas",
        description: "Otorga permisos para editar diseños de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 12
      {
        code: "DELETE_CARD_DESIGNS",
        name: "Eliminar diseños de tarjetas",
        description: "Otorga permisos para eliminar diseños de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 13
      //USUARIOS
      {
        code: "ACCESS_ALL_SYSTEM_USERS",
        name: "Acceso total a los usuarios del sistema",
        description: "Administrador - Supervisor",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 14
      {
        code: "ACCESS_ENTITY_SYSTEM_USERS",
        name: "Acceso a los usuarios del sistema de mi entidad",
        description: "Dueño de negocio – Responsable de entidad emisora",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 15
      {
        code: "CREATE_SYSTEM_USERS",
        name: "Acceso a crear usuarios del sistema",
        description: "Dueño de negocio – Responsable de entidad emisora",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 16
      {
        code: "EDIT_SYSTEM_USERS",
        name: "Acceso a editar usuarios del sistema",
        description: "Dueño de negocio – Responsable de entidad emisora",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 17
      {
        code: "DELETE_SYSTEM_USERS",
        name: "Acceso a eliminar usuarios del sistema",
        description: "Dueño de negocio – Responsable de entidad emisora",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 18
      // Permisos de Cuentas
      {
        code: "ACCESS_ALL_ACCOUNTS",
        name: "Acceso a todas las cuentas",
        description: "Otorga acceso para ver todas las cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 19
      {
        code: "ACCESS_OWN_ACCOUNTS",
        name: "Acceso a cuentas de propia entidad",
        description: "Otorga acceso para ver cuentas de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 20
      {
        code: "ACCESS_ACCOUNT_RELOAD",
        name: "Acceso a recargar cuentas",
        description: "Otorga acceso para recargar cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 21
      {
        code: "ACCESS_ACCOUNT_EDIT",
        name: "Acceso a editar cuentas",
        description: "Otorga acceso para editar cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 22
      // Permisos de Solicitudes
      {
        code: "ACCESS_ALL_REQUESTS",
        name: "Acceso a todas las solicitudes",
        description: "Otorga acceso para ver todas las solicitudes",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 23
      {
        code: "ACCESS_OWN_REQUESTS",
        name: "Acceso a solicitudes de propia entidad",
        description: "Otorga acceso para ver solicitudes de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 24
      // Permisos de Roles
      {
        code: "ACCESS_ALL_ROLES",
        name: "Acceso a todos los roles",
        description: "Otorga acceso para ver todos los roles",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 25
      {
        code: "CREATE_ROLES",
        name: "Crear roles",
        description: "Otorga permisos para crear roles",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 26
      {
        code: "EDIT_ROLES",
        name: "Editar roles",
        description: "Otorga permisos para editar roles",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 27
      {
        code: "DELETE_ROLES",
        name: "Eliminar roles",
        description: "Otorga permisos para eliminar roles",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 28
      // Permisos de Tarjetas
      {
        code: "ACCESS_ALL_CARDS",
        name: "Acceso a todas las tarjetas",
        description: "Otorga acceso para ver todas las tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 29
      {
        code: "ACCESS_OWN_CARDS",
        name: "Acceso a tarjetas de propia entidad",
        description: "Otorga acceso para ver tarjetas de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 30
      {
        code: "ACCESS_PENDING_DELIVERY_CARDS",
        name: "Acceso a tarjetas pendientes de entrega",
        description: "Otorga acceso para ver tarjetas pendientes de entrega",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 31
      {
        code: "ACCESS_DELIVERED_CARDS",
        name: "Acceso a tarjetas entregadas",
        description: "Otorga acceso para ver tarjetas entregadas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 32
      {
        code: "ACCESS_CARD_ASSIGNMENT",
        name: "Acceso a asignación de tarjetas",
        description: "Otorga acceso para asignar tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 33
      // Permisos Generales
      {
        code: "ACCESS_ALL_PERMISSIONS",
        name: "Acceso a todos los permisos",
        description: "Otorga acceso para ver todos los permisos",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 34
      // Transacciones
      {
        code: "ACCESS_ALL_TRANSACTIONS",
        name: "Acceso a todas las transacciones",
        description: "Otorga acceso para ver todas las transacciones",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 35
      {
        code: "ACCESS_ENTITY_TRANSACTIONS",
        name: "Acceso a transacciones de propia entidad",
        description: "Otorga acceso para ver transacciones de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 36
      {
        code: "EXPORT_TRANSACTIONS",
        name: "Exportar transacciones",
        description: "Otorga acceso para exportar transacciones",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 37
      // Rastros
      {
        code: "ACCESS_ALL_TRACES",
        name: "Acceso a todos los rastros",
        description: "Otorga acceso para ver todos los rastros",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 38
      {
        code: "ACCESS_ENTITY_TRACES",
        name: "Acceso a rastros de propia entidad",
        description: "Otorga acceso para ver rastros de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 39
      {
        code: "EXPORT_TRACES",
        name: "Exportar rastros",
        description: "Otorga acceso para exportar rastros",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 40
      // Rankings de Categorías
      {
        code: "ACCESS_ALL_CATEGORY_RANKINGS",
        name: "Acceso a todos los rankings de categorías",
        description: "Otorga acceso para ver todos los rankings de categorías",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 41
      {
        code: "ACCESS_ENTITY_CATEGORY_RANKINGS",
        name: "Acceso a rankings de categorías de propia entidad",
        description:
          "Otorga acceso para ver rankings de categorías de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 42
      {
        code: "EXPORT_CATEGORY_RANKINGS",
        name: "Exportar rankings de categorías",
        description: "Otorga acceso para exportar rankings de categorías",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 43
      // Panel de Control
      {
        code: "ACCESS_ALL_DASHBOARD",
        name: "Acceso a todo el panel de control",
        description: "Otorga acceso para ver todo el panel de control",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // 44
      {
        code: "ACCESS_ENTITY_DASHBOARD",
        name: "Acceso al panel de control de propia entidad",
        description:
          "Otorga acceso para ver el panel de control de propia entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
 */
