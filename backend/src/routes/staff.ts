import { Router } from 'express';
import { getStaff } from '../controllers/staff';

const router = Router();

router.get('/', getStaff);

export default router;
