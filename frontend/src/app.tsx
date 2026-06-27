import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import PainelPage        from '@/pages/painel'
import ExtratoPage       from '@/pages/extrato'
import RendaPage         from '@/pages/renda'
import GastosPage        from '@/pages/gastos'
import DividasPage       from '@/pages/dividas'
import DiagnosticoPage   from '@/pages/diagnostico'
import MetasPage         from '@/pages/metas'
import ConfiguracoesPage from '@/pages/configuracoes'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/painel" replace />} />
        <Route path="/painel"        element={<PainelPage />} />
        <Route path="/extrato"       element={<ExtratoPage />} />
        <Route path="/renda"         element={<RendaPage />} />
        <Route path="/gastos"        element={<GastosPage />} />
        <Route path="/dividas"       element={<DividasPage />} />
        <Route path="/diagnostico"   element={<DiagnosticoPage />} />
        <Route path="/metas"         element={<MetasPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*"              element={<Navigate to="/painel" replace />} />
      </Route>
    </Routes>
  )
}
