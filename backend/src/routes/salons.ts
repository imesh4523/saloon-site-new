import { Router } from 'express';
import { getSalons, getSalonById, getSalonBySlug } from '../controllers/salons';

const router = Router();

router.get('/', getSalons);
router.get('/:id', getSalonById);
router.get('/slug/:slug', getSalonBySlug);

export default router;
