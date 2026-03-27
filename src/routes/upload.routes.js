const express = require("express");
const router = express.Router();
const { upload } = require("../middlewares/upload.middleware");
const { uploadImage } = require("../controllers/uploads.controller");

router.post("/image", upload.single("image"), uploadImage);

module.exports = router;
