import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tf = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

const articleInclude = {
  block:       { select: { id: true, code: true, name: true } },
  cycle:       { select: { id: true, code: true, status: true } },
  crop:        { select: { id: true, name: true } },
  createdBy:   { select: { id: true, name: true } },
  publishedBy: { select: { id: true, name: true } },
}

export const getArticles = async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = { ...tf(req) }

  // SUPERVISOR: solo ve publicados + sus propios borradores
  if (req.userRole === 'SUPERVISOR') {
    where.OR = [
      { status: 'Publicado' },
      { status: 'Borrador', createdById: req.userId },
    ]
  }

  const { category, status, cropId, blockId, search } = req.query

  if (category) where.category = category
  if (status && req.userRole !== 'SUPERVISOR') where.status = status
  if (cropId)  where.cropId  = parseInt(String(cropId))
  if (blockId) where.blockId = parseInt(String(blockId))

  if (search) {
    const s = String(search)
    const textFilter = [
      { title:   { contains: s } },
      { content: { contains: s } },
      { tags:    { contains: s } },
    ]
    // Combinar con el OR del SUPERVISOR si existe
    if (where.OR) {
      where.AND = [{ OR: where.OR as object[] }, { OR: textFilter }]
      delete where.OR
    } else {
      where.OR = textFilter
    }
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    include: articleInclude,
    orderBy: { updatedAt: 'desc' },
  })
  res.json(articles)
}

export const getArticle = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const where: Record<string, unknown> = { id, ...tf(req) }

  if (req.userRole === 'SUPERVISOR') {
    where.OR = [
      { status: 'Publicado' },
      { status: 'Borrador', createdById: req.userId },
    ]
  }

  const article = await prisma.knowledgeArticle.findFirst({ where, include: articleInclude })
  if (!article) { res.status(404).json({ message: 'Artículo no encontrado' }); return }
  res.json(article)
}

export const createArticle = async (req: AuthRequest, res: Response) => {
  const { title, category, content, tags, blockId, cycleId, cropId } = req.body

  if (!title || !category || !content) {
    res.status(400).json({ message: 'Título, categoría y contenido son requeridos' }); return
  }

  const VALID_CATEGORIES = ['Plagas', 'Enfermedades', 'Fertilización', 'Riego / Suelo']
  if (!VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ message: 'Categoría inválida' }); return
  }

  const article = await prisma.knowledgeArticle.create({
    data: {
      title,
      category,
      content,
      tags:    tags || null,
      status:  'Borrador',
      blockId: blockId ? parseInt(blockId) : null,
      cycleId: cycleId ? parseInt(cycleId) : null,
      cropId:  cropId  ? parseInt(cropId)  : null,
      createdById: req.userId ?? null,
      tenantId: req.userRole === 'SUPER_ADMIN' ? null : (req.tenantId ?? null),
    },
    include: articleInclude,
  })
  res.status(201).json(article)
}

export const updateArticle = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const existing = await prisma.knowledgeArticle.findFirst({ where: { id, ...tf(req) } })
  if (!existing) { res.status(404).json({ message: 'Artículo no encontrado' }); return }

  // SUPERVISOR solo puede editar sus propios borradores
  if (req.userRole === 'SUPERVISOR') {
    if (existing.createdById !== req.userId) {
      res.status(403).json({ message: 'Solo puedes editar tus propios artículos' }); return
    }
    if (existing.status === 'Publicado') {
      res.status(403).json({ message: 'No puedes editar un artículo ya publicado' }); return
    }
  }

  const { title, category, content, tags, blockId, cycleId, cropId, status } = req.body
  const data: Record<string, unknown> = {}

  if (title)    data.title    = title
  if (category) {
    const VALID = ['Plagas', 'Enfermedades', 'Fertilización', 'Riego / Suelo']
    if (!VALID.includes(category)) { res.status(400).json({ message: 'Categoría inválida' }); return }
    data.category = category
  }
  if (content)            data.content = content
  if (tags !== undefined) data.tags    = tags || null
  if (blockId !== undefined) data.blockId = blockId ? parseInt(blockId) : null
  if (cycleId !== undefined) data.cycleId = cycleId ? parseInt(cycleId) : null
  if (cropId  !== undefined) data.cropId  = cropId  ? parseInt(cropId)  : null

  // Solo ADMIN/USER/SUPER_ADMIN pueden cambiar el status directamente
  if (status && req.userRole !== 'SUPERVISOR') {
    const VALID_STATUS = ['Borrador', 'Publicado']
    if (!VALID_STATUS.includes(status)) { res.status(400).json({ message: 'Estado inválido' }); return }
    data.status = status
  }

  const updated = await prisma.knowledgeArticle.update({
    where: { id },
    data,
    include: articleInclude,
  })
  res.json(updated)
}

export const publishArticle = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const existing = await prisma.knowledgeArticle.findFirst({ where: { id, ...tf(req) } })
  if (!existing) { res.status(404).json({ message: 'Artículo no encontrado' }); return }
  if (existing.status === 'Publicado') {
    res.status(400).json({ message: 'El artículo ya está publicado' }); return
  }

  const article = await prisma.knowledgeArticle.update({
    where: { id },
    data: { status: 'Publicado', publishedById: req.userId ?? null, publishedAt: new Date() },
    include: articleInclude,
  })
  res.json(article)
}

export const deleteArticle = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const existing = await prisma.knowledgeArticle.findFirst({ where: { id, ...tf(req) } })
  if (!existing) { res.status(404).json({ message: 'Artículo no encontrado' }); return }
  await prisma.knowledgeArticle.delete({ where: { id } })
  res.json({ message: 'Artículo eliminado' })
}
