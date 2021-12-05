import { useState } from "react";
import store from "../../../MST/store";
import TagEditor from "../../TagEditor";
import { Checkbox, Button, Tag } from "../../elements";
import { ReactComponent as EditIcon } from "../../../img/icon_edit.svg";
import styles from "./ShareOverlay.module.scss";

interface Props {
  _id: string;
  isPublic: boolean;
  openedTo: string[];
  onCloseShareOverlay: () => void;
}

const ShareOverlay: React.FunctionComponent<Props> = ({
  _id,
  isPublic,
  openedTo,
  onCloseShareOverlay,
}) => {
  const [isPublicState, setisPublicState] = useState(isPublic);
  const [openedToList, setOpenedToList] = useState(openedTo);
  const [openedToOverlayIsOpen, setOpenedToOverlayIsOpen] = useState(false);
  const { editImageInfo } = store.imagesStoreSettings;

  const publicStateChangeHandler = () => {
    setisPublicState(!isPublicState);
  };

  const openToOverlayOpenHandler = () => {
    setOpenedToOverlayIsOpen(true);
  };

  const openToOverlayCloseHandler = () => {
    setOpenedToOverlayIsOpen(false);
  };

  const acceptChangesHandler = () => {
    editImageInfo(_id, { isPublic: isPublicState, openedTo: openedToList });
    onCloseShareOverlay();
  };

  const userDelHandler = (userToDelete: string) => {
    const newTags = openedToList.filter((user) => user !== userToDelete);
    setOpenedToList(newTags);
  };
  const userAddHandler = (userToAdd: string) => {
    setOpenedToList([...openedToList, userToAdd]);
  };

  return !openedToOverlayIsOpen ? (
    <div className={`imageCardOverlay ${styles.shareOverlay}`}>
      <p className={`imageCardOverlay-title ${styles.shareOverlayTitle}`}>
        Image share options
      </p>
      <div className={styles.option}>
        <label>
          Make the image public.
          <Checkbox
            isChecked={isPublicState}
            onChange={publicStateChangeHandler}
            className={styles.shareOverlayCheckbox}
          />
        </label>
      </div>
      <div className={styles.option}>
        <p className={styles.openedTo}>Is opened to users : </p>
        {openedToList.map((entry, index) => (
          <Tag key={index} tagValue={entry} />
        ))}
        <Button
          className={styles.addUserBtn}
          text="Edit"
          title="Edit list of users with acces to this image"
          icon={EditIcon}
          onClick={openToOverlayOpenHandler}
        />
      </div>
      <div className="imageCardOverlay-buttonWrapper">
        <Button type="button" text="Accept" onClick={acceptChangesHandler} />
        <Button type="button" text="Cancel" onClick={onCloseShareOverlay} />
      </div>
    </div>
  ) : (
    <TagEditor
      tags={openedToList}
      closeHandle={openToOverlayCloseHandler}
      onTagDelete={userDelHandler}
      onAddTag={userAddHandler}
      isLoading={false}
    />
  );
};

export default ShareOverlay;
