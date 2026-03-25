const express = require('express');
const upload = require('../middleware/multer');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

const router = express.Router();

const allowedFolders = {
    chatAttachments: 'vmsg/chat-attachments',
};

router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const folderKey = req.body.folderKey;
        const folder = allowedFolders[folderKey];

        if (!folder) {
            return res.status(400).json({ error: 'Invalid folder key' });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
            folder,
            resource_type: 'auto',
            unique_filename: true,
        });

        return res.status(200).json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                originalName: req.file.originalname,
                bytes: result.bytes,
                format: result.format,
                width: result.width ?? null,
                height: result.height ?? null,
            },
        });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;