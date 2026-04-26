import { Router } from 'express'
import { getCrops, getCrop, createCrop, updateCrop, deleteCrop, createVariety, updateVariety, deleteVariety } from '../controllers/crops.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getCrops)
router.post('/', createCrop)
router.get('/:id', getCrop)
router.put('/:id', updateCrop)
router.delete('/:id', deleteCrop)
router.post('/:id/varieties', createVariety)
router.put('/:id/varieties/:varId', updateVariety)
router.delete('/:id/varieties/:varId', deleteVariety)
export default router
