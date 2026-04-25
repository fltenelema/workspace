import { Router } from 'express'
import { getSales, createSale, deleteSale } from '../controllers/sales.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getSales)
router.post('/', createSale)
router.delete('/:id', deleteSale)
export default router
