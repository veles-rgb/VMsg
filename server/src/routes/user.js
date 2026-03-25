const router = require('express').Router();

const controller = require('../controllers/user');
const upload = require('../middleware/multer');

router.get('/online', controller.getOnlineUsers);
router.get('/search', controller.searchUsers);
router.patch('/profile-picture', upload.single('file'), controller.uploadProfilePicture);
router.patch('/display-name', controller.updateDisplayName);

module.exports = router;