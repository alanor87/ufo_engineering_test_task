import axios from "axios";
import { popupNotice } from "../utils/popupNotice";
import { types, flow, Instance, getParent } from "mobx-state-tree";
import LoginFormInterface from "../components/LoginForm/types";
import RegisterFormInterface from "../components/RegisterForm/types";

interface UserSettingsInterface {
  userName: string;
  userEmail: string;
  userToken: string;
  userIsAuthenticated?: boolean;
}

const userSettings = types
  .model({
    userName: types.optional(types.string, ""),
    userEmail: types.optional(types.string, ""),
    userToken: types.optional(types.string, ""),
    userIsAuthenticated: types.optional(types.boolean, false),
  })
  .actions((self) => {
    const toggleUserIsAuthenticated = (isAuthenticated: boolean) => {
      self.userIsAuthenticated = isAuthenticated;
    };

    const userRegister = flow(function* (newUser: RegisterFormInterface) {
      try {
        const registeredUser = yield axios.post("/auth/register", newUser);
        self.userName = registeredUser.data.userName;
        self.userEmail = registeredUser.data.userEmail;
        self.userIsAuthenticated = true;
      } catch (error) {
        popupNotice(`Error registering user.
         ${error}`);
      }
    });

    const userLogin = flow(function* (userLoginData: LoginFormInterface) {
      const authenticatedUser = yield axios.post("/auth/login", userLoginData);
      self.userName = authenticatedUser.data.body.userName;
      self.userEmail = authenticatedUser.data.body.userEmail;
      self.userToken = authenticatedUser.data.body.userToken;
      axios.defaults.headers.common.Authorization = `Bearer ${self.userToken}`;
      self.userIsAuthenticated = true;
    });

    return { userRegister, userLogin, toggleUserIsAuthenticated };
  });

export interface UserSettingsType extends Instance<typeof userSettings> {}
export default userSettings;
