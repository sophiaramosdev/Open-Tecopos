import { Request, Response } from "express";
import { validationResult } from "express-validator";

export const fieldValidator = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json(errors);
    }

    next();
};
