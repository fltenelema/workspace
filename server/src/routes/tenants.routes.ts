import { Router } from 'express'
import { getTenants, getTenant, createTenant, updateTenant, toggleTenant, deleteTenant } from '../controllers/tenants.controller'
import { authenticate, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate, requireRole('SUPER_ADMIN'))

router.get('/', getTenants)
router.get('/:id', getTenant)
router.post('/', createTenant)
router.put('/:id', updateTenant)
router.patch('/:id/toggle', toggleTenant)
router.delete('/:id', deleteTenant)

export default router
