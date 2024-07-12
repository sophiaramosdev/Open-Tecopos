import Queue from "bull";
import { blurhashFromURL } from "blurhash-from-url";

import { JobImageData } from "./interfaces";
import Image from "../database/models/image";
import Logger from "../lib/logger";

export const imageQueue = new Queue(
    `image-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
imageQueue.process(async (job: Queue.Job<JobImageData>, done) => {
    try {
        switch (job.data.code) {
            case "SET_BLURHASH":
                {
                    const image = await Image.findByPk(job.data.params.imageId);

                    if (image) {
                        const hash = await blurhashFromURL(image.src);
                        if (hash) {
                            image.blurHash = hash.encoded;
                            await image.save();
                        }
                    }

                    done();
                }
                break;
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
