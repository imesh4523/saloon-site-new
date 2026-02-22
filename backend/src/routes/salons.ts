import { Router } from 'express';
import { getSalons, getSalonById, getSalonBySlug } from '../controllers/salons';

const router = Router();

router.get('/', getSalons);
router.get('/slug/:slug', getSalonBySlug);
router.get('/:id', getSalonById);

export default router;
