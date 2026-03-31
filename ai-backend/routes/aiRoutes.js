const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/ocr', aiController.extractText);
router.post('/summarize', aiController.summarize);
router.post('/keypoints', aiController.extractKeyPoints);
router.post('/classify', aiController.classifyTopic);
router.post('/teach', aiController.generateLecture);

module.exports = router;
