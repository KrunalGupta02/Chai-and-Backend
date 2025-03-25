import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getWatchHistory,
  loginUser,
  logOutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  userChannelProfile,
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
router.route("/refresh-token").post(refreshAccessToken);

router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/current-user').get(verifyJWT, getCurrentUser);
// Patch will only update the specific which is mentioned not all but
// post will update the whole file
router.route('/update-account').patch(verifyJWT, updateAccountDetails);
router.route('/avatar').patch(verifyJWT, upload.single('avatar'), updateUserAvatar);
router.route('/cover-image').patch(verifyJWT, upload.single('coverImage'), updateUserCoverImage);

// If data is taking from url-params
router.route('/c/:username').get(verifyJWT, userChannelProfile);

router.route('/history').get(verifyJWT, getWatchHistory)

export default router;
