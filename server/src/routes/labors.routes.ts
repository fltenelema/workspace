import { Router } from 'express'
import { getLabors, createLabor, updateLabor, deleteLabor } from '../controllers/labors.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getLabors)
router.post('/', createLabor)
router.put('/:id', updateLabor)
router.delete('/:id', deleteLabor)
export default router
