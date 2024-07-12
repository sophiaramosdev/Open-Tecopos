import {
  Almacenes,
  CiclosEconómicos,
  inicio,
  Procesados,
  PuntosDeVenta,
  RecursosHumanos,
  RegionesDeEnvío,
  Reportes,
  SistemaDePrecios,
} from "../assets/png/imageFreeVersion";
export const imageAcepted = {
  accept: {
    "image/*": [".png", ".jpeg", ".jpg"],
  },
};

export const infoPages = {
  inicio: {
    image: inicio,
    title: "Lleva tu negocio al próximo nivel",
    text: `Conoce de un solo vistazo el comportamiento de tus ventas, los productos más vendidos y el estado de tus almacenes. Integra tus áreas en tiempo real, elimina los papeles y las largas horas haciendo conciliaciones de inventarios al terminar el día. 

        Integrar tus procesos con TECOPOS te permite tener toda la información relevante de tu negocio a la distancia de un clic, aumentar el control, reducir los errores humanos y con ello maximizar sus ventas.
        
        Mejora la experiencia de tus clientes al elaborar 100% gratis tu carta de venta digital para que sea accesible desde cualquier dispositivo conectado a internet. Esto te permitirá hacer cambios de precios, establecer disponibilidad para la venta o elaborar ofertas que se adapten mejor a los gustos de tus clientes con un mínimo de esfuerzo.
        
        ¡Con TECOPOS siempre ganas dándole un aire de modernidad a tu negocio!
        `,
  },
  almacenes: {
    image: Almacenes,
    title: "Gestionar almacenes nunca fue tan fácil",
    text: `Simplifica tus procesos y crea flujos de trabajo más intuitivos. Con la gestión de inventarios podrás llevar el control de tus almacenes y darles seguimiento a las operaciones de entrada, salida, traslados, conteos físicos. 

        Una gestión automatizada de inventarios posibilita maximizar la organización de tu negocio y con ello reducir los tiempos de conciliación de lo que se posee en existencia y lo vendido en los puntos de ventas.
        `,
  },
  puntosDeVenta: {
    image: PuntosDeVenta,
    title: "Vender, rápido y fácil",
    text: `Ya no será necesario preocuparse cada vez que cambie un precio o no tenga disponibilidad de un producto. Con el punto de venta sincronizado a su inventario podrá tener siempre bajo control sus ventas, flujos de cajas y transacciones monetarias.`,
  },
  procesados: {
    image: Procesados,
    title: "Automatiza tus procesados",
    text: `Conectar las diferentes áreas de tu negocio permite mejorar la comunicación entre aquellas donde se elaboran productos y los puntos de ventas al tramitarse las comandas de forma 100% digital. Con el sistema de notificaciones y alertas sonoras darás a tu negocio un toque de modernidad.`,
  },
  productos: {
    image: inicio,
    title: "Diferentes tipos de productos ajustados a tus necesidades",
    text: `Con tus productos registrados en TECOPOS podrás conocer las ventas realizadas de estos, las fichas de costos y con ello los porcientos de ganancias con respecto al precio de venta, establecer límites de alerta para conocer cuándo están próximo a agotarse y muchas más estadísticas que ayudarán a la toma de decisiones que maximicen tus ventas.`,
  },
  ciclosEconómicos: {
    image: CiclosEconómicos,
    title: "De inicio a fin, tus ventas de un vistazo",
    text: `Accede a un conjunto de herramientas sobre para sacar el máximo provecho a los recibos realizados de las ventas. Gestiona las formas de pago, las propinas que te dejan los clientes, los ingresos totales y compáralo con el histórico para conocer cómo se desenvuelve tu negocio.`,
  },
  reportes: {
    image: Reportes,
    title: "Conoce tus estadísticas para tomar mejores decisiones",
    text: `Conoce de un vistazo el estado de tu inventario actual o el comportamiento que ha tenido a lo largo de un determinado tiempo. Aumentar el control de tus recursos redundará en tus ganancias, permitiendo también agilizar los movimientos entre diferentes puntos que pueden o no estar distantes geográficamente.`,
  },
  recursosHumanos: {
    image: RecursosHumanos,
    title: "Gestiona tu equipo de trabajo",
    text: `Con el sistema basado en roles puedes garantizar la seguridad de los datos y las operaciones que se realizan con TECOPOS. Distribuye las responsabilidades en tu negocio para que puedas conocer en todo momento que usuario está realizando una operación determinada.`,
  },
  clientes: {
    image: RecursosHumanos,
    title: "Conoce a tus clientes",
    text: `Crea tu propia base de clientes, para personalizar tus ofertas y garantizar que vuelvan a tu negocio a partir de lo que han comprado. Puedes utilizar estas herramientas para que se sientan especiales durante la próxima compra.`,
  },
  sistemaDePrecios: {
    image: SistemaDePrecios,
    title: "Varios precios y monedas ya no son más un problema",
    text: `Puedes establecer varios sistemas de precios de acuerdo a tus necesidades como por ejemplo en una fecha especial los productos pueden configurárseles rebajas o elevar su precio ante un aumento de la demanda. En ocasiones también es útil establecer ofertas diferentes de acuerdo a los horarios en el día. TECOPOS te permite hacerlo de una forma rápida y sencilla.

        Acepta múltiples monedas de pago en tu negocio, o establece productos con precios diferenciados en varias monedas. Esto no será un problema, TECOPOS se encargará de hacer los trabajos de conversión y contabilidad de por ti.
        `,
  },
  regionesDeEnvío: {
    image: RegionesDeEnvío,
    title: "Gestiona las áreas de entrega a domicilio",
    text: `Establece las regiones para las entregas a domicilio y personalízalas con precios diferentes de acuerdo a tus propios criterios. `,
  },
};

export const defaultContentModalProducts = [
  {
    name: "Listo para vender",
    description:
      "Aparecen en la cartera de venta o menú. Pueden tener formato de almacén, servicios, combos, variables o elaborado. Su medida es en unidades.",
    code: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },

  {
    name: "Materia prima",
    description:
      "Productos sin elaborar y que sirven de base para los procesos de producción.",
    code: "RAW",
    color: "ring-2 ring-purple-500",
    textColor: "text-purple-500",
    bgColor: "bg-purple-500",
  },
  {
    name: "Procesado",
    description:
      "Aquellos que son resultado de un proceso de producción utilizando materias primas.",
    code: "MANUFACTURED",
    color: "ring-2 ring-orange-500",
    textColor: "text-orange-500",
    bgColor: "bg-orange-500",
  },
  {
    name: "Desperdicio",
    description:
      "Recursos derivados de operaciones de procesado y que pueden ser considerado como merma, o productos sin utilidad.",
    code: "WASTE",
    color: "ring-2 ring-red-500",
    textColor: "text-red-500",
    bgColor: "bg-red-500",
  },
  {
    name: "Activos",
    description:
      "Bienes o servicios tangibles o intangibles que forman parte de los procesos del negocio.",
    code: "ASSET",
    color: "ring-2 ring-yellow-500",
    textColor: "text-yellow-500",
    bgColor: "bg-yellow-500",
  },
];

export const contentModalReadyForSale = [
  {
    name: "Almacén",
    description:
      "Formato contable y tangible que se gestiona a través de operaciones de entradas y salidas de un área.",
    code: "STOCK",
    type: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },
  {
    name: "Elaborado",
    description: "Requiere una elaboración previa o procesado.",
    code: "MENU",
    type: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },
  {
    name: "Servicio",
    description:
      "Formato para denominar las prestaciones de utilidades que no consisten en productos materiales.",
    code: "SERVICE",
    type: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },
  {
    name: "Combo",
    description:
      "Permite agrupa un conjunto de productos de formato Elaborado o de Almacén.",
    code: "COMBO",
    type: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },
  {
    name: "Variable",
    description:
      "Productos contables y tangibles de almacén que responden a una misma agrupación y que cuentan con diferentes atributos.",
    code: "VARIATION",
    type: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },
  {
    name: "Agrego",
    description: "Productos que hacen función de agrego en otros productos.",
    code: "ADDON",
    type: "READYFORSALE",
    color: "ring-2 ring-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500",
  },
];

export const stepsNewProduct = [
  { name: "Detalles", status: "current" },
  { name: "Imagen", status: "upcoming" },
  { name: "Precio", status: "upcoming" },
  { name: "Área de Procesado", status: "upcoming" },
];
