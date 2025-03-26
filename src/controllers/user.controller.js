import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//? This is just for example for test in postman
// const registerUser = asyncHandler(async (req, res) => {
//   res.status(200).json({
//     message: "ok",
//   });
// });

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // first find the user for generate the token
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // save refreshToken to db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token "
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Steps:-
  // 1) get user details from frontend
  // 2) validation - not empty
  // 3) check if user already exists: username , email
  // 4) check for images , check for avatar
  // 5) upload to them cloudinary -> avatar
  // 6) Create user object - create entry in DB
  // 7) Remove password and refreshToken field from response
  // 8) check for user creation
  // 9) Return response

  const { fullName, email, username, password } = req.body;

  // console.log("username: ", email);
  console.log("Req body", req.body);

  //? Validation on data
  // if (fullName === "") {
  //   throw new ApiError(400, "Full name is required");
  // }

  // same as above code
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Full name is required");
  }

  // check if user already exists for not
  const existedUser = await User.findOne({
    // $or is mongodb operator
    //? Use the $or operator to perform a logical OR operation on an array of expressions and select documents that satisfy at least one of the expressions.
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already existed");
  }

  // Handling img upload using multer using files options and get file path
  //? this avatar and coverImage coming from user.routes.js middleware
  const avatarLocalPath = req.files?.avatar[0]?.path;

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Upload img on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Is user is created or not then unselct the password and refreshToken
  const createdUser = await User.findById(user._id).select(
    // this is syntax where '-' sign is used to remove the fiels
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wront while registering the user");
  }

  // Returing the response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // Steps:-
  /*1. req.body -> data
  2. username or email 
  3. find the user 
  4. check password 
  5. access and refresh token generate and send it to user
  6. send cookie 
  7. return response   
  */

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // Here is an alternative of above code if any data is available
  /*
  if(!(username || email)){
    throw new ApiError(400,'username or email is required');
  }
   */

  const user = await User.findOne({
    // find any one username or email
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // If user available
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Make the access and refesh
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Now send it to cookies

  // get the user data for refreshed data for access and refresh token
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // from these options then these options is modifiable through server only not with client
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

/*
User: This is the model (class) used to interact with the database.
It's used when you're calling methods like User.findOne(), User.create(), User.findById(), etc.

user: This is an instance (document) of the User model representing a single user in your database.
This is the actual instance of the user in the database, and you can access its properties like user.email, user.username, etc.
 */

const logOutUser = asyncHandler(async (req, res) => {
  // Steps:-
  /*
  1. clear the cookies 
  2. reset the refreshToken 
  */

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //this removes the field from document
      },
    },
    {
      //this options will return new updated value not the old one
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = await asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshAccessToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invlaid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(200, req.user, "Current User Fetch Successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Full name or email is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email
      }
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is missing')
  }

  //TODO:- Delete Old image - assignment
  if (req.user.avatar) {
    console.log('req.user.avatar', req.user.avatar)
    const publicId = req.user.avatar.split('/').pop().split('.')[0];
    await deleteFromCloudinary(publicId)
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, 'Error while uploading on avatar')
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: { avatar: avatar.url }
    },
    { new: true }
  ).select("-password")

  return res.status(200).json(new ApiResponse(200, user, 'Avatar Image updated successfully'))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, 'Cover Image file is missing')
  }

  //TODO:- Delete Old image - assignment
  /*
  - delete it after uploding the new image
  - make utility function for deleting the image
  - take the old url from the user object
  - and delete it
  */

  if (req.user.coverImage) {
    const publicId = req.user.coverImage.split('/').pop().split('.')[0];
    await deleteFromCloudinary(publicId)
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new ApiError(400, 'Error while uploading on cover image')
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: { coverImage: coverImage.url }
    },
    { new: true }
  ).select("-password")

  return res.status(200).json(new ApiResponse(200, user, 'Cover Image updated successfully'))
})

const userChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, 'username is missing!')
  }

  const channel = await User.aggregate([
    {
      $match: username?.toLowerCase()
    }, {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: 'subscribers'
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: 'subscribedTo'
      }
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      }
    }
  ]);

  console.log(channel, 'channel');

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], 'User channel fetched successfully'))

});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user_id)
      }
    },
    {
      $lookup: {
        from: 'vidoes',
        localField: 'watchHistory',
        foreignField: '_id',
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: 'owner',
              foreignField: '_id',
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                },
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, 'Watch History fetched successfully'))
})

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  userChannelProfile,
  getWatchHistory
};
