import express from 'express';
import { submitInquiry, getAllInquiries, replyToInquiry } from '../controllers/inquiry.js';

const router = express.Router();

router.post('/submitinquiry', submitInquiry);  // POST /api/inquiry
router.get('/inquiries', getAllInquiries); // GET /api/inquiries
router.post('/reply', replyToInquiry); 

export default router;