import { QueryInterface, Sequelize } from "sequelize/types";

const provinces = [
    {
        id: "1",
        nombre: "Pinar del Río",
        code: "PD",
        municipios: [
            "Consolación del Sur",
            "Guane",
            "La Palma",
            "Los Palacios",
            "Mantua",
            "Minas de Matahambre",
            "Pinar del Río",
            "San Juan y Martínez",
            "San Luis",
            "Sandino",
            "Viñales",
        ],
    },
    {
        id: "2",
        nombre: "Artemisa",
        code: "AR",
        municipios: [
            "Alquízar",
            "Artemisa",
            "Bauta",
            "Caimito",
            "Guanajay",
            "Güira de Melena",
            "Mariel",
            "San Antonio de los Baños",
            "Bahía Honda",
            "San Cristóbal",
            "Candelaria",
        ],
    },
    {
        id: "3",
        nombre: "Mayabeque",
        code: "MQ",
        municipios: [
            "Batabanó",
            "Bejucal",
            "Güines",
            "Jaruco",
            "Madruga",
            "Melena del Sur",
            "Nueva Paz",
            "Quivicán",
            "San José de las Lajas",
            "San Nicolás de Bari",
            "Santa Cruz del Norte",
        ],
    },
    {
        id: "4",
        nombre: "La Habana",
        code: "CH",
        municipios: [
            "Arroyo Naranjo",
            "Boyeros",
            "Centro Habana",
            "Cerro",
            "Cotorro",
            "Diez de Octubre",
            "Guanabacoa",
            "Habana del Este",
            "Habana Vieja",
            "La Lisa",
            "Marianao",
            "Playa",
            "Plaza",
            "Regla",
            "San Miguel del Padrón",
        ],
    },
    {
        id: "5",
        nombre: "Matanzas",
        code: "MA",
        municipios: [
            "Calimete",
            "Cárdenas",
            "Ciénaga de Zapata",
            "Colón",
            "Jagüey Grande",
            "Jovellanos",
            "Limonar",
            "Los Arabos",
            "Martí",
            "Matanzas",
            "Pedro Betancourt",
            "Perico",
            "Unión de Reyes",
        ],
    },
    {
        id: "6",
        nombre: "Cienfuegos",
        code: "CF",
        municipios: [
            "Abreus",
            "Aguada de Pasajeros",
            "Cienfuegos",
            "Cruces",
            "Cumanayagua",
            "Palmira",
            "Rodas",
            "Santa Isabel de las Lajas",
        ],
    },
    {
        id: "7",
        nombre: "Villa Clara",
        code: "VC",
        municipios: [
            "Caibarién",
            "Camajuaní",
            "Cifuentes",
            "Corralillo",
            "Encrucijada",
            "Manicaragua",
            "Placetas",
            "Quemado de Güines",
            "Ranchuelo",
            "Remedios",
            "Sagua la Grande",
            "Santa Clara",
            "Santo Domingo",
        ],
    },
    {
        id: "8",
        nombre: "Sancti Spíritus",
        code: "SS",
        municipios: [
            "Cabaigúan",
            "Fomento",
            "Jatibonico",
            "La Sierpe",
            "Sancti Spíritus",
            "Taguasco",
            "Trinidad",
            "Yaguajay",
        ],
    },
    {
        id: "9",
        nombre: "Ciego de Ávila",
        code: "CA",
        municipios: [
            "Ciro Redondo",
            "Baraguá",
            "Bolivia",
            "Chambas",
            "Ciego de Ávila",
            "Florencia",
            "Majagua",
            "Morón",
            "Primero de Enero",
            "Venezuela",
        ],
    },
    {
        id: "10",
        nombre: "Camagüey",
        code: "CM",
        municipios: [
            "Camagüey",
            "Carlos Manuel de Céspedes",
            "Esmeralda",
            "Florida",
            "Guaimaro",
            "Jimagüayú",
            "Minas",
            "Najasa",
            "Nuevitas",
            "Santa Cruz del Sur",
            "Sibanicú",
            "Sierra de Cubitas",
            "Vertientes",
        ],
    },
    {
        id: "11",
        nombre: "Las Tunas",
        code: "LT",
        municipios: [
            "Amancio Rodríguez",
            "Colombia",
            "Jesús Menéndez",
            "Jobabo",
            "Las Tunas",
            "Majibacoa",
            "Manatí",
            "Puerto Padre",
        ],
    },
    {
        id: "12",
        nombre: "Holguín",
        code: "HO",
        municipios: [
            "Antilla",
            "Báguanos",
            "Banes",
            "Cacocum",
            "Calixto García",
            "Cueto",
            "Frank País",
            "Gibara",
            "Holguín",
            "Mayarí",
            "Moa",
            "Rafael Freyre",
            "Sagua de Tánamo",
            "Urbano Noris",
        ],
    },
    {
        id: "13",
        nombre: "Santiago de Cuba",
        code: "SC",
        municipios: [
            "Contramaestre",
            "Guamá",
            "Julio Antonio Mella",
            "Palma Soriano",
            "San Luis",
            "Santiago de Cuba",
            "Segundo Frente",
            "Songo la Maya",
            "Tercer Frente",
        ],
    },
    {
        id: "14",
        nombre: "Guantánamo",
        code: "GU",
        municipios: [
            "Baracoa",
            "Caimanera",
            "El Salvador",
            "Guantánamo",
            "Imías",
            "Maisí",
            "Manuel Tames",
            "Niceto Pérez",
            "San Antonio del Sur",
            "Yateras",
        ],
    },
    {
        id: "15",
        nombre: "Isla de la Juventud",
        code: "IJ",
        municipios: ["Isla de la Juventud"],
    },
    {
        id: 16,
        nombre: "Granma",
        code: "GR",
        municipios: [
            "Bartolomé Masó",
            "Bayamo",
            "Buey Arriba",
            "Campechuela",
            "Cauto Cristo",
            "Guisa",
            "Jiguaní",
            "Manzanillo",
            "Media Luna",
            "Niquero",
            "Pilón",
            "Río Cauto",
            "Yara",
        ],
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        const t = await queryInterface.sequelize.transaction();

        try {
            const bulkProvinces = provinces.map(item => {
                return {
                    code: item.code,
                    name: item.nombre,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            });

            await queryInterface.bulkInsert("Provinces", bulkProvinces, {
                transaction: t,
            });

            const resultProvinces = await queryInterface.sequelize.query(
                `SELECT * FROM public."Provinces";`,
                { transaction: t }
            );

            for (const province of provinces) {
                const found_inserted_province: any = resultProvinces[0].find(
                    (item: any) => item.code === province.code
                );

                let municipalityBulk: any = [];

                province.municipios!.forEach(municipipality => {
                    municipalityBulk.push({
                        provinceId: found_inserted_province.id,
                        code: "",
                        name: municipipality,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                });

                await queryInterface.bulkInsert(
                    "Municipalities",
                    municipalityBulk,
                    {
                        transaction: t,
                    }
                );
            }

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("Municipalities", {});
    },
};
