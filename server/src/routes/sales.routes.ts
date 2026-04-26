import { Router } from 'express'
import { getSales, createSale, updateSale, deleteSale } from '../controllers/sales.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getSales)
router.post('/', createSale)
router.put('/:id', updateSale)
router.delete('/:id', deleteSale)
export default router
