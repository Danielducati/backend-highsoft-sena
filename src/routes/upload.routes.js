const express = require("express");
const router = express.Router();
const { upload } = require("../middlewares/upload.middleware");
const { uploadImage } = require("../controllers/uploads.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

router.post("/image", verificarToken, upload.single("image"), uploadImage);

module.exports = router;
