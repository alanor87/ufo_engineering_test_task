import axios from "axios";
import {
  types,
  flow,
  Instance,
  applySnapshot,
  getParent,
} from "mobx-state-tree";
import { ImageOpenedToUserEntry } from "types/common";
import { NewImageInfoType, GalleryType } from "types/images";
import { popupNotice } from "../utils/popupNotice";

interface InitialImageStoreSettings {
  galleryMode: GalleryType;
  images: ImageType[];
  groupSelectMode: boolean;
  filter: string;
  page: number;
  imagesPerPage: number;
}

const initialImageStoreSettings: InitialImageStoreSettings = {
  galleryMode: "userGallery",
  images: [],
  groupSelectMode: false,
  filter: "",
  page: 0,
  imagesPerPage: 20,
};

const ImageInfo = types
  .model({
    tags: types.optional(types.array(types.string), []),
    likes: types.optional(types.array(types.string), []),
    isLoading: types.optional(types.boolean, false),
    isSelected: types.optional(types.boolean, false),
    isPublic: types.optional(types.boolean, false),
    belongsTo: types.optional(types.string, ""),
    openedTo: types.optional(types.array(types.string), []),
  })
  .actions((self) => {
    const setIsLoading = (value: boolean) => {
      self.isLoading = value;
    };
    return { setIsLoading };
  });

// ######################## Single image store object ####################### //

export const Image = types
  .model({
    _id: types.string,
    imageHostingId: types.optional(types.string, ""),
    imageURL: types.optional(types.string, ""),
    smallImageURL: types.optional(types.string, ""),
    imageInfo: types.optional(ImageInfo, {}),
    isSelected: types.optional(types.boolean, false),
  })
  .actions((self) => {
    const updateImageInfo = (newImageInfo: ImageInfoType) => {
      self.imageInfo = newImageInfo;
    };
    const toggleSelectImage = (value: boolean) => {
      self.isSelected = value;
    };
    return { updateImageInfo, toggleSelectImage };
  });

// ######################## General images store object ####################### //

const ImagesStore = types
  .model({
    galleryMode: types.optional(
      types.enumeration(["userGallery", "sharedGallery", "publicGallery"]),
      "userGallery"
    ),
    images: types.array(Image),
    groupSelectMode: types.optional(types.boolean, false),
    selectedImages: types.optional(
      types.array(
        types.model({
          selectedId: types.string,
          imageHostingId: types.string,
          isPublic: types.optional(types.boolean, false),
        })
      ),
      []
    ),
    filter: types.optional(types.string, ""),
    imagesPerPage: types.optional(types.number, 20),
    currentPage: types.optional(types.number, 0),
    filteredImagesNumber: types.optional(types.number, 0),
    isLoading: types.optional(types.boolean, true),
  })
  .views((self) => ({
    get getCurrentGalleryMode(): GalleryType {
      return self.galleryMode;
    },
    get getUserImages(): ImageType[] {
      return self.images;
    },
  }))
  .actions((self) => {
    const imageStoreInit = flow(function* (galleryMode: GalleryType) {
      console.log("imageStoreInit");
      purgeStorage();
      setGalleryMode(galleryMode);
      try {
        yield fetchImages();
      } catch (error) {
        popupNotice(`Error while initializing gallery.
             ${error}`);
      }
    });

    const fetchImages = flow(function* () {
      try {
        self.isLoading = true;
        let requestRoute;
        switch (self.galleryMode) {
          case "userGallery": {
            requestRoute = `/images/userOwnedImages?currentPage=${self.currentPage}&imagesPerPage=${self.imagesPerPage}&filter=${self.filter}`;
            break;
          }
          case "sharedGallery": {
            requestRoute = `/images/userOpenedToImages?currentPage=${self.currentPage}&imagesPerPage=${self.imagesPerPage}&filter=${self.filter}`;
            break;
          }
          case "publicGallery": {
            const { publicSettingsInit } = getParent(self, 1);
            publicSettingsInit();
            requestRoute = `/public/publicImages?currentPage=${self.currentPage}&imagesPerPage=${self.imagesPerPage}&filter=${self.filter}`;
            break;
          }
        }
        const response = yield axios.get(requestRoute);
        const { images, filteredImagesNumber } = response.data.body;
        self.filteredImagesNumber = filteredImagesNumber;
        applySnapshot(self.images, images);
      } catch (error) {
        popupNotice(`Error while fetching images.
             ${error}`);
      } finally {
        self.isLoading = false;
      }
    });

    const uploadImages = flow(function* (imagesToUpload) {
      try {
        const uploadedImages = yield axios.post(
          "/images/upload",
          imagesToUpload,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        const newImages: ImageType[] = uploadedImages.data.newImages;
        const newImagesIdList = newImages.map((image) => image._id);
        const { userSettings } = getParent(self, 1);
        updateUserOwnedImagesLocal([
          ...userSettings.userOwnedImages,
          ...newImagesIdList,
        ]);
        setCurrentPage(0);
        popupNotice(`Images uploaded!`);
      } catch (error) {
        popupNotice(`Error while uploading images.
             ${error}`);
      }
    });

    const editImagesInfo = flow(function* (
      updatedImagesInfo: NewImageInfoType[]
    ) {
      try {
        const updatedImagesToSend = updatedImagesInfo.map(
          (updatedImage: NewImageInfoType) => {
            const imageToEdit: ImageType = getImageById(updatedImage._id)!;
            const updatedImageInfo: NewImageInfoType = {
              _id: updatedImage._id,
              imageInfo: {
                ...imageToEdit.imageInfo,
                ...updatedImage.imageInfo,
              },
            };
            return updatedImageInfo;
          }
        );
        const updatedImagesFromServer: NewImageInfoType[] = yield axios
          .put(`/images/updateImages`, { imagesToUpdate: updatedImagesToSend })
          .then((res) => res.data.body.updatedImages);
        updatedImagesFromServer.forEach((updatedImage) => {
          const imageToEdit: ImageType = getImageById(updatedImage._id)!;
          imageToEdit.updateImageInfo(updatedImage.imageInfo);
        });
      } catch (error: any) {
        popupNotice(`Error while updating image info.
        ${error}`);
      }
    });

    const deleteImages = flow(function* () {
      try {
        if (!self.selectedImages.length) return;
        const response = yield axios.post("/images/deleteImages", {
          imagesToDelete: self.selectedImages,
        });
        clearSelectedList();
        updateUserOwnedImagesLocal(response.data.newImagesList);
        setCurrentPage(0);
        popupNotice(`Images deleted!`);
      } catch (error) {
        popupNotice(`Error while deleting images.
           ${error}`);
      }
    });

    const imagesMultiuserShare = flow(function* (
      imagesIdList: string[],
      usersList: ImageOpenedToUserEntry[]
    ) {
      try {
        yield axios.post("images/multiuserShare", {
          imagesIdList,
          usersList,
        });
      } catch (error) {
        popupNotice(`Error while sharing image group.
        ${error}`);
      }
    });
    const setGalleryMode = (value: GalleryType) => {
      self.galleryMode = value;
    };

    const setFilter = (value: string) => {
      self.filter = value;
      setCurrentPage(0);
    };

    const setImagesPerPage = (value: number) => {
      self.imagesPerPage = value;
      self.currentPage = 0;
      fetchImages();
    };

    const setCurrentPage = (value: number) => {
      self.currentPage = value;
      fetchImages();
    };

    const getImageById = (id: string) =>
      self.images.find((image) => image._id === id);

    const groupSelectModeToggle = () => {
      self.groupSelectMode = !self.groupSelectMode;
    };

    const selectedListChange = (
      selectedId: string,
      imageHostingId = "",
      isPublic = false
    ) => {
      const indexInList = self.selectedImages.findIndex(
        (image) => image.selectedId === selectedId
      );
      if (indexInList === -1) {
        self.selectedImages.push({ selectedId, imageHostingId, isPublic });
      } else {
        self.selectedImages.forEach((image, index) => {
          if (image.selectedId === selectedId)
            self.selectedImages.splice(index, 1);
        });
      }
    };

    const toggleSelectAllImages = () => {
      if (self.images.length === self.selectedImages.length) {
        deselectAllImages();
        return;
      }
      self.images.forEach((image) => {
        image.isSelected = true;
      });
      applySnapshot(
        self.selectedImages,
        self.images.map((image) => ({
          selectedId: image._id,
          imageHostingId: image.imageHostingId,
          isPublic: image.imageInfo.isPublic,
        }))
      );
    };

    const deselectAllImages = () => {
      self.images.forEach((image) => {
        image.isSelected = false;
      });
      clearSelectedList();
    };

    const clearSelectedList = () => {
      applySnapshot(self.selectedImages, []);
    };

    const updateUserOwnedImagesLocal = (newImagesIdList: string[]) => {
      const { userSettings } = getParent(self, 1);
      userSettings.updateUserOwnedImages(newImagesIdList);
    };

    const purgeStorage = () => {
      applySnapshot(self, initialImageStoreSettings);
    };

    return {
      setGalleryMode,
      imageStoreInit,
      getImageById,
      editImagesInfo,
      uploadImages,
      deleteImages,
      setFilter,
      setImagesPerPage,
      setCurrentPage,
      groupSelectModeToggle,
      imagesMultiuserShare,
      selectedListChange,
      deselectAllImages,
      toggleSelectAllImages,
      clearSelectedList,
      purgeStorage,
    };
  });

export interface ImageInfoType extends Instance<typeof ImageInfo> {}
export interface ImageType extends Instance<typeof Image> {}
export interface ImagesStoreType extends Instance<typeof ImagesStore> {}
export default ImagesStore;
