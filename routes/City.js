import express from 'express';
import multer from 'multer';
import { uploadCitiesFromExcel, resolveZone, getAllCities } from '../controllers/City.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadCitiesFromExcel);
router.get('/resolve-zone/:originCity/:destinationCity', resolveZone);
router.get('/', getAllCities);
export default router;
