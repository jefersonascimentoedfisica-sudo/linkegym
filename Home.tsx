import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { injectHomepageSchemas } from "@/lib/seo-schema";
import {
  Search, ArrowRight, CheckCircle, Star, MapPin, Dumbbell,
  Shield, Zap, Users, ChevronRight, Menu, X
} from "lucide-react";

// ─── Auth Gate Modal ───────────────────────────────────────────────
function AuthGateModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [userType, setUserType] = useState<"aluno" | "trainer">("aluno");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      style={{ animation: "fadeIn 0.3s ease" }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        style={{ animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Hero top */}
        <div
          className="relative h-40"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
          <div className="absolute bottom-5 left-5 z-10">
            <div
              className="text-2xl font-black tracking-tight"
              style={{ background: "linear-gradient(90deg,#1a8fff,#ff6a00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              LinkeGym
            </div>
            <div className="text-xs text-white/70 mt-0.5 italic">Conectando você à saúde</div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {tab === "login" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors mt-1"
              >
                Entrar na plataforma →
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 border-[1.5px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>
              <p className="text-center text-xs text-gray-400 mt-1">
                Não tem conta?{" "}
                <button onClick={() => setTab("register")} className="text-red-600 font-semibold hover:underline">
                  Cadastre-se grátis
                </button>
              </p>
            </div>
          )}

          {/* Register Form */}
          {tab === "register" && (
            <div className="flex flex-col gap-4">
              {/* User type selector */}
              <div className="grid grid-cols-2 gap-2">
                {(["aluno", "trainer"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`p-3 border-[1.5px] rounded-xl text-sm font-semibold transition-all text-center ${
                      userType === type
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-2xl mb-1">{type === "aluno" ? "🏃" : "💪"}</span>
                    {type === "aluno" ? "Sou Aluno" : "Sou Personal"}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors mt-1"
              >
                Criar conta grátis →
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 border-[1.5px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Cadastrar com Google
              </button>
              <p className="text-center text-xs text-gray-400">
                Já tem conta?{" "}
                <button onClick={() => setTab("login")} className="text-red-600 font-semibold hover:underline">
                  Faça login
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

// ─── Trainer Card Mini ─────────────────────────────────────────────
const MOCK_TRAINERS = [
  { initials: "RC", name: "Rafael Costa", spec: "Musculação · Funcional · HIIT", rating: "5.0", sessions: 142, price: 80, color: "from-red-600 to-orange-500" },
  { initials: "AS", name: "Ana Silva", spec: "Pilates · Yoga · Mobilidade", rating: "4.9", sessions: 98, price: 90, color: "from-violet-600 to-indigo-500" },
  { initials: "MO", name: "Marcos Oliveira", spec: "CrossFit · Emagrecimento", rating: "4.7", sessions: 67, price: 75, color: "from-emerald-600 to-teal-500" },
];

const TESTIMONIALS = [
  { name: "Camila Mendes", city: "São Paulo, SP", role: "Aluna", color: "from-red-600 to-orange-500", initials: "CM", text: "Encontrei meu personal em menos de 10 minutos. A aula foi incrível e o pagamento foi super seguro. Já marquei mais 3 aulas com ele!" },
  { name: "Lucas Ferreira", city: "Belo Horizonte, MG", role: "Aluno", color: "from-violet-600 to-indigo-500", initials: "LF", text: "Viajei para o Rio e precisava treinar. Abri o app, encontrei um personal excelente no bairro do hotel e treinei na academia local. Perfeito!" },
  { name: "Pedro Teixeira", city: "Curitiba, PR", role: "Personal Trainer", color: "from-emerald-600 to-teal-500", initials: "PT", text: "Como personal trainer, triplicou minha base de clientes em 2 meses. A plataforma cuida do pagamento e eu foco no que sei fazer: treinar." },
];

// ─── Main Component ────────────────────────────────────────────────
export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663402727665/W9B2DZe626mJSzUHcntkhr/linkegym-icon-correct-7iSBeGTmGXpGGLSH7wpVF5.webp";

  useEffect(() => {
    injectHomepageSchemas();
    document.title = "LinkeGym — Encontre o Personal Trainer Perfeito Perto de Você";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Marketplace de personal trainers profissionais verificados. Aulas avulsas sob demanda ou acompanhamento contínuo. Pagamento seguro, agendamento flexível.");

    // Show auth gate if user is not logged in
    if (!user) {
      const timer = setTimeout(() => setShowAuth(true), 400);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const openAuth = () => setShowAuth(true);
  const handleProtectedAction = (path: string) => {
    if (user) navigate(path);
    else setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Auth Gate */}
      {showAuth && <AuthGateModal onClose={() => setShowAuth(false)} />}

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-b border-gray-100 h-[68px] flex items-center px-[5vw]">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src={logoUrl} alt="LinkeGym" className="w-10 h-10 object-contain" />
            <div>
              <div
                className="text-xl font-black leading-tight tracking-tight"
                style={{ background: "linear-gradient(90deg,#1a8fff,#ff6a00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
              >
                LinkeGym
              </div>
              <div className="text-[10px] text-gray-400 font-medium leading-none italic">Conectando você à saúde</div>
            </div>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Como funciona</a>
            <a href="#depoimentos" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Depoimentos</a>
            <a href="#trainers" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Para Trainers</a>
            {user ? (
              <button
                onClick={() => navigate("/trainers")}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                {user.name}
              </button>
            ) : (
              <button
                onClick={openAuth}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                Entrar / Cadastrar
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-gray-700" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 md:hidden shadow-lg">
            <div className="px-5 py-3 flex flex-col gap-1">
              {["Buscar Trainers", "Aulas Avulsas", "Planos"].map((label, i) => (
                <button
                  key={label}
                  onClick={() => { setMobileMenuOpen(false); handleProtectedAction(["/trainers", "/drop-in-classes", "/plans"][i]); }}
                  className="text-left px-4 py-2.5 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); openAuth(); }}
                className="mt-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold text-center transition-colors"
              >
                Entrar / Cadastrar
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        className="min-h-screen flex items-center relative overflow-hidden pt-[68px]"
      >
        {/* Academy background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Light overlay — clean gradient so text is on white side */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(105deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.95) 38%, rgba(255,255,255,0.55) 65%, rgba(255,255,255,0.05) 100%)",
          }}
        />

        <div className="relative z-10 px-[5vw] max-w-7xl mx-auto w-full py-20">
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
              Disponível em todo o Brasil
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-[1.08] tracking-tight mb-5">
              Encontre o Personal<br />
              Trainer <span className="text-red-600">Perfeito</span><br />
              Perto de Você
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg font-normal">
              Conecte-se com personal trainers verificados para aulas avulsas sob demanda ou acompanhamento contínuo. Simples, seguro e flexível.
            </p>

            <div className="flex flex-col gap-3 mb-10 w-full max-w-[420px]">
              {/* Botão 1 — Encontrar Personal (contínuo) */}
              <button
                onClick={openAuth}
                className="w-full inline-flex items-center justify-between px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-red-200"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-bold text-base">Encontrar Personal Trainer</span>
                  <span className="text-xs font-normal opacity-85">Acompanhamento contínuo</span>
                </div>
                <ArrowRight size={18} />
              </button>

              {/* Botão 2 — Treino Avulso (sob demanda) */}
              <button
                onClick={openAuth}
                className="w-full inline-flex items-center justify-between px-6 py-4 bg-white hover:border-red-400 text-gray-900 rounded-xl border-[1.5px] border-gray-200 transition-all hover:shadow-md hover:shadow-red-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                    <Zap size={18} className="text-orange-500" />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-bold text-base">Treino Avulso</span>
                    <span className="text-xs text-gray-400 font-normal">Uma aula, sem compromisso</span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
              </button>

              {/* Botão 3 — Sou Personal */}
              <button
                onClick={openAuth}
                className="w-full py-3.5 bg-transparent hover:bg-gray-50 text-gray-600 rounded-xl border-[1.5px] border-gray-200 hover:border-gray-300 font-semibold text-sm transition-all text-center"
              >
                Sou Personal Trainer — Quero me cadastrar
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 flex-wrap">
              {["Trainers verificados", "Pagamento seguro", "Sem mensalidade"].map((item, i) => (
                <div key={item} className="flex items-center gap-1.5">
                  {i > 0 && <div className="w-px h-4 bg-gray-200 mr-2" />}
                  <CheckCircle size={14} className="text-red-600" />
                  <span className="text-sm text-gray-500 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="bg-gray-900 grid grid-cols-2 md:grid-cols-4">
        {[
          { value: "2K+", label: "Trainers Verificados" },
          { value: "50+", label: "Cidades Cobertas" },
          { value: "15K+", label: "Aulas Realizadas" },
          { value: "98%", label: "Taxa de Satisfação" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-6 py-8 text-center ${i < 3 ? "border-r border-white/[0.07]" : ""}`}
          >
            <div className="text-3xl font-black text-white tracking-tight">
              {s.value.replace(/(\d+)/, (m) => `${m}`).split("").map((c, j) =>
                /[K%+]/.test(c)
                  ? <span key={j} className="text-red-500">{c}</span>
                  : c
              )}
            </div>
            <div className="text-xs text-white/40 font-semibold uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="bg-gray-50 px-[5vw] py-24">
        <div className="max-w-7xl mx-auto">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600 mb-3">
            <span className="w-5 h-0.5 bg-red-600 inline-block" />
            Como Funciona
          </p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
            Em 5 passos você<br />já está <span className="text-red-600">treinando</span>
          </h2>
          <p className="text-gray-500 max-w-lg mb-14">Sem burocracia. Do pedido à aula concluída em menos de uma hora.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            {/* Steps */}
            <div>
              {[
                { n: "01", title: "Crie sua conta em segundos", desc: "Cadastre-se como aluno ou personal trainer. Login rápido com Google disponível." },
                { n: "02", title: "Informe sua localização", desc: "Digite seu CEP ou endereço. Escolha academia, condomínio ou residência." },
                { n: "03", title: "Escolha seu trainer ideal", desc: "Veja perfis completos, avaliações reais, especialidades e disponibilidade de horários." },
                { n: "04", title: "Solicite e aguarde confirmação", desc: "O trainer tem 30 minutos para aceitar. Você é notificado por app e WhatsApp." },
                { n: "05", title: "Pague com segurança e treine", desc: "Pagamento via Pix ou cartão. Valor retido até a aula ser concluída. Você fica protegido." },
              ].map((step) => (
                <div
                  key={step.n}
                  className="flex gap-5 py-6 border-b border-gray-200 last:border-0 group"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-gray-200 group-hover:border-red-500 group-hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-all duration-200">
                    <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">{step.n}</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{step.title}</div>
                    <div className="text-sm text-gray-500 leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trainer list mockup */}
            <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-xl shadow-gray-100 border border-gray-100">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Trainers próximos a você</div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
                <Search size={14} className="text-gray-400" />
                <span className="text-sm text-gray-400">São Paulo, SP — Hoje 18h</span>
              </div>
              <div className="flex flex-col gap-3">
                {MOCK_TRAINERS.map((t) => (
                  <div
                    key={t.initials}
                    className="flex items-center gap-4 p-4 border border-gray-100 hover:border-red-200 hover:shadow-sm rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                      {t.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{t.spec}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-500">{t.rating} · {t.sessions} aulas</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-red-600 text-base">R${t.price}</div>
                      <div className="text-[10px] text-gray-400">por aula</div>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] text-emerald-600 font-semibold">Disponível</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={openAuth}
                className="w-full mt-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Ver todos os trainers →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section id="depoimentos" className="px-[5vw] py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600 mb-3">
            <span className="w-5 h-0.5 bg-red-600 inline-block" />
            Depoimentos
          </p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
            O que nossos <span className="text-red-600">alunos</span> dizem
          </h2>
          <p className="text-gray-500 max-w-lg mb-12">Histórias reais de pessoas que transformaram sua rotina de treinos com a LinkeGym.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.initials} className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <div className="flex gap-0.5 text-amber-400 mb-5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role} · {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA TRAINER ── */}
      <section id="trainers" className="px-[5vw] py-12">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/85 to-gray-900/60" />

          <div className="relative z-10 p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Para Personal Trainers</p>
              <h2 className="text-4xl font-black text-white tracking-tight mb-4">
                Expanda sua <span className="text-red-400">carteira</span><br />de clientes hoje
              </h2>
              <p className="text-white/60 max-w-md leading-relaxed mb-6">
                Cadastre seu perfil, defina seus horários e comece a receber solicitações de alunos na sua região. Você recebe 80% de cada aula realizada.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Perfil gratuito — sem custo para começar",
                  "Notificações via app e WhatsApp",
                  "Pagamento garantido e pontual",
                  "Mais visibilidade com planos a partir de R$59,90/mês",
                ].map((perk) => (
                  <div key={perk} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={11} className="text-red-400" />
                    </div>
                    <span className="text-sm text-white/70">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 min-w-[220px]">
              <button
                onClick={openAuth}
                className="py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-sm transition-colors text-center"
              >
                Cadastrar como Personal →
              </button>
              <button
                onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                className="py-4 bg-transparent hover:bg-white/10 text-white border border-white/25 hover:border-white/50 rounded-xl font-semibold text-sm transition-all text-center"
              >
                Ver como funciona
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 px-[5vw] pt-16 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/[0.06] mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src={logoUrl} alt="LinkeGym" className="w-8 h-8 object-contain" />
                <div className="text-xl font-black tracking-tight" style={{ background: "linear-gradient(90deg,#1a8fff,#ff6a00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>LinkeGym</div>
              </div>
              <p className="text-sm text-white/35 leading-relaxed max-w-xs">
                O principal marketplace brasileiro de personal trainers presenciais.
              </p>
            </div>
            {[
              { title: "Plataforma", links: ["Buscar Trainers", "Aulas Avulsas", "Como Funciona", "Preços"] },
              { title: "Para Trainers", links: ["Cadastrar", "Planos", "Dashboard", "Certificação"] },
              { title: "Empresa", links: ["Sobre nós", "Termos de Uso", "Privacidade", "Contato"] },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-4">{col.title}</div>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-white/45 hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-white/25">© 2025 LinkeGym. Todos os direitos reservados.</div>
            <div className="text-xs text-white/25">Desenvolvido com ❤️ para a saúde dos brasileiros</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
