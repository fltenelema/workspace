import { Router } from 'express'
import { getCrops, getCrop, createCrop, updateCrop, deleteCrop, createVariety, deleteVariety } from '../controllers/crops.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getCrops)
router.post('/', createCrop)
router.get('/:id', getCrop)
router.put('/:id', updateCrop)
router.delete('/:id', deleteCrop)
router.post('/:id/varieties', createVariety)
router.delete('/:id/varieties/:varId', deleteVariety)
export default router
