import { Request, Response } from "express";
import Business from "../database/models/business";
import axios from "axios";
import { remoteHeader as headers } from "../utils/fixedData";
import Logger from "../utils/logger";

export const all = async (req: any, res: Response) => {
  try {
    const business = await axios.get(
      `${process.env.TECOPOS_API_HOST}/servertoserver/business`,
      { headers, params:req.query }
    );

    if(business.status !== 200) throw new Error(business.data);

    return res.json(business.data);
  } catch (error:any) {
    Logger.error(error);
    return res.status(500).json({
      message: error.toString() ?? "Ha ocurrido un error interno en el servidor.",
    });
  }
};

export const findById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bussines = await Business.findByPk(parseInt(id));

    if (!bussines)
      return res
        .status(404)
        .json({ message: "El negocio solicitado no está asociado a Tecopay." });

    return res.status(200).json(bussines.dataValues);
  } catch (error) {
    return res.status(500).json({
      message: "Ha ocurrido un error interno en el servidor.",
    });
  }
};

