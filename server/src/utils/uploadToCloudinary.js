const streamifier = require('streamifier');
const cloudinary = require('./cloudinary');

function uploadToCloudinary(fileBuffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: options.resource_type || 'auto',
                folder: options.folder,
                public_id: options.public_id,
                overwrite: options.overwrite ?? false,
                unique_filename: options.unique_filename ?? true,
                invalidate: options.invalidate ?? false,
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
}

module.exports = uploadToCloudinary;