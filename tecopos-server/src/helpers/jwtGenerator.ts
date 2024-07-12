import jwt from "jsonwebtoken";
import Logger from "../lib/logger";

// Token only save user Id.
export const jwtGenerator = (id = "") => {
    return new Promise((resolve, reject) => {
        const payload = { id };

        jwt.sign(
            payload,
            process.env.JWT_TOKEN_PK!,
            {
                expiresIn: "7d",
            },
            (error, token) => {
                if (error) {
                    Logger.error(error);
                    reject("Token coudn't be generated");
                } else {
                    resolve(token);
                }
            }
        );
    });
};

export const jwtRefreshTokenGenerator = (id = "") => {
    return new Promise((resolve, reject) => {
        const payload = { id };

        jwt.sign(
            payload,
            process.env.JWT_REFRESH_TOKEN_PK!,
            {
                expiresIn: "30d",
            },
            (error, token) => {
                if (error) {
                    Logger.error(error);
                    reject("Refresh token coudn't be generated");
                } else {
                    resolve(token);
                }
            }
        );
    });
};
