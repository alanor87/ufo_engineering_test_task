import React, { useState } from "react";
import QRCode from "react-qr-code";
import store from "../../../MST/store";
import TagEditor from "../../TagEditor";
import { Button, Icon, ToggleButton } from "../../elements";
import { ImageOpenedToUserEntry } from "types/common";
import { popupNotice } from "utils/popupNotice";
import styles from "./ShareOverlay.module.scss";

interface Props {
  _id: string;
  isPublic: boolean;
  openedTo: string[];
  sharedByLink: boolean;
  onCloseShareOverlay: () => void;
  setIsLoading: (value: boolean) => void;
}

const ShareOverlay: React.FC<Props> = ({
  _id,
  isPublic,
  openedTo,
  sharedByLink,
  onCloseShareOverlay,
  setIsLoading,
}) => {
  const { backendUrl } = store;
  const { editImagesInfo, imagesMultiuserShare } = store.imagesStoreSettings;
  const { userName, checkIfUserExistsByName } = store.userSettings;

  const initialOpenedToEntries: ImageOpenedToUserEntry[] = openedTo.map(
    (name) => ({ name, action: "none" })
  );

  const [isPublicState, setIsPublicState] = useState(isPublic);
  const [isSharedByLinkState, setIsSharedByLinkState] = useState(sharedByLink);
  const [openedToEntriesList, setOpenedToEntriesList] = useState(
    initialOpenedToEntries
  ); // For the imagesMultiuserShare - user names and action - to add or to remove the imagesOpenedToUser user property.
  const [openedToOverlayIsOpen, setOpenedToOverlayIsOpen] = useState(false);
  const [qrIsOpen, setQrIsOpen] = useState(false);

  const openToOverlayCloseHandler = () => {
    setOpenedToOverlayIsOpen(false);
  };

  const publicStateChangeHandler = () => {
    setIsPublicState(!isPublicState);
  };

  const userAddHandler = async (nameToAdd: string) => {
    const userDoesExist = await checkIfUserExistsByName(nameToAdd);
    if (nameToAdd === userName || !userDoesExist) return;

    const indexOfEntry = openedToEntriesList.findIndex(
      (entry) => entry.name === nameToAdd
    );

    if (indexOfEntry !== -1) {
      const updatedEntriesList: ImageOpenedToUserEntry[] = [
        ...openedToEntriesList,
      ];
      updatedEntriesList[indexOfEntry].action = "add";
      setOpenedToEntriesList(updatedEntriesList);
    } else {
      setOpenedToEntriesList([
        ...openedToEntriesList,
        { name: nameToAdd, action: "add" },
      ]);
    }
  };

  const userDelHandler = (nameToRemove: string) => {
    const updatedEntriesList: ImageOpenedToUserEntry[] =
      openedToEntriesList.map((entry) => {
        if (entry.name === nameToRemove)
          return { name: entry.name, action: "remove" };
        return entry;
      });
    setOpenedToEntriesList(updatedEntriesList);
  };

  const acceptChangesHandler = async () => {
    setIsLoading(true);
    /*
     *  Mapping the array of just user names for the image object openedTo property
     *  and writing the updated image info from the backend to the corresponding images in store.
     */
    const openedToNamesList = getOpenegToNamesList();
    await editImagesInfo([
      {
        _id,
        imageInfo: {
          isPublic: isPublicState,
          openedTo: openedToNamesList,
          sharedByLink: isSharedByLinkState,
        },
      },
    ]);

    /*
     * Updating each users selectedUsersList list with the current image id.
     * Performing this operation on the backend.
     */
    await imagesMultiuserShare([_id], openedToEntriesList);
    onCloseShareOverlay();
    setIsLoading(false);
  };

  const getOpenegToNamesList = () =>
    openedToEntriesList
      .filter((entry) => entry.action !== "remove")
      .map((entry) => entry.name);

  const sharedByLinkStateToggleHandler = (value: boolean) => {
    setIsSharedByLinkState(value);
    if (value) {
      popupNotice("Sharing link was created. Click accept to activate it.");
    } else {
      popupNotice("Sharing link was removed. Click accept to deactivate it.");
    }
  };

  const shareLinkCopyHandler = (e: React.SyntheticEvent) => {
    navigator.clipboard.writeText(
      backendUrl + "/public/standaloneShare/" + _id
    );
    popupNotice("Sharing link copied to clipboard.");
  };

  const qrIsOpenToggleHandler = () => {
    setQrIsOpen(!qrIsOpen);
  };

  const socialShareButtonClickHandler = (socialNetwork: string) => () => {
    let socialNetShareUrl;
    switch (socialNetwork) {
      case "facebook": {
        socialNetShareUrl =
          "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fgallery-app-mj.herokuapp.com%2Fapi%2Fv1%2Fpublic%2FstandaloneShare%2F61ebf765d3bf528a0b26ef97&amp;src=sdkpreparse";
        break;
      }
    }
    window.open(socialNetShareUrl, "_blank", "popup=1");
  };

  return (
    <div className={`imageCardOverlay`}>
      <div className={`${styles.shareOverlay}`}>
        <p className={`imageCardOverlay-title ${styles.shareOverlayTitle}`}>
          Image share options
        </p>
        <div className={styles.option}>
          <div className={styles.socialNetWrapper}>
            {" "}
            <div
              data-href="https://gallery-app-mj.herokuapp.com/api/v1/public/standaloneShare/61ebf765d3bf528a0b26ef97"
              data-layout="button"
              data-size="small"
              onClick={socialShareButtonClickHandler("facebook")}
            >
              <Icon iconName="icon_social_facebook" side={30} />
            </div>
            <div>
              <Icon iconName="icon_social_twitter" side={30} />
            </div>
            <div>
              <Icon iconName="icon_social_instagram" side={30} />
            </div>
            <div>
              <Icon iconName="icon_social_pinterest" side={30} />
            </div>
          </div>
        </div>
        <div className={styles.option}>
          Make the image public
          <ToggleButton
            isChecked={isPublicState}
            toggleHandler={publicStateChangeHandler}
            className={styles.shareOverlayToggleBtn}
          />
        </div>
        <div className={styles.option}>
          Is opened to users
          {getOpenegToNamesList().length ? (
            <span className="footnote">users available</span>
          ) : null}
          <ToggleButton
            isChecked={openedToOverlayIsOpen}
            toggleHandler={setOpenedToOverlayIsOpen}
            className={styles.shareOverlayToggleBtn}
          />
        </div>
        <div className={styles.option}>
          {isSharedByLinkState ? (
            <>
              Link :
              <span onClick={shareLinkCopyHandler} className="footnote">
                click here to copy link
              </span>
            </>
          ) : (
            "Activate sharing link"
          )}
          <ToggleButton
            isChecked={isSharedByLinkState}
            toggleHandler={sharedByLinkStateToggleHandler}
            className={styles.shareOverlayToggleBtn}
          />
        </div>
        <div className={styles.option}>
          Show QR code link
          <ToggleButton
            isChecked={qrIsOpen}
            toggleHandler={qrIsOpenToggleHandler}
            className={styles.shareOverlayToggleBtn}
            disabled={!isSharedByLinkState}
          />
        </div>
        <div className={styles.buttonWrapper}>
          <Button type="button" text="Accept" onClick={acceptChangesHandler} />
          <Button type="button" text="Cancel" onClick={onCloseShareOverlay} />
        </div>
      </div>{" "}
      {qrIsOpen && (
        <div className={styles.qrWrapper} onClick={qrIsOpenToggleHandler}>
          <QRCode
            value={backendUrl + "/public/standaloneShare/" + _id}
            size={300}
          />
        </div>
      )}
      {openedToOverlayIsOpen && (
        <TagEditor
          tags={getOpenegToNamesList()}
          closeHandle={openToOverlayCloseHandler}
          onTagDelete={userDelHandler}
          onAddTags={userAddHandler}
        />
      )}
    </div>
  );
};

export default ShareOverlay;
