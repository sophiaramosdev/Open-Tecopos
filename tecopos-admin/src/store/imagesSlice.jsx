import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import APIMediaServer from "../api/APIMediaServer";
import APIServer from "../api/APIServices";

export const postOnDummyImage = createAsyncThunk(
    "imagesSlice/postOnDummyImage",
    async dataIn => {
        const res = await APIMediaServer.post("/files", dataIn.data).catch(
            error => {
                if (error.response) {
                    throw error.data.message;
                } else {
                    throw error;
                }
            }
        );
        return { data: res.data, type: dataIn.type };
    }
);
export const getImages = createAsyncThunk("imagesSlice/getImages", async () => {
    const res = await APIServer.get("/administration/my-business").catch(
        error => {
            if (error.data.message) {
                throw error.data.message;
            } else {
                throw error;
            }
        }
    );
    return res.data;
});
export const updateFiles = createAsyncThunk(
    "imagesSlice/updateFiles",
    async dataIn => {
        const res = await APIServer.patch(
            "/administration/business",
            dataIn.data
        ).catch(error => {
            if (error.data.message) {
                throw error.data.message;
            } else {
                throw error;
            }
        });
        return { data: res.data, type: dataIn.type };
    }
);

const initialState = {
    // allData: {},
    gallery: [],
    logo: [],
    banner: [],
    productImage: [],
    isLoading: false,
    hasError: false,
    type: "",
};

const imagesSlice = createSlice({
    name: "imagesSlice",
    initialState,
    reducers: {
        onProductImage: (state, action) => {
            action.payload !== undefined
                ? state.productImage.push(action.payload)
                : (state.productImage = initialState.productImage);
        },
        deleteImage: (state, action) => {
            if (action.payload.type === "logo") state.logo = {};
            if (action.payload.type === "banner") state.banner = {};
            action.payload.type === "gallery" &&
                state.gallery.filter(
                    item =>
                        item.id === action.payload.data &&
                        state.gallery.splice(state.gallery.indexOf(item), 1)
                );
        },
        setOnError: (state, action) => {
            state.hasError = initialState.hasError;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(getImages.pending, state => {
                state.type = "getImages";
                state.isLoading = true;
                state.hasError = false;
            })
            .addCase(getImages.fulfilled, (state, action) => {
                state.gallery =
                    action.payload.images === null ? [] : action.payload.images;
                state.logo =
                    action.payload.logo === null ? [] : action.payload.logo;
                state.banner =
                    action.payload.banner === null ? [] : action.payload.banner;
                state.allData = action.payload;
                state.isLoading = false;
                state.hasError = false;
            })
            .addCase(getImages.rejected, state => {
                state.type = "getImages";
                state.isLoading = false;
                state.hasError = true;
            })
            .addCase(updateFiles.pending, state => {
                state.type = "updateImage";
                state.isLoading = true;
                state.hasError = false;
            })
            .addCase(updateFiles.rejected, state => {
                state.type = "updateImage";
                state.isLoading = false;
                state.hasError = true;
            })
            .addCase(updateFiles.fulfilled, (state, action) => {
                state.type = "updateFiles";
                if (action.payload.type === "gallery")
                    state.gallery = action.payload.data.images;
                if (action.payload.type === "form")
                    state.allData = action.payload.data;
                state.isLoading = false;
                state.hasError = false;
            })
            .addCase(postOnDummyImage.pending, state => {
                state.type = "postDummy";
                state.isLoading = true;
                state.hasError = false;
            })
            .addCase(postOnDummyImage.fulfilled, (state, action) => {
                state.type = "postDummy";
                state.isLoading = false;
                state.hasError = false;
                action.payload.type === "productImage" &&
                    action.payload.data.map(
                        item => (state.productImage = item)
                    );
                action.payload.type === "logo" &&
                    action.payload.data.map(item => (state.logo = item));
                action.payload.type === "banner" &&
                    action.payload.data.map(item => (state.banner = item));
                action.payload.type === "gallery" &&
                    action.payload.data.map(item => state.gallery.push(item));
            })
            .addCase(postOnDummyImage.rejected, state => {
                state.type = "postDummy";
                state.hasError = true;
                state.isLoading = false;
            });
    },
});
export const { deleteImage, onProductImage, setOnError } = imagesSlice.actions;
// export const selectAllValue = (state) => state.imagesSlice.allData;
export const selectImages = state => state.imagesSlice.gallery;
export const selectLogo = state => state.imagesSlice.logo;
export const selectProductImage = state => state.imagesSlice.productImage;
export const selectBanner = state => state.imagesSlice.banner;
export const selectImagesIsLoading = state => state.imagesSlice.isLoading;
export const selectImagesHasError = state => state.imagesSlice.hasError;
export const selectImagesType = state => state.imagesSlice.type;
export default imagesSlice.reducer;
