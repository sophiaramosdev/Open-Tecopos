import firebase from "firebase-admin";
import { Message } from "firebase-admin/lib/messaging/messaging-api";

const serviceAccount = require("../../firebase/firebaseKey.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});

const sendNotification = async ({
  token,
  title,
  body,
}: Record<"token" | "title" | "body", string>) => {
  if (!token) {
    return false;
  }

  const message: Message = {
    notification: {
      title: title,
      body: body
    },
    android: {
      notification: {
        sound: "default",
        body,
        title: title,
      },
    },
    token: token,
    webpush: {
      notification: {
        body: "Body de la notificacion",
        title: "Title de la notificacion",
      }
    },
  };

  const response = await firebase.messaging().send(message);
  return response;
};

export default sendNotification;
