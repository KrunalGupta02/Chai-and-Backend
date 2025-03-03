//? What is asyncHandler?
// asyncHandler is a higher-order function.
// A higher-order function is a function that takes another function as an argument and possibly returns a new function.

//?Why is asyncHandler needed?
// In Express.js, if an asynchronous function throws an error, you need to explicitly pass that error to the next function for the Express error-handling middleware to catch it. Without this, your server might crash or not handle the error properly.

const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// Different way of writing same above async handler
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//       await fn(req,res,next)
//   } catch (err) {
//     res.status(err.code || 500).json({
//       success: false,
//       message:err.message
//     });
//   }
// };
