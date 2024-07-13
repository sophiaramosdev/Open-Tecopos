import { Response } from "express";
import sendNotification from "../utils/notifications";

export const testNotification = async (req: any, res: Response) => {
  const token = req.body.token;
  const body = req.body.body;
  const title = req.body.title;
  await sendNotification({ token, title, body });
  return res.json({message:"Notification send successfully"});
};
