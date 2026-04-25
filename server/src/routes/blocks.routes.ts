import { Router } from 'express'
import { getBlocks, getFreeBlocks, getBlock, createBlock, updateBlock, deleteBlock } from '../controllers/blocks.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/free', getFreeBlocks)
router.get('/', getBlocks)
router.post('/', createBlock)
router.get('/:id', getBlock)
router.put('/:id', updateBlock)
router.delete('/:id', deleteBlock)
export default router
