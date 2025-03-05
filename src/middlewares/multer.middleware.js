//* Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.

import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    console.log("File", file);

    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });
