import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { selectUserSession } from "../../store/userSessionSlice";
import { useSelector } from "react-redux";
import { useAppSelector } from "../../store/hooks";

const tiers = [
  {
    licence: "FREE",
    name: "Gratis",
    href: "https://api.whatsapp.com/send?phone=5359112215",
    priceMonthly: 0,
    description: "Haz tu negocio accesible desde cualquier lugar",
    includedFeatures: [
      "Hasta 50 productos",
      "Carta de venta/Menú público en internet y accesible desde cualquier dispositivo digital",
      "Soporte técnico: Lunes a jueves de 2PM a 5PM",
    ],
  },
  {
    licence: "STANDARD",
    name: "Básico",
    href: "https://api.whatsapp.com/send?phone=5359112215",
    priceMonthly: 30,
    description: "Todo lo básico para empezar con tu nuevo negocio",
    includedFeatures: [
      "Hasta 150 productos/servicios",
      "Carta de venta/Menú de público en internet y accesible desde cualquier dispositivo digital",
      "Hasta 3 áreas de almacén",
      "1 Punto de venta (caja) ",
      "1 área de procesado",
      "Hasta 5 usuarios",
      "Gestión de órdenes ilimitadas",
      "Reportes estadísticos de ventas.",
      "Soporte técnico: lunes a viernes de 8AM a 5PM",
      "Capacitación durante montaje inicial del sistema",
    ],
  },
  {
    licence: "POPULAR",
    name: "Popular",
    href: "https://api.whatsapp.com/send?phone=5359112215",
    priceMonthly: 50,
    description:
      "Las herramientas que necesitas para llevar tu negocio al próximo nivel",
    includedFeatures: [
      "Hasta 500 productos/servicios con múltiples imágenes",
      "Carta de venta/Menú de público en internet y accesible desde cualquier dispositivo digital",
      "Gestión ilimitada de almacenes",
      "Hasta 3 Puntos de venta (Cajas)",
      "Hasta 3 área de procesado",
      "Hasta 15 usuarios",
      "Gestión ilimitada de clientes",
      "Set completo de reportes estadísticos y análisis de datos",
      "Gestión de órdenes ilimitadas",
      "Multimonedas",
      "Soporte técnico: lunes a viernes de 8AM a 5PM",
      "Capacitación durante montaje inicial del sistema",
    ],
  },
  {
    licence: "FULL",
    name: "Profesional",
    href: "https://api.whatsapp.com/send?phone=5359112215",
    priceMonthly: 100,
    description:
      "Maximiza tus ventas y optimiza tus procesos con herramientas profesionales",
    includedFeatures: [
      "Productos y servicios ilimitados con múltiples imágenes",
      "Carta de venta/Menú de cara a público en internet con dominio personalizado .com y dos cuentas de correo gratis con 3GB de almacenamiento",
      "Gestión ilimitada de áreas de almacén",
      "Gestión ilimitada de Puntos de venta (cajas)",
      "Gestión ilimitada de áreas de procesados",
      "Gestión ilimitada de usuarios",
      "Gestión de órdenes ilimitadas",
      "Gestión ilimitada de clientes",
      "Set completo de reportes estadísticos y análisis de datos",
      "Gestión de cuentas bancarias ilimitadas",
      "Multimonedas",
      "Soporte técnico: 24 horas",
      "Capacitación a demanda del cliente",
    ],
  },
];

export default function Example() {
  const [planSelected, setPlanSelected] = useState("monthly");
  const {business} = useAppSelector(state=>state.init);
  const Licence = business.subscriptionPlan.code;
  const activePlanClass = `relative w-1/2 whitespace-nowrap rounded-md border-gray-200 bg-white py-2 text-sm font-medium text-gray-900 shadow-sm focus:z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-auto sm:px-8`;
  const inActivePlanClass = `relative ml-0.5 w-1/2 whitespace-nowrap rounded-md border border-transparent py-2 text-sm font-medium text-gray-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-auto sm:px-8`;
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl py-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-center">
            Planes de precios
          </h1>

          <div className="relative mt-6 flex self-center rounded-lg bg-gray-100 p-0.5 sm:mt-8">
            <button
              onClick={() => setPlanSelected("monthly")}
              type="button"
              className={
                planSelected === "monthly" ? activePlanClass : inActivePlanClass
              }
            >
              Facturación mensual
            </button>
            <button
              onClick={() => setPlanSelected("yearly")}
              type="button"
              className={
                planSelected === "yearly" ? activePlanClass : inActivePlanClass
              }
            >
              Facturación anual
            </button>
          </div>
        </div>
        <div
          className={`mt-12 space-y-4 sm:mt-16 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:mx-auto lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-4`}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`${
                tier.licence === Licence
                  ? "shadow-primary shadow-lg"
                  : "shadow-sm"
              }  divide-y divide-gray-200 rounded-lg border border-gray-200`}
            >
              <div className="p-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">
                  {tier.name}
                </h2>
                <p className="mt-4 text-sm text-gray-500">{tier.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    $
                    {planSelected === "yearly"
                      ? tier.priceMonthly * 12 -
                        (tier.priceMonthly * 12 * 40) / 100
                      : tier.priceMonthly}
                  </span>{" "}
                  <span className="text-base font-medium text-gray-500">
                    {planSelected === "monthly" ? "/mes" : "/año"}
                  </span>
                </p>
                {tier.licence === Licence ? (
                  <p className="mt-8 block w-full rounded-md border bg-primary cursor-default py-2 text-center text-sm font-semibold text-white hover:bg-gray-900">
                    Plan activo
                  </p>
                ) : (
                  <a
                    href={tier.href}
                    rel="noreferrer"
                    target="_blank"
                    className="mt-8 block w-full rounded-md border border-gray-800 bg-gray-800 py-2 text-center text-sm font-semibold text-white hover:bg-gray-900"
                  >
                    {tier.name === "Gratis"
                      ? tier.name
                      : "Comprar " + tier.name}
                  </a>
                )}
              </div>
              <div className="px-6 pt-6 pb-8">
                <h3 className="text-sm font-medium text-gray-900">
                  ¿Qué incluye?
                </h3>
                <ul className="mt-6 space-y-4">
                  {tier.includedFeatures.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="h-5 w-5 flex-shrink-0 text-green-500"
                        aria-hidden="true"
                      />
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="bg-secondary/95 text-white p-4 rounded-md mt-5">
          Si ninguno de estos planes se ajusta a su negocio, también ofrecemos
          personalizaciones que se adaptan a sus necesidades. No dude en
          contactarnos para obtener más información.
        </p>
      </div>
    </div>
  );
}
