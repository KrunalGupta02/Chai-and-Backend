import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file on the cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    // console.log("File is uploaded on cloudinary", response.url);

    // Unlink the file
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    // Remove the locally saved temp file as the upload operation got failed
    fs.unlinkSync(localFilePath);

    return null;
  }
};

export { uploadOnCloudinary };
