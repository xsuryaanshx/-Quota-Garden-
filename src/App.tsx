import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Clock3, Leaf, Mail, Plus, RefreshCcw, Sparkles, Zap, Trash2 } from "lucide-react";

type Quota = { percentage: number; exhaustedAt?: string; resetAt?: string };
type Account = { id: string; name: string; email: string; gemini: Quota; shared: Quota };

const STORAGE_KEY = "quota-garden-accounts";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatCountdown(resetAt?: string) {
  if (!resetAt) return null;
  const difference = new Date(resetAt).getTime() - Date.now();
  if (difference <= 0) return "Ready to refresh";
  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)}m`;
}

function getQuotaStatus(quota: Quota) {
  if (quota.resetAt && new Date(quota.resetAt).getTime() > Date.now()) return "refilling";
  if (quota.percentage <= 0) return "exhausted";
  if (quota.percentage <= 25) return "low";
  return "ready";
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 3)}•••@${domain}`;
}

function QuotaRing({ percentage, size = 64 }: { percentage: number; size?: number }) {
  const radius = 32, circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="#2a322e" strokeWidth="7" />
        <circle cx="38" cy="38" r={radius} fill="none" stroke="#9BE15D" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <span className="absolute text-sm font-bold">{percentage}%</span>
    </div>
  );
}

function QuotaBox({ label, icon, quota, onExhaust, onRestore }: {
  label: string; icon: React.ReactNode; quota: Quota; onExhaust: () => void; onRestore: () => void;
}) {
  const status = getQuotaStatus(quota);
  const countdown = formatCountdown(quota.resetAt);
  return (
    <div className="rounded-3xl border border-[#2a322e] bg-[#101412] p-4 transition hover:-translate-y-0.5 hover:border-[#43503f]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#1d241f] text-[#9BE15D]">{icon}</span>
          {label}
        </div>
        <QuotaRing percentage={quota.percentage} />
      </div>
      {status === "refilling" ? (
        <div className="rounded-2xl bg-[#182019] px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-[#b7e98e]"><Leaf size={15} /><span>Growing back</span></div>
          <p className="mt-1 text-xs text-zinc-400">{countdown ? `Resets in ${countdown}` : "Tracking reset"}</p>
        </div>
      ) : status === "ready" ? (
        <div className="rounded-2xl bg-[#172016] px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-[#b7e98e]"><Check size={15} /><span>Ready to create</span></div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#211b14] px-3 py-2 text-sm text-[#f3c98b]">🪫 Running low</div>
      )}
      <div className="mt-3">
        {status === "refilling" || status === "exhausted" ? (
          <button onClick={onRestore} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#344036] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-[#1e251f]">
            <RefreshCcw size={14} /> Restore
          </button>
        ) : (
          <button onClick={onExhaust} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#344036] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#211b14] hover:text-[#f3c98b]">
            <Clock3 size={14} /> Mark exhausted
          </button>
        )}
      </div>
    </div>
  );
}

function AccountCard({ account, updateQuota, onDelete }: {
  account: Account;
  updateQuota: (type: "gemini" | "shared", quota: Quota) => void;
  onDelete: () => void;
}) {
  const bestPercentage = Math.max(account.gemini.percentage, account.shared.percentage);
  const exhaust = (type: "gemini" | "shared") =>
    updateQuota(type, { percentage: 0, exhaustedAt: new Date().toISOString(), resetAt: new Date(Date.now() + WEEK_MS).toISOString() });
  const restore = (type: "gemini" | "shared") =>
    updateQuota(type, { percentage: 100, exhaustedAt: undefined, resetAt: undefined });

  return (
    <article className="rounded-[28px] border border-[#2a322e] bg-[#141817]/90 p-5 shadow-2xl shadow-black/10 transition hover:border-[#3d493f]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#b8f585] to-[#609d2f] font-bold text-[#10200c]">
            {account.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{account.name}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500 truncate"><Mail size={12} />{maskEmail(account.email)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bestPercentage > 25 ? "bg-[#1c291b] text-[#b7e98e]" : "bg-[#2a2117] text-[#f3c98b]"}`}>
            {bestPercentage > 25 ? "● READY" : "● LOW"}
          </span>
          <button onClick={onDelete} title="Delete account" className="rounded-xl p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <QuotaBox label="Gemini" icon={<Sparkles size={16} />} quota={account.gemini} onExhaust={() => exhaust("gemini")} onRestore={() => restore("gemini")} />
        <QuotaBox label="Claude + GPT" icon={<Bot size={16} />} quota={account.shared} onExhaust={() => exhaust("shared")} onRestore={() => restore("shared")} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#252d28] pt-4 text-xs text-zinc-500">
        <span>AI power status</span><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#9BE15D]" />Saved locally</span>
      </div>
    </article>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [, setNow] = useState(Date.now());
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(i); }, []);

  const updateAccountQuota = (accountId: string, type: "gemini" | "shared", quota: Quota) =>
    setAccounts(current => current.map(a => a.id === accountId ? { ...a, [type]: quota } : a));

  const stats = useMemo(() => {
    const quotas = accounts.flatMap(a => [a.gemini, a.shared]);
    return {
      ready: quotas.filter(q => getQuotaStatus(q) === "ready").length,
      low: quotas.filter(q => getQuotaStatus(q) === "low").length,
      refilling: quotas.filter(q => getQuotaStatus(q) === "refilling").length,
    };
  }, [accounts]);

  const bestAccount = useMemo(() => [...accounts].sort((a,b) =>
    Math.max(b.gemini.percentage,b.shared.percentage) - Math.max(a.gemini.percentage,a.shared.percentage))[0], [accounts]);

  const addAccount = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setAccounts(current => [...current, {
      id: crypto.randomUUID(), name: newName.trim(), email: newEmail.trim(),
      gemini: { percentage: 100 }, shared: { percentage: 100 }
    }]);
    setNewName(""); setNewEmail(""); setShowAdd(false);
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-[#202722] pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#9BE15D] text-[#14200f] shadow-lg shadow-[#9BE15D]/10"><Leaf size={25} /></div>
            <div><h1 className="text-2xl font-bold tracking-tight">Quota Garden</h1><p className="text-sm text-zinc-500">Your little home for AI power.</p></div>
          </div>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#9BE15D] px-4 py-3 text-sm font-bold text-[#14200f] transition hover:scale-[1.02] hover:bg-[#b0ee77]"><Plus size={18} />Add account</button>
        </header>

        <section className="mb-8">
          <p className="mb-2 text-sm font-medium text-[#9BE15D]">✦ YOUR AI GARDEN</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Good to see you 🌱</h2>
          <p className="mt-2 text-zinc-400">{stats.ready} quota pools are ready for your next big idea.</p>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { label: "Ready to create", value: stats.ready, icon: <Check />, description: "quota pools available" },
            { label: "Running low", value: stats.low, icon: <Zap />, description: "worth saving for later" },
            { label: "Growing back", value: stats.refilling, icon: <Clock3 />, description: "currently refilling" },
          ].map(stat => <div key={stat.label} className="rounded-[24px] border border-[#2a322e] bg-[#141817]/80 p-5">
            <div className="mb-5 flex items-center justify-between text-zinc-500"><span className="text-sm">{stat.label}</span><span className="text-[#9BE15D]">{stat.icon}</span></div>
            <p className="text-3xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-zinc-500">{stat.description}</p>
          </div>)}
        </section>

        {bestAccount && <section className="mb-10 rounded-[30px] border border-[#33442f] bg-gradient-to-br from-[#1c2919] to-[#101512] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div><p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#b7e98e]"><Sparkles size={16} />BEST ACCOUNT RIGHT NOW</p>
              <h2 className="text-2xl font-bold">{bestAccount.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">Gemini {bestAccount.gemini.percentage}% · Claude + GPT {bestAccount.shared.percentage}%</p></div>
            <div className="rounded-2xl bg-[#0d120e]/60 px-5 py-4 text-sm text-zinc-300">✨ Pick this one for your next session</div>
          </div>
        </section>}

        <section>
          <div className="mb-5"><p className="text-sm font-semibold text-[#9BE15D]">YOUR ACCOUNTS</p><h2 className="mt-1 text-xl font-bold">Your AI crew ({accounts.length})</h2></div>
          {accounts.length === 0 ? <div className="rounded-[28px] border border-dashed border-[#344036] p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#172016] text-[#9BE15D]"><Leaf /></div>
            <h3 className="font-semibold">Your garden is waiting 🌱</h3><p className="mt-2 text-sm text-zinc-500">Add your first AI account to start tracking quotas.</p>
          </div> : <div className="grid gap-5 lg:grid-cols-2">
            {accounts.map(account => <AccountCard key={account.id} account={account}
              updateQuota={(type, quota) => updateAccountQuota(account.id, type, quota)}
              onDelete={() => { if (confirm(`Delete ${account.name}?`)) setAccounts(current => current.filter(a => a.id !== account.id)); }}
            />)}
          </div>}
        </section>
      </div>

      {showAdd && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[28px] border border-[#303a33] bg-[#141817] p-6 shadow-2xl">
          <div className="mb-6"><p className="text-sm font-semibold text-[#9BE15D]">NEW LITTLE PLANT 🌱</p><h2 className="mt-1 text-2xl font-bold">Add an AI account</h2><p className="mt-2 text-sm text-zinc-500">Your email stays in your browser in this version.</p></div>
          <div className="space-y-4">
            <label className="block"><span className="mb-2 block text-sm text-zinc-400">Account nickname</span><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Main Account" className="w-full rounded-xl border border-[#303932] bg-[#0d100f] px-4 py-3 outline-none placeholder:text-zinc-700 focus:border-[#9BE15D]" /></label>
            <label className="block"><span className="mb-2 block text-sm text-zinc-400">Gmail address</span><input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="you@gmail.com" type="email" className="w-full rounded-xl border border-[#303932] bg-[#0d100f] px-4 py-3 outline-none placeholder:text-zinc-700 focus:border-[#9BE15D]" /></label>
          </div>
          <div className="mt-6 flex gap-3"><button onClick={() => setShowAdd(false)} className="flex-1 rounded-xl border border-[#303932] px-4 py-3 text-sm font-semibold text-zinc-400 hover:bg-[#1b201d]">Cancel</button>
            <button onClick={addAccount} className="flex-1 rounded-xl bg-[#9BE15D] px-4 py-3 text-sm font-bold text-[#14200f] hover:bg-[#b0ee77]">Plant account 🌱</button></div>
        </div>
      </div>}
    </main>
  );
}