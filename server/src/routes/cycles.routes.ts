import { Router } from 'express'
import { getCycles, getActiveCycles, getCycle, createCycle, closeCycle, updateCycleStatus, deleteCycle } from '../controllers/cycles.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/active', getActiveCycles)
router.get('/', getCycles)
router.post('/', createCycle)
router.get('/:id', getCycle)
router.patch('/:id/close', closeCycle)
router.patch('/:id/status', updateCycleStatus)
router.delete('/:id', deleteCycle)
export default router
