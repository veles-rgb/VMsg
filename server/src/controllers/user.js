const { prisma } = require('../../lib/prisma.mjs');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { getOnlineUserIds } = require('../socket');

async function getOnlineUsers(req, res, next) {
    try {
        const currentUserId = req.user.id;
        const onlineUserIds = getOnlineUserIds().filter((id) => id !== currentUserId);

        if (onlineUserIds.length === 0) {
            return res.json({ users: [] });
        }

        const online = await prisma.user.findMany({
            where: {
                id: {
                    in: onlineUserIds,
                },
            },
            orderBy: {
                displayName: 'asc',
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                profilePictureUrl: true,
            },
        });

        return res.json({ users: online });
    } catch (err) {
        return next(err);
    }
}

async function searchUsers(req, res, next) {
    try {
        const userId = req.user.id;
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                id: {
                    not: userId
                },
                OR: [
                    {
                        username: {
                            contains: q,
                            mode: "insensitive"
                        }
                    },
                    {
                        displayName: {
                            contains: q,
                            mode: "insensitive"
                        }
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                profilePictureUrl: true
            },
            take: 20,
            orderBy: {
                displayName: "asc"
            }
        });

        return res.json({ users });
    } catch (err) {
        return next(err);
    }
}

async function uploadProfilePicture(req, res, next) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Only image uploads are allowed for profile pictures' });
        }

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'vmsg/profile-pictures',
            resource_type: 'image',
            public_id: `user-${req.user.id}`,
            overwrite: true,
            unique_filename: false,
            invalidate: true,
        });

        const updatedUser = await prisma.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                profilePictureUrl: result.secure_url,
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                profilePictureUrl: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Profile picture updated',
            user: updatedUser,
        });
    } catch (err) {
        return next(err);
    }
}

async function updateDisplayName(req, res, next) {
    try {
        const userId = req.user.id;
        const { displayName } = req.body;

        const trimmedDisplayName = displayName?.trim();

        if (!trimmedDisplayName) {
            return res.status(400).json({ error: 'Display name is required' });
        }

        if (trimmedDisplayName.length < 2) {
            return res.status(400).json({ error: 'Display name must be at least 2 characters long' });
        }

        if (trimmedDisplayName.length > 25) {
            return res.status(400).json({ error: 'Display name must be 25 characters or less' });
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                displayName: trimmedDisplayName,
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                profilePictureUrl: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Display name updated',
            user: updatedUser,
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getOnlineUsers,
    searchUsers,
    uploadProfilePicture,
    updateDisplayName,
};