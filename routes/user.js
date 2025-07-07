import express from 'express';
import { signup, login, updateUser, deleteUser, getAllUsers, getAllSubadmins, resetPassword } from '../controllers/user.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);


router.put('/update/:id', updateUser);
router.delete('/delete/:id', deleteUser);
router.get('/all', getAllUsers);
router.get('/subadmins', getAllSubadmins);
router.post("/reset-password", resetPassword);

export default router;
