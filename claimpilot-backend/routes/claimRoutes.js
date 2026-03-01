const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { uploadClaim, getClaims, getClaimById, updateClaimStatus, deleteClaim, generateClaimReport } = require('../controllers/claimController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.route('/')
  .post(protect, upload.single('claimFile'), uploadClaim)
  .get(protect, getClaims);

router.route('/:id/report')
  .get(protect, generateClaimReport);

router.route('/:id')
  .get(protect, getClaimById)
  .put(protect, updateClaimStatus)
  .delete(protect, deleteClaim);

module.exports = router;
