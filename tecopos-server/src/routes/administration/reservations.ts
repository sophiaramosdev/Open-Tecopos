import { Router } from "express";
import { jwtValidator } from "../../middlewares/jwtValidator";
import { businessValidator } from "../../middlewares/businessValidator";
import { allowedRoles } from "../../middlewares/allowedRoles";
import {
  cancelReservation,
  checkDisposability,
  confirmReservation,
  createdNewTiemBlock,
  createdReservationTemp,
  deleteEvent,
  finAllBlokTime,
  findAllReservations,
  getReservation,
  updateEvent,
  updateReservation,
} from "../../controllers/administration/reservations";
import { originValidator } from "../../middlewares/originValidator";
import { moduleValidator } from "../../middlewares/moduleValidator";

const routerReservation = Router();

//Create a new reservation
routerReservation.post(
  "/",
  [
    originValidator(["Tecopos-Admin"]),
    jwtValidator,
    businessValidator(),
    moduleValidator(["RESERVATION"]),
  ],
  createdReservationTemp
);

//Get a single reservation by ID
routerReservation.get(
  "/:id",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  getReservation
);
routerReservation.get(
  "/check/availability",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  checkDisposability
);
routerReservation.get(
  "/",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  findAllReservations
);

routerReservation.patch(
  "/:id",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  updateReservation
);
routerReservation.delete(
  "/:id",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  cancelReservation
);

routerReservation.get(
  "/event/block-time",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  finAllBlokTime
);
routerReservation.post(
  "/event/block-time",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  createdNewTiemBlock
);
routerReservation.patch(
  "/event/block-time/:id",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  updateEvent
);
routerReservation.delete(
  "/event/block-time/:id",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  deleteEvent
);

routerReservation.post(
  "/confirm/:id",
  [originValidator(["Tecopos-Admin"]),
    jwtValidator,
  businessValidator(),
  moduleValidator(["RESERVATION"])],
  confirmReservation
);


// Update a reservation
// routerReservation.patch(
//   "/reservation/:id",
//   [
//     check("service", "Service field is missing").optional().not().isEmpty(),
//     check("startDate", "startDate field is missing")
//       .optional()
//       .not()
//       .isEmpty()
//       .isISO8601(),
//     check("endDate", "endDate field is missing")
//       .optional()
//       .not()
//       .isEmpty()
//       .isISO8601(),
//     check("client", "Client field is missing").optional().not().isEmpty(),
//     check("numberClients", "numberClients field is missing")
//       .optional()
//       .not()
//       .isEmpty()
//       .isInt(),
//     check("numberAdults", "numberAdults field is missing")
//       .optional()
//       .not()
//       .isEmpty()
//       .isInt(),
//     check("numberKids", "numberKids field is missing")
//       .optional()
//       .not()
//       .isEmpty()
//       .isInt(),
//     jwtValidator,
//     allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
//     businessValidator(),
//   ],
//   updateReservation
// );

// Delete a reservation
// routerReservation.delete(
//   "/reservation/:id",
//   [
//     jwtValidator,
//     allowedRoles(["GROUP_OWNER", "OWNER", "ADMIN", "PRODUCT_PROCESATOR"]),
//     businessValidator(),
//   ],
//   deleteReservation
// );

export default routerReservation;
