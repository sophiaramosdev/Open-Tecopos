import { SelectInterface } from "../interfaces/InterfacesLocal";

export const wooOrderFlow = [
  {
    code: "PAYMENT_PENDING",
    beforeHop: ["WITH_ERRORS"],
    nextHop: ["CANCELLED", "BILLED"],
  },
  {
    code: "WITH_ERRORS",
    beforeHop: [],
    nextHop: ["CANCELLED", "PAYMENT_PENDING"],
  },
  {
    code: "CANCELLED",
    beforeHop: [
      "WITH_ERRORS",
      "PAYMENT_PENDING",
      "BILLED",
      "IN_PROCESS",
      "COMPLETED",
      "REFUNDED",
    ],
    nextHop: [],
  },
  {
    code: "BILLED",
    beforeHop: ["PAYMENT_PENDING"],
    nextHop: ["IN_PROCESS", "REFUNDED", "COMPLETED"],
  },
  {
    code: "IN_PROCESS",
    beforeHop: ["BILLED"],
    nextHop: ["COMPLETED", "REFUNDED"],
  },
  {
    code: "COMPLETED",
    beforeHop: ["IN_PROCESS", "BILLED"],
    nextHop: ["REFUNDED"],
  },
  {
    code: "REFUNDED",
    beforeHop: ["BILLED", "IN_PROCESS", "COMPLETED"],
    nextHop: [],
  },
];

export const onlineOrderFlow = [
  {
    code: "CREATED",
    beforeHop: [],
    nextHop: ["CANCELLED", "BILLED", "IN_PROCESS"],
  },
  {
    code: "PAYMENT_PENDING",
    beforeHop: [],
    nextHop: ["CANCELLED", "BILLED", "IN_PROCESS"],
  },
  {
    code: "CANCELLED",
    beforeHop: [
      "PAYMENT_PENDING",
      "CREATED",
      "BILLED",
      "IN_PROCESS",
      "COMPLETED",
      "IN_TRANSIT",
      "REFUNDED",
      "DELIVERED",
    ],
    nextHop: [],
  },
  {
    code: "BILLED",
    beforeHop: ["PAYMENT_PENDING", "CREATED"],
    nextHop: ["IN_PROCESS", "REFUNDED", "COMPLETED"],
  },
  {
    code: "IN_PROCESS",
    beforeHop: ["BILLED", "CREATED", "PAYMENT_PENDING", "IN_TRANSIT"],
    nextHop: ["COMPLETED"],
  },
  {
    code: "COMPLETED",
    beforeHop: ["IN_PROCESS", "BILLED"],
    nextHop: ["REFUNDED", "IN_TRANSIT", "DELIVERED"],
  },
  {
    code: "IN_TRANSIT",
    beforeHop: ["COMPLETED", "IN_PROCESS"],
    nextHop: ["DELIVERED"],
  },
  {
    code: "REFUNDED",
    beforeHop: ["BILLED", "COMPLETED"],
    nextHop: [],
  },
  {
    code: "DELIVERED",
    beforeHop: ["IN_TRANSIT", "COMPLETED"],
    nextHop: [],
  },
];

export const productTypes = [
  { id: "STOCK", name: "Almacén" },
  { id: "MANUFACTURED", name: "Procesado" },
  { id: "WASTE", name: "Desperdicio" },
  { id: "RAW", name: "Materia Prima" },
  { id: "ASSET", name: "Activo" },
  { id: "MENU", name: "Menú" },
  { id: "ADDON", name: "Agrego" },
];

export const orderStatus = [
  {
    code: "WITH_ERRORS",
    value: "Con errores",
  },
  {
    code: "CREATED",
    value: "Creada",
  },
  {
    code: "PAYMENT_PENDING",
    value: "Pendiente de pago",
  },
  {
    code: "IN_PROCESS",
    value: "Procesando",
  },
  {
    code: "BILLED",
    value: "Facturada",
  },
  {
    code: "CANCELLED",
    value: "Cancelada",
  },
  {
    code: "REFUNDED",
    value: "Reembolsada",
  },
  {
    code: "COMPLETED",
    value: "Completada",
  },
  {
    code: "IN_TRANSIT",
    value: "En tránsito",
  },
  {
    code: "DELIVERED",
    value: "Entregada",
  },
];

export const productionOrdersStatus: SelectInterface[] = [
  { id: "CREATED", name: "Creada" },
  { id: "ACTIVE", name: "Activa" },
  { id: "CLOSED", name: "Cerrada" },
];

export const daysOfTheWeek: {
  name: string;
  id: number;
}[] = [
  {
    name: "Domingo",
    id: 0,
  },
  {
    name: "Lunes",
    id: 1,
  },
  {
    name: "Martes",
    id: 2,
  },
  {
    name: "Miercoles",
    id: 3,
  },
  {
    name: "Jueves",
    id: 4,
  },
  {
    name: "Viernes",
    id: 5,
  },
  {
    name: "Sábado",
    id: 6,
  },
];
