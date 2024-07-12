import { Request, Response } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import fs from "fs";

import Image from "../database/models/image";
import { imageQueue } from "../bull-queue/image";
import Logger from "../lib/logger";
import Document from "../database/models/document";
import User from "../database/models/user";
import Business from "../database/models/business";

const validExtensions = ["png", "jpg", "jpeg", "gif"];

export const uploadImage = async (req: any, res: Response) => {
    try {
        if (
            !req.files ||
            Object.keys(req.files).length === 0 ||
            !req.files.file
        ) {
            return res.status(400).json({
                message: "No files were uploaded.",
            });
        }

        let bulkImages: any = [];
        let promises = [];

        const { file } = req.files;

        if (file.length > 1) {
            for (let i = 0; i < file.length; i++) {
                //@ts-ignore
                const splittedName = file[i].name.split(".");
                const ext = splittedName[splittedName.length - 1];

                if (!validExtensions.includes(ext.toLowerCase())) {
                    return res.status(500).json({
                        message: `La extensión ${ext} del archivo no está permitida - ${validExtensions}`,
                    });
                }

                const today = moment();

                const name = uuidv4() + "." + ext;
                const uploadPath = path.join(
                    __dirname,
                    "../../public",
                    today.year().toString(),
                    today.month().toString(),
                    name
                );

                promises.push(
                    file[i].mv(uploadPath, async (error: any) => {
                        if (error) {
                            Logger.error(error, {
                                "X-App-Origin": req.header("X-App-Origin"),
                            });
                            return res.status(500).json({
                                message:
                                    "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
                            });
                        }
                    })
                );

                //Creating image
                const absoluteUrl = `/${today.year().toString()}/${today
                    .month()
                    .toString()}/${name}`;
                const fullUrl = `${
                    process.env.MODE === "online" ? "https" : req.protocol
                }://${req.get("host")}${absoluteUrl}`;

                bulkImages.push({
                    path: absoluteUrl,
                    src: fullUrl,
                    thumbnail: fullUrl,
                });
            }
        } else {
            //@ts-ignore
            const splittedName = file.name.split(".");
            const ext = splittedName[splittedName.length - 1];

            if (!validExtensions.includes(ext)) {
                return res.status(500).json({
                    message: `La extensión ${ext} del archivo no está permitida - ${validExtensions}`,
                });
            }

            const today = moment();

            const name = uuidv4() + "." + ext;
            const uploadPath = path.join(
                __dirname,
                "../../public",
                today.year().toString(),
                today.month().toString(),
                name
            );

            promises.push(
                file.mv(uploadPath, async (error: any) => {
                    if (error) {
                        Logger.error(error, {
                            "X-App-Origin": req.header("X-App-Origin"),
                        });
                        return res.status(500).json({
                            message:
                                "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
                        });
                    }
                })
            );

            //Creating image
            const absoluteUrl = `/${today.year().toString()}/${today
                .month()
                .toString()}/${name}`;
            const fullUrl = `${
                process.env.MODE === "online" ? "https" : req.protocol
            }://${req.get("host")}${absoluteUrl}`;

            bulkImages.push({
                path: absoluteUrl,
                src: fullUrl,
                thumbnail: fullUrl,
            });
        }

        await Promise.all(promises).catch(error => {
            Logger.error(error, {
                "X-App-Origin": req.header("X-App-Origin"),
            });
            return res.status(500).json({
                message:
                    "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
            });
        });

        const images = await Image.bulkCreate(bulkImages, { returning: true });

        //Processing blurhash
        for (const img of images) {
            imageQueue.add(
                {
                    code: "SET_BLURHASH",
                    params: {
                        imageId: img.id,
                    },
                },
                { attempts: 2, removeOnComplete: true, removeOnFail: true }
            );
        }

        res.status(200).json(images);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

const docsValidExtensions = [
    "pdf",
    "docx",
    "doc",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
];
const MAX_UPLOAD_FILE = 15 * 1000000; //15 MB

export const uploadDocument = async (req: any, res: Response) => {
    try {
        const user: User = req.user;
        const business: Business = req.business;
        const { ...params } = req.body;

        if (
            !req.files ||
            Object.keys(req.files).length === 0 ||
            !req.files.file
        ) {
            return res.status(400).json({
                message: "No files were uploaded.",
            });
        }

        let bulkDocs: any = [];
        let promises = [];

        const { file } = req.files;

        if (file.length > 1) {
            if (file.length > 2) {
                return res.status(400).json({
                    message: `Solo es posible subir 2 archivos a la misma vez.`,
                });
            }

            for (let i = 0; i < file.length; i++) {
                if (file[i].size > MAX_UPLOAD_FILE) {
                    return res.status(400).json({
                        message: `La dimensión del archivo excede los 15MB permitidos.`,
                    });
                }

                //@ts-ignore
                const splittedName = file[i].name.split(".");
                const ext = splittedName[splittedName.length - 1];

                if (!docsValidExtensions.includes(ext.toLowerCase())) {
                    return res.status(400).json({
                        message: `La extensión ${ext} del archivo no está permitida - ${docsValidExtensions}`,
                    });
                }

                const today = moment();

                const name = uuidv4() + "." + ext;
                const uploadPath = path.join(
                    __dirname,
                    "../../public/docs",
                    today.year().toString(),
                    today.month().toString(),
                    name
                );

                promises.push(
                    file[i].mv(uploadPath, async (error: any) => {
                        if (error) {
                            Logger.error(error, {
                                "X-App-Origin": req.header("X-App-Origin"),
                            });
                            return res.status(500).json({
                                message:
                                    "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
                            });
                        }
                    })
                );

                //Creating image
                const absoluteUrl = `/docs/${today.year().toString()}/${today
                    .month()
                    .toString()}/${name}`;
                const fullUrl = `${
                    process.env.MODE === "online" ? "https" : req.protocol
                }://${req.get("host")}${absoluteUrl}`;

                bulkDocs.push({
                    path: absoluteUrl,
                    src: fullUrl,
                    businessId: user.businessId,
                    title: params.title || file.name,
                    description: params.description,
                    uploadedById: user.id,
                });
            }
        } else {
            //@ts-ignore
            const splittedName = file.name.split(".");
            const ext = splittedName[splittedName.length - 1];

            if (file.size > MAX_UPLOAD_FILE) {
                return res.status(400).json({
                    message: `La dimensión del archivo excede los 15MB permitidos.`,
                });
            }

            if (!docsValidExtensions.includes(ext)) {
                return res.status(400).json({
                    message: `La extensión ${ext} del archivo no está permitida - ${docsValidExtensions}`,
                });
            }

            const today = moment();

            const name = uuidv4() + "." + ext;
            const uploadPath = path.join(
                __dirname,
                "../../public/docs",
                today.year().toString(),
                today.month().toString(),
                name
            );

            promises.push(
                file.mv(uploadPath, async (error: any) => {
                    if (error) {
                        Logger.error(error, {
                            "X-App-Origin": req.header("X-App-Origin"),
                        });
                        return res.status(500).json({
                            message:
                                "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
                        });
                    }
                })
            );

            //Creating image
            const absoluteUrl = `/docs/${today.year().toString()}/${today
                .month()
                .toString()}/${name}`;
            const fullUrl = `${
                process.env.MODE === "online" ? "https" : req.protocol
            }://${req.get("host")}${absoluteUrl}`;

            bulkDocs.push({
                title: params.title || file.name,
                description: params.description,
                path: absoluteUrl,
                src: fullUrl,
                businessId: user.businessId,
                uploadedById: user.id,
            });
        }

        await Promise.all(promises).catch(error => {
            Logger.error(error, {
                "X-App-Origin": req.header("X-App-Origin"),
                userName: user.displayName || user.username,
                businessId: user.businessId,
                businessName: business.name,
            });
            return res.status(500).json({
                message:
                    "Ha ocurrido un error mientras se cargaba el(los) archivo(s) al sistema. Por favor, contacte a soporte técnico.",
            });
        });

        const docs = await Document.bulkCreate(bulkDocs, { returning: true });

        res.status(200).json(docs);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getImage = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const image = await Image.findByPk(id);

        if (!image) {
            return res.status(404).json({
                message: "Image not found",
            });
        }
        const imagePath = path.join(__dirname, "../../public", image.path);

        if (fs.existsSync(imagePath)) {
            return res.sendFile(imagePath);
        }

        return res.status(404).json({
            message: "Image not found",
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        console.log(error);
        res.status(500).json({
            message: "Server internal error. Please contact the admin.",
        });
    }
};

export const getDocument = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        const doc = await Document.findByPk(id);

        if (!doc) {
            return res.status(404).json({
                message: "Document not found",
            });
        }

        if (doc.businessId !== user.businessId) {
            return res.status(401).json({
                message:
                    "No tiene acceso al recurso solicitado. Acceso denegado.",
            });
        }

        const docPath = path.join(__dirname, "../../public", doc.path);

        if (fs.existsSync(docPath)) {
            return res.sendFile(docPath);
        }

        return res.status(404).json({
            message: "Docuemnt not found",
        });
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        console.log(error);
        res.status(500).json({
            message: "Server internal error. Please contact the admin.",
        });
    }
};
