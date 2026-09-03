export default function Placeholder({ titulo }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-10 shadow-sm text-center">
      <span className="text-4xl" aria-hidden>
        🏗️
      </span>
      <h1 className="mt-3 text-xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Este módulo está en construcción.
      </p>
    </section>
  );
}
