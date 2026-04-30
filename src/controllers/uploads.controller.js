const cloudinary = require("../config/cloudinary");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envio ningun archivo." });
    }

    const folder = req.body.folder || "highsoft";

    const result = await new Promise((resolve, reject) => {
      // Timeout de 20 segundos para Cloudinary
      const timeout = setTimeout(() => reject(new Error("Timeout al subir a Cloudinary")), 20_000);

      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (err, uploadResult) => {
          clearTimeout(timeout);
          if (err) return reject(err);
          return resolve(uploadResult);
        }
      );

      stream.end(req.file.buffer);
    });

    return res.status(201).json({
      message: "Imagen subida correctamente.",
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error al subir imagen a Cloudinary.",
      details: error.message,
    });
  }
};

module.exports = { uploadImage };
