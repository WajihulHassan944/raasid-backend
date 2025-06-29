import express from 'express';
import {  resolveZone, getAllCities, resolveZoneWithRate } from '../controllers/City.js';

const router = express.Router();

router.get('/resolve-zone/:originCity/:destinationCity', resolveZone);
router.get('/resolve-zone/:originCity/:destinationCity/:weight', resolveZoneWithRate);

router.get('/', getAllCities);
export default router;
