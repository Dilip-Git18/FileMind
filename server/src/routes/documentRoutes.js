const express = require('express');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentStatus,
  searchInDocument,
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/status/:id', getDocumentStatus);
router.get('/:id/search', searchInDocument);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);

module.exports = router;
