import { Router } from 'express'
import { getClients, createClient, updateClient, deleteClient } from '../controllers/clients.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getClients)
router.post('/', createClient)
router.put('/:id', updateClient)
router.delete('/:id', deleteClient)
export default router
