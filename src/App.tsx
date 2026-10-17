import { Routes, Route, NavLink } from 'react-router-dom'

const Tela = ({ nome }: { nome: string }) => (
  <div className="p-6 text-xl font-semibold">{nome}</div>
)

export default function App() {
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg ${isActive ? 'bg-neutral-800' : 'text-neutral-400'}`

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 border-b border-neutral-800 p-2">
        <NavLink to="/" end className={link}>Mensagens</NavLink>
        <NavLink to="/biblia" className={link}>Bíblia</NavLink>
        <NavLink to="/agenda" className={link}>Agenda</NavLink>
      </nav>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Tela nome="Minhas mensagens" />} />
          <Route path="/mensagem/:id" element={<Tela nome="Editor de mensagem" />} />
          <Route path="/pregar/:id" element={<Tela nome="Modo pregação" />} />
          <Route path="/projetar" element={<Tela nome="Tela do telão" />} />
          <Route path="/biblia" element={<Tela nome="Bíblia" />} />
          <Route path="/agenda" element={<Tela nome="Agenda" />} />
          <Route path="/login" element={<Tela nome="Entrar" />} />
        </Routes>
      </main>
    </div>
  )
}