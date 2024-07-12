import { Fragment, useState } from "react";
import { Dialog, Transition, Disclosure } from "@headlessui/react";
import {
  LockClosedIcon,
  Bars3Icon,
  ShoppingBagIcon,
  ArrowPathRoundedSquareIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
  Cog8ToothIcon,
  BanknotesIcon,
  UserGroupIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  BuildingStorefrontIcon,
  RectangleGroupIcon,
  CreditCardIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";
import { useLocation, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import Modal from "../modals/GenericModal";
import BranchesModal from "./BranchesModal";
import ImageComponent from "../misc/Images/Image";
import { BsPin } from "react-icons/bs";
import { changeStaticBar } from "../../store/slices/sessionSlice";
import { AiOutlineFire } from "react-icons/ai";
import useServer from "../../api/useServerMain";

interface SideBarProps {
  barState: boolean;
  switchSideBar: Function;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface NavChildren {
  name: string;
  href: string;
  current: boolean;
  block?: boolean;
}

interface NavItem {
  name: string;
  icon: any;
  current: boolean;
  href?: string;
  block?: boolean;
  children?: NavChildren[];
}

const SideBar = ({ barState, switchSideBar }: SideBarProps) => {
  const { pathname } = useLocation();
  const mainCurrent = pathname.split("/")[1];
  const secondaryCurrent = pathname.split("/")[2];
  const { business, branches } = useAppSelector((state) => state.init);
  const { staticBar } = useAppSelector((state) => state.session);
  const { allowRoles } = useServer();
  const plan = business?.subscriptionPlan.code;
  const block = plan === "FREE";
  const moduleAccount = business?.configurationsKey.find(
    (item) => item.key === "module_accounts"
  )?.value;
  const module_booking =
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true";

  const dispatch = useAppDispatch();

  //NavItems
  const navigation: NavItem[] = [];
  //Home
  if (allowRoles(["ADMIN", "ANALYSIS_REPORT"]))
    navigation.push({
      name: "Inicio",
      href: "/",
      icon: HomeIcon,
      current: mainCurrent === "",
      block,
    });
  //Stocks
  if (allowRoles(["ADMIN", "MANAGER_AREA", "ANALYSIS_REPORT", "BUYER"])) {
    const children = [];

    if (allowRoles(["BUYER"]))
      children.push({
        name: "Compras (IRM)",
        href: `/stocks/receipt`,
        current: secondaryCurrent === "receipt" && mainCurrent === "stocks",
        block,
      });

    if (allowRoles(["ADMIN", "ANALYSIS_REPORT", "MANAGER_AREA"]))
      children.push({
        name: "Análisis",
        href: `/stocks/analysis`,
        current: secondaryCurrent === "analysis" && mainCurrent === "stocks",
        block,
      });

    if (
      business?.configurationsKey.find((itm) => itm.key === "visual_dispatches")
        ?.value === "true" &&
      allowRoles(["ADMIN", "MANAGER_AREA"])
    ) {
      children.unshift({
        name: "Despachos",
        href: `/stocks/dispatches`,
        current: secondaryCurrent === "dispatches" && mainCurrent === "stocks",
        block,
      });
    }

    if (allowRoles(["ADMIN", "MANAGER_AREA"]))
      children.unshift({
        name: "Todos",
        href: `/stocks`,
        current: !secondaryCurrent && mainCurrent === "stocks",
        block,
      });

    navigation.push({
      name: "Mis almacenes",
      icon: RectangleGroupIcon,
      current: mainCurrent === "stocks",
      block,
      children,
    });
  }
  
  //Products
  if (
    allowRoles([
      "ADMIN",
      "MANAGER_COST_PRICES",
      "PRODUCT_PROCESATOR",
      "MANAGER_BILLING",
      "MANAGER_SALES",
      "MANAGER_SHIFT",
      "MARKETING_SALES",
    ])
  ) {
    const children = allowRoles([
      "ADMIN",
      "MANAGER_COST_PRICES",
      "PRODUCT_PROCESATOR",
    ])
      ? [
          {
            name: "Todos",
            href: "products/all",
            current: secondaryCurrent === "all" && mainCurrent === "products",
            block,
          },
          {
            name: "Carta de venta",
            href: "products/sales",
            current: secondaryCurrent === "sales" && mainCurrent === "products",
          },
          {
            name: "Categorías de venta",
            href: "products/sales_categories",
            current: secondaryCurrent === "sales_categories",
          },
          {
            name: "Categorías de almacén",
            href: "products/general_categories",
            current: secondaryCurrent === "general_categories",
            block,
          },
        ]
      : [
          {
            name: "Carta de venta",
            href: "products/sales",
            current: secondaryCurrent === "sales" && mainCurrent === "products",
          },
        ];

    if (
      process.env.REACT_APP_MODE !== "LOCAL" &&
      allowRoles(["ADMIN", "MANAGER_COST_PRICES", "PRODUCT_PROCESATOR"])
    ) {
      children.push({
        name: "Cupones",
        href: block ? "#" : "/products/cupons",
        current: pathname.includes("/products/cupons"),
        block,
      });
    }
    if (module_booking) {
      children.push({
        name: "Recursos",
        href: block ? "#" : "/products/resources",
        current: pathname.includes("/products/resources"),
        block,
      });
    }
    navigation.push({
      name: "Mis productos",
      icon: ShoppingBagIcon,
      current: mainCurrent === "products",
      children,
    });
  }

  //Órdenes de Producción
  if (
    business?.configurationsKey.find((itm) => itm.key === "module_production")
      ?.value === "true" &&
    allowRoles([
      "ADMIN",
      "CHIEF_PRODUCTION",
      "MANAGER_PRODUCTION",
      "MANAGER_COST_PRICES",
    ])
  ) {
    const children = [
      {
        name: "Órdenes",
        href: "/orders",
        current: mainCurrent === "orders" && !secondaryCurrent,
        block,
      },
    ];
    if (allowRoles(["ADMIN", "MANAGER_COST_PRICES"]))
      children.push({
        name: "Recetario",
        href: "/orders/recipes",
        current: mainCurrent === "orders" && secondaryCurrent === "recipes",
        block,
      });

    navigation.push({
      name: "Producción",
      icon: AiOutlineFire,
      current: pathname.includes("/orders"),
      children,
    });
  }

  //Economic Cycles
  if (
    business?.configurationsKey.find(
      (itm) => itm.key === "visual_economic_cycles"
    )?.value === "true" &&
    allowRoles([
      "ADMIN",
      "MANAGER_ECONOMIC_CYCLE",
      "MANAGER_SHIFT",
      "MANAGER_SALES",
      "ANALYSIS_REPORT",
      "MANAGER_AREA"
    ])
  ) {
    const children = [];

    if (
      allowRoles([
        "ADMIN",
        "MANAGER_ECONOMIC_CYCLE",
        "MANAGER_SHIFT",
        "MANAGER_SALES",
      ])
    ) {
      children.push({
        name: "Todos",
        href: "/ecocycle",
        current: mainCurrent === "ecocycle" && !secondaryCurrent,
        block,
      });
    }

    if (
      business?.configurationsKey.find(
        (itm) => itm.key === "pos_allow_pending_payment"
      )?.value === "true" &&
      allowRoles(["ADMIN", "MANAGER_ECONOMIC_CYCLE"])
    ) {
      children.push({
        name: "Cuentas por cobrar",
        href: "/ecocycle/accounts",
        current: mainCurrent === "ecocycle" && secondaryCurrent === "accounts",
        block,
      });
    }
    if (allowRoles(["ADMIN", "ANALYSIS_REPORT"])) {
      children.push({
        name: "Análisis",
        href: "/ecocycle/analysis",
        current: mainCurrent === "ecocycle" && secondaryCurrent === "analysis",
        block,
      });
    }
    navigation.push({
      name: "Ciclos económicos",
      icon: ArrowPathRoundedSquareIcon,
      current: pathname.includes("/ecocycle"),
      children,
    });
  }

  //Cuentas bancarias
  if (
    moduleAccount === "true" &&
    allowRoles(["MANAGER_CONTABILITY", "ANALYSIS_REPORT"])
  ) {
    const children = [
      {
        name: "Reportes",
        href: "/bank_accounts/reports",
        current:
          mainCurrent === "bank_accounts" && secondaryCurrent === "reports",
        block,
      },
      {
        name: "Mis listas",
        href: "/bank_accounts/lists",
        current:
          mainCurrent === "bank_accounts" && secondaryCurrent === "lists",
        block,
      },
    ];

    if (allowRoles(["MANAGER_CONTABILITY"]))
      children.unshift({
        name: "Todas",
        href: "/bank_accounts",
        current: mainCurrent === "bank_accounts" && !secondaryCurrent,
        block,
      });

    navigation.push(
      //Bank Accounts
      {
        name: "Cuentas bancarias",
        icon: CreditCardIcon,
        current: pathname.includes("/bank_accounts"),
        children,
      }
    );
  }

  //Human Resources
  if (
    business?.configurationsKey.find(
      (item) => item.key === "visual_human_resources"
    )?.value === "true"
  ) {
    const humanResourcesChildren_without_module_production = [
      {
        name: "Usuarios",
        href: "/human_resources/users",
        current:
          mainCurrent === "human_resources" && secondaryCurrent === "users",
        block,
      },
    ];

    const humanResourcesChildren_with_module_production = [
      
      {
        name: "Categorías",
        href: "/human_resources/categories",
        current:
          mainCurrent === "human_resources" &&
          secondaryCurrent === "categories",
        block,
      },
      {
        name: "Cargos",
        href: "/human_resources/post",
        current:
          mainCurrent === "human_resources" && secondaryCurrent === "post",
        block,
      },
      /*{
        name: "Nómina",
        href: "/human_resources/payroll",
        current:
          mainCurrent === "human_resources" && secondaryCurrent === "payroll",
        block,
      },*/
      {
        name: "Registro de asistencia",
        href: "/human_resources/access",
        current:
          mainCurrent === "human_resources" && secondaryCurrent === "access",
        block,
      },
      // {
      //   name: "Salarios",
      //   href: "/human_resources/salary",
      //   current:
      //     mainCurrent === "human_resources" && secondaryCurrent === "salary",
      //   block,
      // },
    ];

    if(allowRoles(["ADMIN"])) humanResourcesChildren_with_module_production.unshift({
      name: "Plantilla",
      href: "/human_resources/people",
      current:
        mainCurrent === "human_resources" && secondaryCurrent === "people",
      block,
    },)

    const hasModuleHumanResources = business?.configurationsKey.find(
      (itm) => itm.key === "module_human_resources" && itm.value === "true"
    );

    allowRoles(["ADMIN", "MANAGER_HUMAN_RESOURCES"]) &&
      navigation.push({
        name: "Capital humano",
        icon: UserGroupIcon,
        current: pathname.includes("/human_resources"),
        children: hasModuleHumanResources
          ? humanResourcesChildren_with_module_production
          : humanResourcesChildren_without_module_production,
      });

    if (hasModuleHumanResources) {
      const commonChildren = [
        {
          name: "Generador",
          href: "/salary/generator",
          current: mainCurrent === "salary" && secondaryCurrent === "generator",
          block,
        },
      ];

      const ownerChildren = [
        ...commonChildren,
        {
          name: "Reglas",
          href: "/salary/rules",
          current: mainCurrent === "salary" && secondaryCurrent === "rules",
          block,
        },
        {
          name: "Históricos",
          href: "/salary/historical",
          current:
            mainCurrent === "salary" && secondaryCurrent === "historical",
          block,
        },
      ];

      const groupOwnerChildren = [
        ...commonChildren,
        {
          name: "Históricos",
          href: "/salary/historical",
          current:
            mainCurrent === "salary" && secondaryCurrent === "historical",
          block,
        },
      ];

      const children = allowRoles(["ADMIN", "MANAGER_SALARY_RULES"])
        ? ownerChildren
        : groupOwnerChildren;

      if (allowRoles(["ADMIN", "MANAGER_SALARY_RULES"])) {
        navigation.push({
          name: "Salarios",
          icon: BanknotesIcon,
          current: pathname.includes("/salary"),
          children,
        });
      }
    }
  }

  //Clients
  if (
    business?.configurationsKey.find((itm) => itm.key === "visual_customers")
      ?.value === "true" &&
    allowRoles(["ADMIN", "MANAGER_SHOP_ONLINE", "MANAGER_CUSTOMERS"])
  )
    navigation.push({
      name: "Clientes",
      icon: UsersIcon,
      current: pathname.includes("/clients"),
      href: "/clients",
      block,
      children: [
        {
          name: "Todos",
          href: block ? "#" : "/clients/all",
          current: pathname.includes("/clients/all"),
          block,
        },
        {
          name: "Categorías",
          href: block ? "#" : "/clients/categories",
          current: pathname.includes("/clients/categories"),
          block,
        },
      ],
    });

  //Suppliers
  if (
    business?.configurationsKey.find((itm) => itm.key === "visual_suppliers")
      ?.value === "true" &&
    allowRoles(["ADMIN", "MANAGER_SUPPLIERS"])
  )
    navigation.push({
      name: "Proveedores",
      icon: TruckIcon,
      current: pathname.includes("/suppliers"),
      href: block ? "#" : "/suppliers",
      block,
    });

  //Facturación
  if (
    business?.configurationsKey.find((itm) => itm.key === "module_billing")
      ?.value === "true" &&
    allowRoles([
      "ADMIN",
      "MANAGER_SALES",
      "MANAGER_SHIFT",
      "MANAGER_BILLING",
      "MARKETING_SALES",
    ])
  ) {
    const children = [
      // {
      //   name: "Resumen",
      //   href: block ? "#" : "/billing/resume",
      //   current: pathname.includes("/billing/resume"),
      //   block,
      // },
      {
        name: "Registros",
        href: block ? "#" : "/billing/registers",
        current: pathname.includes("/billing/registers"),
        block,
      },
      {
        name: "Pagos anticipados",
        href: block ? "#" : "/billing/prepaid",
        current: pathname.includes("/billing/prepaid"),
        block,
      },
      {
        name: "Pagos vencidos",
        href: block ? "#" : "/billing/overdue_payments",
        current: pathname.includes("/billing/overdue_payments"),
        block,
      },
    ];

    if (
      !allowRoles(
        [
          "ADMIN",
          "MANAGER_SALES",
          "OWNER",
          "MANAGER_BILLING",
          "MARKETING_SALES",
        ],
        true
      )
    ) {
      children.shift();
    }

    if (
      !allowRoles(["ADMIN", "MANAGER_SHIFT", "OWNER", "MANAGER_BILLING"], true)
    ) {
      children.splice(1, 2);
    }

    allowRoles(["ADMIN", "OWNER", "MANAGER_BILLING", "ANALYSIS_REPORT"]) &&
      children.push({
        name: "Análisis",
        href: block ? "#" : "/billing/analysis",
        current: pathname.includes("/billing/analysis"),
        block,
      });

    navigation.push({
      name: "Facturación",
      icon: ClipboardDocumentListIcon,
      current: mainCurrent === "billing",
      href: block ? "#" : "billing",
      children,
    });
  }

  //Reservaciones
  if (
    business?.configurationsKey.find((itm) => itm.key === "module_booking")
      ?.value === "true" && allowRoles(["ADMIN", "MANAGER_SALES", "MARKETING_SALES"])
  ) {
    navigation.push({
      name: "Reservaciones",
      icon: CalendarIcon,
      current: mainCurrent === "reservation",
      href: block ? "#" : "reservation",
      children: [
        {
          name: "Calendario",
          href: block ? "#" : "/reservation/calendar",
          current: pathname.includes("/reservation/calendar"),
          block,
        },
        {
          name: "Todas",
          href: block ? "#" : "/reservation/all",
          current: pathname.includes("/reservation/all"),
          block,
        },
        // {
        //   name: "Análisis",
        //   href: block ? "#" : "/reservation/analysis",
        //   current: pathname.includes("/reservation/analysis"),
        //   block,
        // },
        {
          name: "Ajustes",
          href: block ? "#" : "/reservation/adjustment",
          current: pathname.includes("/reservation/adjustment"),
          block,
        },
      ],
    });
  }
  // Análisis
  if (allowRoles(["ADMIN", "ANALYSIS_REPORT"]))
    navigation.push({
      name: "Reportes",
      icon: ArrowTrendingUpIcon,
      current: pathname.includes("/reports"),
      href: block ? "#" : "/reports",
      block,
      /*  children: [
        // {
        //   name: "Cierre contable (Beta)",
        //   href: block ? "#" : "/analysis/balance_sheet",
        //   current: pathname.includes("/analysis/balance_sheet"),
        //   block,
        // },
        {
          name: "Venta por productos",
          href: block ? "#" : "/analysis/selled_products",
          current: pathname.includes("/analysis/selled_products"),
          block,
        },
        {
          name: "Venta por órdenes",
          href: block ? "#" : "/analysis/sale_by_orders",
          current: pathname.includes("/analysis/sale_by_orders"),
          block,
        },
      ], */
    });

  //Tienda
  if (
    process.env.REACT_APP_MODE !== "LOCAL" &&
    business?.configurationsKey.find(
      (conf) => conf.key === "visual_online_shop"
    )?.value === "true" &&
    allowRoles(["ADMIN", "MANAGER_SHOP_ONLINE"])
  ) {
    navigation.push({
      name: "Tienda online",
      icon: BuildingStorefrontIcon,
      current: mainCurrent === "online_shop",
      href: "/online_shop",
    });
  }

  //Cartelera digital
  allowRoles(["MANAGER_TV"]) &&
    navigation.push({
      name: "Cartelera digital",
      icon: PresentationChartBarIcon,
      current: mainCurrent === "cart_digital",
      href: "/cart_digital",
    });

  //Config
  if (
    allowRoles([
      "ADMIN",
      "MANAGER_COST_PRICES",
      "MANAGER_CURRENCIES",
      "MANAGER_CONFIGURATIONS",
      "MANAGER_SALES",
      "MANAGER_SHIFT",
    ])
  ) {
    const children = [];

    if (
      allowRoles(
        [
          "OWNER",
          "ADMIN",
          "MANAGER_CONFIGURATIONS",
          "MANAGER_SALES",
          "MANAGER_SHIFT",
        ],
        true
      )
    ) {
      if (allowRoles(["OWNER", "ADMIN", "MANAGER_CONFIGURATIONS"], true)) {
        children.push(
          {
            name: "Mi negocio",
            href: "/configurations/my_business",
            current: pathname.includes("/configurations/my_business"),
          },
          {
            name: "Mis áreas",
            href: block ? "#" : "/configurations/my_areas",
            current: pathname.includes("/configurations/my_areas"),
            block,
          }
        );
      }
    }

    if (allowRoles(["OWNER", "MANAGER_COST_PRICES"], true)) {
      children.push(
        {
          name: "Sistemas de precios",
          href: block ? "#" : "/configurations/pricessystem",
          current: pathname.includes("/configurations/pricessystem"),
          block,
        },
        {
          name: "Costos fijos",
          href: block ? "#" : "configurations/fixedcosts",
          current: pathname.includes("configurations/fixedcosts"),
          block,
        }
      );
    }

    if (allowRoles(["OWNER", "MANAGER_CURRENCIES"], true)) {
      children.push({
        name: "Monedas",
        href: block ? "#" : "/configurations/currencies",
        current: pathname.includes("/configurations/currencies"),
        block,
      });
    }

    if (
      allowRoles(["MANAGER_CONFIGURATIONS", "MANAGER_SALES", "MANAGER_SHIFT"])
    ) {
      if (
        business?.configurationsKey.find((conf) => conf.key === "delivery_type")
          ?.value === "BYREGION" &&
        allowRoles(["OWNER", "MANAGER_CONFIGURATIONS"], true)
      ) {
        children.push({
          name: "Regiones de envíos",
          href: block ? "#" : "/configurations/regions",
          current: pathname.includes("/configurations/regions"),
          block,
        });
      }

      children.push({
        name: "Ajustes",
        href: block ? "#" : "/configurations/generals",
        current: pathname.includes("/configurations/generals"),
        block,
      });
    }

    navigation.push({
      name: "Configuraciones",
      icon: Cog8ToothIcon,
      current: pathname.includes("configurations"),
      children,
    });
  }

  /* if (
    business?.configurationsKey.find(
      (conf) => conf.key === "module_woocommerce"
    )?.value === "true" &&
    allowRoles(["ADMIN"])
  ) {
    navigation
      .find((item) => item.name === "Cupones")
      ?.children?.unshift({
        name: "Pedidos",
        href: block ? "#" : "/store/orders",
        current: pathname.includes("/store/orders"),
        block,
      });
  }*/

  const [changeBusinessModal, setChangeBusinessModal] = useState(false);

  const [disclosure, setDisclosure] = useState<number | null>(null);

  return (
    <>
      <Transition.Root show={barState} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 md:hidden"
          onClose={() => switchSideBar()}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-gray-800 pt-5 pb-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => switchSideBar()}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                {branches && branches?.length !== 0 ? (
                  <div className="flex px-3 py-4 items-center justify-start group-hover:w-60">
                    <ImageComponent
                      className="flex flex-shrink-0 h-10 w-10 rounded-full overflow-hidden"
                      src={business?.logo?.src ?? null}
                      hash={business?.logo?.blurHash ?? null}
                    />
                    <button
                      className="inline-flex items-center flex-1 focus:outline-none w-full"
                      onTouchEnd={() => setChangeBusinessModal(true)}
                    >
                      <h4 className="flex p-2 text-gray-100 w-full">
                        {business?.name}
                      </h4>

                      <ChevronRightIcon className="h-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex px-3 py-4 items-center justify-start group-hover:w-64">
                    <ImageComponent
                      className="h-10 w-10 rounded-full overflow-hidden flex flex-shrink-0"
                      src={business?.logo?.src ?? null}
                      hash={business?.logo?.blurHash ?? null}
                    />
                    <div className="inline-flex group-hover:flex-shrink-0 items-center w-full focus:outline-none">
                      <h4 className="flex ml-2 items-center text-gray-100">
                        {business?.name}
                      </h4>
                    </div>
                  </div>
                )}
                <div className="flex flex-1 flex-col overflow-y-auto overflow-x-visible scrollbar-thin">
                  <nav className="flex-1 space-y-1 px-2 py-4">
                    {navigation.map((item) =>
                      item.children === undefined ? (
                        <Link
                          key={item.name}
                          to={item.href ?? ""}
                          className={classNames(
                            item.current
                              ? "bg-gray-900 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white",
                            "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                          )}
                          onClick={() => switchSideBar()}
                        >
                          <item.icon
                            className={classNames(
                              item.current
                                ? "text-gray-300"
                                : "text-gray-400 group-hover:text-gray-300",
                              "mr-3 flex-shrink-0 h-6 w-6"
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      ) : (
                        <Disclosure
                          as="div"
                          key={item.name}
                          className="space-y-1"
                        >
                          {({ open }) => (
                            <>
                              <Disclosure.Button
                                className={classNames(
                                  item.current
                                    ? "bg-gray-900 text-white"
                                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                                  "group w-full flex items-center px-2 py-2 text-left text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                )}
                              >
                                <item.icon
                                  className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                                  aria-hidden="true"
                                />
                                <span className="flex-1">{item.name}</span>
                                <svg
                                  className={classNames(
                                    open
                                      ? "text-gray-400 rotate-90"
                                      : "text-gray-300",
                                    "ml-3 h-5 w-5 flex-shrink-0 transform transition-colors duration-150 ease-in-out group-hover:text-gray-400"
                                  )}
                                  viewBox="0 0 20 20"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M6 6L14 10L6 14V6Z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </Disclosure.Button>
                              <Disclosure.Panel className="space-y-1">
                                {item.children &&
                                  item.children.map((subItem) => (
                                    <Disclosure.Button
                                      key={subItem.name}
                                      as={Link}
                                      to={subItem.href ?? ""}
                                      className="group flex w-full items-center rounded-md py-2 pl-11 pr-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                      onClickCapture={() => switchSideBar()}
                                    >
                                      {subItem.name}
                                    </Disclosure.Button>
                                  ))}
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                      )
                    )}
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div
        className={`hidden transition-all ease-in-out duration-200 group md:fixed md:inset-y-0 md:flex ${
          staticBar ? "md:w-64" : "md:w-20 hover:w-64 active:w-64"
        } md:flex-col md:pt-16 shadow-[25px_0_25px_-20px_#10101048] z-30 h-full`}
        onMouseLeave={() =>
          setDisclosure(navigation.findIndex((item) => item.current))
        }
      >
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="relative flex min-h-0 flex-1 flex-col bg-slate-800">
          <div
            className={`flex flex-grow flex-col border-r border-slate-200 bg-slate-800 pt-1 pb-4 ${
              staticBar
                ? "pr-3 overflow-y-scroll scrollbar-none"
                : "group-hover:pr-3 group-hover:overflow-auto group-hover:scrollbar-none"
            }`}
          >
            {allowRoles(["GROUP_OWNER"], true) &&
            branches &&
            branches?.length !== 0 ? (
              <div
                className={`flex px-3 py-4 items-center justify-center ${
                  staticBar
                    ? "w-full"
                    : "group-hover:justify-start group-hover:w-full"
                }`}
              >
                <ImageComponent
                  className="flex flex-shrink-0 h-10 w-10 rounded-full overflow-hidden"
                  src={business?.logo?.src ?? null}
                  hash={business?.logo?.blurHash ?? null}
                />
                <button
                  className={`${
                    staticBar ? "inline-flex" : "hidden group-hover:inline-flex"
                  } items-center flex-1 focus:outline-none w-full`}
                  onClick={() => setChangeBusinessModal(true)}
                >
                  <h4
                    className={`${
                      staticBar ? "flex" : "hidden group-hover:flex"
                    } p-2 text-gray-100 w-full `}
                  >
                    {business?.name}
                  </h4>

                  <ChevronRightIcon className="h-5 text-white" />
                </button>
              </div>
            ) : (
              <div
                className={`flex px-3 py-4 items-center justify-center ${
                  staticBar
                    ? "w-full"
                    : "group-hover:justify-start group-hover:w-64"
                }`}
              >
                <ImageComponent
                  className="h-10 w-10 rounded-full overflow-hidden flex flex-shrink-0"
                  src={business?.logo?.src ?? null}
                  hash={business?.logo?.blurHash ?? null}
                />
                <div
                  className={`${
                    staticBar
                      ? "inline-flex"
                      : "hidden group-hover:inline-flex group-hover:flex-shrink-0"
                  } items-center w-full focus:outline-none`}
                >
                  <h4
                    className={`${
                      staticBar ? "flex" : "hidden group-hover:flex"
                    } ml-2 items-center text-gray-100`}
                  >
                    {business?.name}
                  </h4>
                </div>
              </div>
            )}
            <div className="flex flex-grow flex-col">
              <nav className="flex-1 space-y-1 px-2 py-2">
                {navigation.map((item, idxMaster) =>
                  item.children === undefined ? (
                    <div key={item.name}>
                      <Link
                        to={item.href ?? ""}
                        className={classNames(
                          item.current
                            ? "bg-gray-900 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white",
                          `relative group flex items-center ${
                            staticBar
                              ? ""
                              : "justify-center group-hover:justify-start"
                          } px-2 py-2 text-sm font-medium rounded-md`
                        )}
                      >
                        <item.icon
                          className={classNames(
                            item.current
                              ? "text-gray-300"
                              : "text-gray-400 group-hover:text-gray-300",
                            `${
                              staticBar ? "mr-3" : "group-hover:mr-3"
                            } flex-shrink-0 h-6 w-6`
                          )}
                          aria-hidden="true"
                        />
                        <span
                          className={`${
                            staticBar ? "flex" : "hidden group-hover:flex"
                          } flex-shrink-0`}
                        >
                          {item.name}
                        </span>
                        {item.block && (
                          <LockClosedIcon
                            className={`${
                              staticBar
                                ? "absolute"
                                : "hidden group-hover:absolute"
                            } h-4 right-2`}
                          />
                        )}
                      </Link>
                    </div>
                  ) : (
                    <Disclosure
                      as="div"
                      key={item.name}
                      className="space-y-1"
                      defaultOpen={true}
                    >
                      {({ open, close }) => {
                        if (open && disclosure !== idxMaster) close();
                        return (
                          <>
                            <Disclosure.Button
                              className={classNames(
                                item.current
                                  ? "bg-gray-900 text-white"
                                  : "text-gray-300 hover:bg-gray-900 hover:text-white",
                                `relative group w-full flex  items-center ${
                                  staticBar
                                    ? ""
                                    : "items-center justify-center group-hover:justify-start"
                                } px-2 py-2 text-left text-sm font-medium rounded-md focus:outline-none`
                              )}
                              onClickCapture={() => setDisclosure(idxMaster)}
                            >
                              <item.icon
                                className={classNames(
                                  item.current
                                    ? "text-gray-300"
                                    : "text-gray-400 group-hover:text-gray-300",
                                  `${
                                    staticBar ? "mr-3" : "group-hover:mr-3"
                                  } flex-shrink-0 h-6 w-6 text-center`
                                )}
                                aria-hidden="true"
                              />
                              <span
                                className={`${
                                  staticBar
                                    ? "flex"
                                    : "hidden group-hover:flex flex-shrink-0"
                                }`}
                              >
                                {item.name}
                              </span>
                              <ChevronRightIcon
                                className={classNames(
                                  open
                                    ? "text-gray-500 rotate-90"
                                    : "text-gray-200",
                                  `h-4 w-4 flex-shrink-0 transform transition-colors duration-150 ease-in-out group-hover:text-gray-400 ${
                                    staticBar ? "" : "hidden group-hover:block"
                                  } absolute right-1`
                                )}
                              />
                            </Disclosure.Button>

                            <Disclosure.Panel
                              className={`${
                                staticBar ? "" : "hidden group-hover:block"
                              } space-y-1 pl-4`}
                            >
                              {item.children &&
                                item.children.map((subItem) => (
                                  <Link
                                    key={subItem.name}
                                    to={subItem.href ?? ""}
                                    className={classNames(
                                      subItem.current
                                        ? "bg-gray-600 text-white"
                                        : "text-gray-300 hover:bg-gray-700 hover:text-white",
                                      "relative group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full"
                                    )}
                                  >
                                    <span className="flex flex-shrink-0">
                                      {subItem.name}
                                    </span>
                                    {subItem.block && (
                                      <LockClosedIcon className="h-4 absolute right-2" />
                                    )}
                                  </Link>
                                ))}
                            </Disclosure.Panel>
                          </>
                        );
                      }}
                    </Disclosure>
                  )
                )}
              </nav>

              <div className="flex justify-center items-center mt-16">
                <BsPin
                  className={`text-gray-400 hover:text-gray-100 cursor-pointer ${
                    staticBar ? "" : "rotate-90"
                  }`}
                  onClick={() => dispatch(changeStaticBar())}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/**Ctrol Sidebar Button */}
      {!barState && (
        <button
          type="button"
          className="absolute top-16 z-50 py-2 px-4 mt-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500 md:hidden"
          onClick={() => switchSideBar()}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {changeBusinessModal && (
        <Modal
          state={changeBusinessModal}
          close={() => setChangeBusinessModal(false)}
        >
          <BranchesModal closeModal={() => setChangeBusinessModal(false)} />
        </Modal>
      )}
    </>
  );
};

export default SideBar;
