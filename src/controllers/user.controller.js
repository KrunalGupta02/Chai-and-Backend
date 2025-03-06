import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//? This is just for example for test in postman
// const registerUser = asyncHandler(async (req, res) => {
//   res.status(200).json({
//     message: "ok",
//   });
// });

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
  console.log("email: ", email);

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
  const existedUser = User.findOne({
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

  const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

export { registerUser };
