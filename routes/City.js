import express from 'express';
import {  resolveZone, getAllCities } from '../controllers/City.js';

const router = express.Router();

router.get('/resolve-zone/:originCity/:destinationCity', resolveZone);
router.get('/', getAllCities);
export default router;
