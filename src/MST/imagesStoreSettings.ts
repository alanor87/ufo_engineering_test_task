import axios from "axios";
import { types, flow, Instance } from "mobx-state-tree";
import { alert } from "@pnotify/core";

const ImageInfo = types
  .model({
    tags: types.optional(types.array(types.string), []),
    likes: types.optional(types.number, 0),
    isLoading: types.optional(types.boolean, false),
    error: types.optional(types.boolean, false),
  })

  .actions((self) => {
    const setIsLoading = (value: boolean) => {
      self.isLoading = value;
    };
    return { setIsLoading };
  });

const Image = types
  .model({
    _id: types.string,
    imageURL: types.optional(types.string, ""),
    imageInfo: types.optional(ImageInfo, {}),
    isPublic: types.optional(types.boolean, true),
    belongsTo: types.optional(types.string, ""),
  })
  .actions((self) => {
    const updateImageInfo = (newImageInfo: ImageInfoType) => {
      self.imageInfo = newImageInfo;
    };

    return { updateImageInfo };
  });

const ImagesStore = types
  .model({
    images: types.array(Image),
    imagesPerPage: types.optional(types.number, 10),
  })
  .views((self) => ({
    get getAllImages(): ImageType[] {
      return self.images;
    },
    get getFilteredImages(): ImageType[] {
      return self.images.filter((image) => image.imageInfo.tags.includes(""));
    },
  }))
  .actions((self) => {
    const fetchAllImages = flow(function* () {
      try {
        const response = yield axios.get("/images");
        self.images = response.data;
      } catch (error) {
        alert({
          text: `Error while fetching images. Error info : ${error}`,
          type: "error",
        });
      }
    });

    const getImageById = (id: string) => {
      return self.images.find((image) => image._id === id);
    };

    const editTags = flow(function* (imageId: string, newTagList: string[]) {
      try {
        const imageToEdit: any = getImageById(imageId);
        const newImageInfo = {
          ...imageToEdit.imageInfo,
          tags: newTagList,
        };
        const newImage = {
          ...imageToEdit,
          imageInfo: newImageInfo,
        };
        const updatedImage: ImageType = yield axios
          .put(`/images/${imageId}`, newImage)
          .then((res) => res.data.body);
        imageToEdit.updateImageInfo(updatedImage.imageInfo);
        imageToEdit.imageInfo.setIsLoading(false);
      } catch (error: any) {
        alert({
          text: `Error while editing tags. Error info : ${error}`,
          type: "error",
        });
      }
    });

    return { fetchAllImages, editTags, getImageById };
  });

export interface ImageInfoType extends Instance<typeof ImageInfo> {}
export interface ImageType extends Instance<typeof Image> {}
export interface ImagesStoreType extends Instance<typeof ImagesStore> {}
export default ImagesStore;
