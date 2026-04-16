function App() {
  return (
    <div className="min-h-screen bg-[#2a2b2f] text-zinc-100">
      <div className="grid min-h-screen grid-rows-[3.5rem_1fr_1.75rem]">
        <header className="border-b border-black/30 bg-[#323338]">
          <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-14 rounded-md bg-white/[0.06]" />
              <div className="h-7 w-[4.5rem] rounded-md bg-white/[0.05]" />
            </div>
            <div className="hidden h-4 w-40 rounded-full bg-white/[0.05] sm:block" />
            <div className="h-7 w-24 rounded-full bg-white/[0.05]" />
          </div>
        </header>

        <main className="min-h-0 overflow-hidden">
          <section className="flex h-full min-h-0 items-center justify-center px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[20px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_38%),linear-gradient(180deg,_rgba(55,56,62,0.9),_rgba(27,28,32,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="aspect-[3/4] w-[min(72vw,420px)] rounded-[2px] border border-black/20 bg-[linear-gradient(180deg,_#7a7b81,_#5e6067)] shadow-[0_34px_90px_rgba(0,0,0,0.48)] sm:w-[min(54vw,500px)] lg:w-[min(34vw,640px)]" />
            </div>
          </section>
        </main>

        <footer className="border-t border-black/30 bg-[#303136]">
          <div className="flex h-7 items-center justify-between gap-3 px-3 sm:px-4">
            <div className="h-3 w-24 rounded-full bg-white/[0.04]" />
            <div className="h-3 w-16 rounded-full bg-white/[0.04]" />
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
