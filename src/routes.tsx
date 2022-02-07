import { lazy } from "react";

const LoginRegisterView = lazy(() => import("./views/LoginRegister"));
const GalleryView = lazy(() => import("./views/Gallery"));
const SingleImageView = lazy(() => import("./components/Modals/Modal"));

const routes = [
  {
    isPublic: true,
    path: "/login",
    redirectTo: "/userGallery",
    exact: true,
    restricted: true,
    component: LoginRegisterView,
    label: "LoginView",
  },
  {
    isPublic: true,
    path: "/register",
    redirectTo: "/userGallery",
    exact: true,
    restricted: true,
    component: LoginRegisterView,
    label: "RegisterView",
  },
  {
    isPublic: false,
    path: "/userGallery",
    redirectTo: "/login",
    exact: true,
    restricted: false,
    component: GalleryView,
    label: "userGallery",
  },
  {
    isPublic: false,
    path: "/sharedGallery",
    redirectTo: "/login",
    exact: true,
    restricted: false,
    component: GalleryView,
    label: "sharedGallery",
  },
  {
    isPublic: true,
    path: "/publicGallery",
    redirectTo: "/login",
    exact: true,
    restricted: false,
    component: GalleryView,
    label: "publicGallery",
  },
  {
    isPublic: true,
    path: "/singleImage",
    redirectTo: "/login",
    exact: false,
    restricted: false,
    component: SingleImageView,
    label: "publicGallery",
  },
];

export default routes;
