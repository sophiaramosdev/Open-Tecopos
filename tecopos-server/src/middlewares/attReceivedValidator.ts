import { Request, Response } from "express";

export const attReceivedValidator = (Model: any, extra?: Array<string>) => {
    return (req: Request, res: Response, next: any) => {
        //Checking if attributes received are valid
        const attributes = Object.keys(Model.getAttributes());
        const keys = Object.keys(req.body);

        let message;
        keys.forEach(att => {
            if (
                (!attributes.includes(att) && !extra) ||
                (!attributes.includes(att) && extra && !extra.includes(att))
            ) {
                message = `${att} is not a valid attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        next();
    };
};
