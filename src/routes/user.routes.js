import { Router } from "express";
import {
  loginUser,
  logOutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  // below code is handling the file uploading here we inject the middleware
  upload.fields([
    {
      //* this name should be same an frontend and backend
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// secured route
router.route("/logout").post(verifyJWT, logOutUser); // injecting the authMiddleware before

export default router;
