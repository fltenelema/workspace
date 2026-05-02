import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import client from '../../api/client'
import { PeriodReport, CropPerformance, WorkerPerformance, CycleReport } from '../../types'

type Tab = 'periodo' | 'cultivos' | 'trabajadores' | 'ciclo'

const exportCSV = (rows: Record<string, unknown>[], filename: string) => {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const [searchParams] = useSearchParams()
  const cicloParam = searchParams.get('ciclo')
  const [tab, setTab] = useState<Tab>(cicloParam ? 'ciclo' : 'periodo')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
        <p className="text-gray-500 text-sm mt-1">Informes financieros y métricas de rendimiento</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { id: 'periodo', label: '📅 Por Período' },
          { id: 'cultivos', label: '🌱 Por Cultivo' },
          { id: 'trabajadores', label: '👷 Por Trabajador' },
          ...(cicloParam ? [{ id: 'ciclo', label: '📋 Ciclo específico' }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'periodo' && <PeriodoReport />}
      {tab === 'cultivos' && <CultivosReport />}
      {tab === 'trabajadores' && <TrabajadoresReport />}
      {tab === 'ciclo' && cicloParam && <CicloReport cycleId={parseInt(cicloParam)} />}
    </div>
  )
}

function PeriodoReport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<PeriodReport | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get<PeriodReport>('/reports/period', { params: { startDate, endDate } })
      setData(res.data)
    } finally { setLoading(false) }
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const STATUS_COLOR: Record<string, string> = {
    'En Curso': 'bg-green-100 text-green-700',
    'Cosechando': 'bg-amber-100 text-amber-700',
    'Cerrado': 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={load} className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando reporte...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total ciclos', value: data.totals.cyclesCount, sub: `${data.totals.closedCount} cerrados`, color: 'text-blue-700' },
              { label: 'Ingresos totales', value: `$${data.totals.revenue.toFixed(2)}`, color: 'text-green-700' },
              { label: 'Costos totales', value: `$${data.totals.totalCost.toFixed(2)}`, color: 'text-red-600' },
              { label: 'Ganancia neta', value: `$${data.totals.profit.toFixed(2)}`, color: data.totals.profit >= 0 ? 'text-green-700' : 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Ciclos en el período</h3>
              {data.cycles.length > 0 && (
                <button onClick={() => exportCSV(data.cycles.map(c => ({ Ciclo: c.code ?? '', Bloque: c.blockCode, Cultivo: c.cropName, Estado: c.status, Ingresos: c.revenue, Costos: c.totalCost, Ganancia: c.profit, 'Area m2': c.area })), 'reporte-periodo.csv')}
                  className="text-xs text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  Exportar CSV
                </button>
              )}
            </div>
            {data.cycles.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No hay ciclos en este período</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-5 py-3 text-left">Ciclo</th>
                      <th className="px-5 py-3 text-left">Bloque / Cultivo</th>
                      <th className="px-5 py-3 text-left">Estado</th>
                      <th className="px-5 py-3 text-right">Ingresos</th>
                      <th className="px-5 py-3 text-right">Costos</th>
                      <th className="px-5 py-3 text-right">Ganancia</th>
                      <th className="px-5 py-3 text-right">$/m²</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.cycles.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono font-medium">{c.code ?? '—'}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{c.blockCode}</p>
                          <p className="text-xs text-gray-400">{c.cropName}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-green-700 font-medium">${c.revenue.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right text-red-600">${c.totalCost.toFixed(2)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${c.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          ${c.profit.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          ${c.area > 0 ? (c.profit / c.area).toFixed(2) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={`/ciclos/${c.id}`} className="text-blue-600 hover:text-blue-800">Ver</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function CultivosReport() {
  const [data, setData] = useState<CropPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<keyof CropPerformance>('totalProfit')

  useEffect(() => {
    client.get<CropPerformance[]>('/reports/crops').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const sorted = [...data].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))

  if (loading) return <div className="py-20 text-center text-gray-400">Cargando...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Ordenar por:</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as keyof CropPerformance)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="totalProfit">Ganancia total</option>
          <option value="totalRevenue">Ingresos</option>
          <option value="avgProfitPerM2">Rentabilidad/m²</option>
          <option value="avgRevenuePerKg">Precio/kg</option>
          <option value="totalCycles">Ciclos</option>
        </select>
        {sorted.length > 0 && (
          <button onClick={() => exportCSV(sorted.map(c => ({ Cultivo: c.name, Ciclos: c.totalCycles, 'Ciclos activos': c.activeCycles, 'Kg totales': c.totalKg, Ingresos: c.totalRevenue, Costos: c.totalCost, Ganancia: c.totalProfit, '$/m2': c.avgProfitPerM2, '$/kg': c.avgRevenuePerKg })), 'reporte-cultivos.csv')}
            className="ml-auto text-xs text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
            Exportar CSV
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                <th className="px-5 py-3 text-left">Cultivo</th>
                <th className="px-5 py-3 text-right">Ciclos</th>
                <th className="px-5 py-3 text-right">Kg totales</th>
                <th className="px-5 py-3 text-right">Ingresos</th>
                <th className="px-5 py-3 text-right">Costos</th>
                <th className="px-5 py-3 text-right">Ganancia</th>
                <th className="px-5 py-3 text-right">$/m²</th>
                <th className="px-5 py-3 text-right">$/kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.harvestDays} días de cultivo</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-medium">{c.totalCycles}</span>
                    <span className="text-xs text-gray-400 ml-1">({c.activeCycles} activos)</span>
                  </td>
                  <td className="px-5 py-3 text-right">{c.totalKg.toFixed(0)} {c.unit}</td>
                  <td className="px-5 py-3 text-right text-green-700 font-medium">${c.totalRevenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-red-600">${c.totalCost.toFixed(2)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${c.totalProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    ${c.totalProfit.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">${c.avgProfitPerM2.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-gray-600">${c.avgRevenuePerKg.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && <div className="py-12 text-center text-gray-400">Sin datos de rendimiento</div>}
      </div>
    </div>
  )
}

function TrabajadoresReport() {
  const [data, setData] = useState<WorkerPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get<WorkerPerformance[]>('/reports/workers').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const sorted = [...data].sort((a, b) => b.totalEarned - a.totalEarned)

  if (loading) return <div className="py-20 text-center text-gray-400">Cargando...</div>

  return (
    <div className="space-y-3">
      {sorted.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => exportCSV(sorted.map(w => ({ Trabajador: w.name, 'Tarifa/dia': w.dailySalary, 'Total dias': w.totalDays, Ciclos: w.cyclesCount, 'Total ganado': w.totalEarned, 'Ultima actividad': w.lastActivity ?? '', Estado: w.active ? 'Activo' : 'Inactivo' })), 'reporte-trabajadores.csv')}
            className="text-xs text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
            Exportar CSV
          </button>
        </div>
      )}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
              <th className="px-5 py-3 text-left">Trabajador</th>
              <th className="px-5 py-3 text-right">Tarifa/día</th>
              <th className="px-5 py-3 text-right">Total días</th>
              <th className="px-5 py-3 text-right">Ciclos</th>
              <th className="px-5 py-3 text-right">Total ganado</th>
              <th className="px-5 py-3 text-left">Última actividad</th>
              <th className="px-5 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(w => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-semibold">{w.name}</td>
                <td className="px-5 py-3 text-right text-gray-600">${w.dailySalary}/día</td>
                <td className="px-5 py-3 text-right font-medium">{w.totalDays.toFixed(1)}</td>
                <td className="px-5 py-3 text-right">{w.cyclesCount}</td>
                <td className="px-5 py-3 text-right font-semibold text-green-700">${w.totalEarned.toFixed(2)}</td>
                <td className="px-5 py-3 text-gray-500">
                  {w.lastActivity ? new Date(w.lastActivity).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {w.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <div className="py-12 text-center text-gray-400">Sin datos de trabajadores</div>}
      </div>
    </div>
    </div>
  )
}

function CicloReport({ cycleId }: { cycleId: number }) {
  const [data, setData] = useState<CycleReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get<CycleReport>(`/reports/cycle/${cycleId}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [cycleId])

  if (loading) return <div className="py-20 text-center text-gray-400">Cargando reporte...</div>
  if (!data) return <div className="py-20 text-center text-red-500">Error al cargar el reporte</div>

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold font-mono">{data.cycle.code}</h3>
            <p className="text-sm text-gray-500">{data.block.code} — {data.block.name} · {data.crop.name}{data.variety ? ` · ${data.variety}` : ''}</p>
          </div>
          <Link to={`/ciclos/${cycleId}`} className="text-sm text-blue-600 hover:underline">← Volver al ciclo</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos', value: `$${data.financials.revenue.toFixed(2)}`, color: 'text-green-700' },
            { label: 'Costos', value: `$${data.financials.totalCost.toFixed(2)}`, color: 'text-red-600' },
            { label: 'Ganancia neta', value: `$${data.financials.profit.toFixed(2)}`, color: data.financials.profit >= 0 ? 'text-green-700' : 'text-red-600' },
            { label: 'Rentabilidad/m²', value: `$${data.financials.profitPerM2.toFixed(2)}`, color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold mb-3">Gastos por categoría</h4>
          <div className="space-y-2">
            {Object.entries(data.expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-gray-600">{cat}</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Mano de obra</span>
              <span className="font-medium">${data.financials.laborTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300">
              <span>Total costos</span>
              <span className="text-red-600">${data.financials.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold mb-3">Resumen de ventas</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total kg cosechados</span><span className="font-medium">{data.financials.totalKg.toFixed(2)} {data.crop.unit}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Precio promedio</span><span className="font-medium">${data.financials.revenuePerKg.toFixed(3)}/{data.crop.unit}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Número de ventas</span><span className="font-medium">{data.sales.length}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total ingresos</span><span className="text-green-700">${data.financials.revenue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {data.sales.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50"><h4 className="font-semibold text-sm">Detalle de ventas</h4></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs font-semibold text-gray-500 uppercase bg-gray-50">
              <th className="px-5 py-2 text-left">Fecha</th><th className="px-5 py-2 text-left">Cliente</th>
              <th className="px-5 py-2 text-right">Kg</th><th className="px-5 py-2 text-right">USD</th><th className="px-5 py-2 text-right">USD/kg</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2">{new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                  <td className="px-5 py-2 font-medium">{s.client}</td>
                  <td className="px-5 py-2 text-right">{s.totalKg.toFixed(2)}</td>
                  <td className="px-5 py-2 text-right text-green-700 font-medium">${s.totalUsd.toFixed(2)}</td>
                  <td className="px-5 py-2 text-right text-gray-500">${s.pricePerKg.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
