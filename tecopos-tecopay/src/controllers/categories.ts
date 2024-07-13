import { Request, Response } from "express";
import Category from "../database/models/category";
import Logger from "../utils/logger";
import { Op } from "sequelize";
import Image from "../database/models/image";
// New Category
export const createCategory = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      color,
      isBasic,
      cardImageId,
      price,
      discount,
      promotionId,
      isPublic,
      description,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "El campo name es obligatorio",
      });
    }

    const existingCategory = await Category.findOne({
      where: { name, issueEntityId: id },
    });

    if (existingCategory) {
      return res.status(400).json({
        message:
          "Category with the same name already exists for this issueEntity.",
      });
    }

    if (isBasic) {
      const existingBasicCategory = await Category.findOne({
        where: { issueEntityId: id, isBasic: true },
      });

      if (existingBasicCategory)
        await Category.update(
          { isBasic: false },
          { where: { id: existingBasicCategory.id } }
        );
    }

    await Category.create({
      name,
      issueEntityId: id,
      color,
      cardImageId,
      promotionId,
      price,
      discount,
      description,
      isBasic,
      isPublic
    });

    const response = await Category.scope("default").findAll({
      where: { issueEntityId: id },
    });

    return res.status(201).json(response);
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// Get all categories for a specific issueEntityId
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const categories = await Category.scope("default").findAll({
      where: { issueEntityId: id },
      include: [
        { model: Image, as: "cardImage", attributes: ["id", "url", "hash"] },
        {
          model: Image,
          as: "promotionImage",
          attributes: ["id", "url", "hash"],
        },
      ],
    });

    return res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Update a category by its ID
export const updateCategory = async (req: Request, res: Response) => {
  try {
    let { categoryId } = req.params;
    const { name, isBasic } = req.body;

    const category = await Category.findByPk(Number(categoryId), {
      attributes: ["id", "name", "issueEntityId", "isBasic"],
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (name) {
      const nameExists = await Category.findOne({
        where: {
          issueEntityId: category.issueEntityId,
          name,
          id: { [Op.ne]: parseInt(categoryId) },
        },
      });

      if (!!nameExists)
        return res.status(404).json({
          message: "Category name provided already exists",
        });
    }

    if (!isBasic) {
      const someBasic = await Category.findOne({
        where: {
          issueEntityId: category.issueEntityId,
          isBasic: true,
          id: { [Op.ne]: parseInt(categoryId) },
        },
      });

      if (!someBasic) {
        return res.status(400).json({
          message: "Debe definir una categoría como principal",
        });
      }
    } else {
      await Category.update(
        { isBasic: false },
        {
          where: {
            issueEntityId: category.issueEntityId,
            isBasic: true,
            id: { [Op.ne]: parseInt(categoryId) },
          },
        }
      );
    }

    let body: any = {};

    Object.entries(req.body).forEach((elem) => {
      const [key, value] = elem;
      body[key] = value;
    });

    await Category.update(body, {
      where: { id: parseInt(categoryId) },
      fields: [
        "name",
        "isBasic",
        "color",
        "cardImageId",
        "price",
        "discount",
        "isActive",
        "isPublic",
        "description"
      ],
    });

    const toReturn = await Category.scope("default").findAll({
      where: { issueEntityId: category.issueEntityId },
    });

    return res.status(200).json(toReturn);
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Delete a category by its ID
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id, categoryId } = req.params;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (category.isBasic)
      return res
        .status(400)
        .json({ message: "It can not delete a basic Category" });

    await category.destroy();

    return res.status(204).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
