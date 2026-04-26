import { Router } from 'express'
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../controllers/inventory.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getInventory)
router.post('/', createInventoryItem)
router.put('/:id', updateInventoryItem)
router.delete('/:id', deleteInventoryItem)
export default router
