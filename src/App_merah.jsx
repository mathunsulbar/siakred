import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import GpmWorkspace from "./components/GpmWorkspace";
import DosenWorkspace from "./components/DosenWorkspace";
import SatgasDashboard from "./components/SatgasDashboard";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "user_id, nama_lengkap, nidn_nip, program_studi, app_role",
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Gagal membaca profil:", error);
      setMessage(
        "Akun berhasil masuk, tetapi profil pengguna tidak ditemukan.",
      );
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const {
        data: { session: activeSession },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setMessage("Gagal memeriksa sesi pengguna.");
      }

      setSession(activeSession);

      if (activeSession?.user) {
        await loadProfile(activeSession.user.id);
      }

      if (isMounted) {
        setLoadingApp(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        setTimeout(() => {
          loadProfile(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Email dan kata sandi wajib diisi.");
      return;
    }

    try {
      setLoginLoading(true);
      setMessage("");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      setMessage("");
      setPassword("");
    } catch (error) {
      console.error(error);

      if (error.message === "Invalid login credentials") {
        setMessage("Email atau kata sandi tidak benar.");
      } else {
        setMessage(error.message || "Login gagal.");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    setMessage("");

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error(error);
      setMessage("Gagal keluar dari sistem.");
    }
  }

  function getRoleLabel(role) {
    const labels = {
      dosen: "Dosen",
      satgas: "Viewer",
      gpm_reviewer: "Reviewer GPM",
    };

    return labels[role] || role || "Belum ditentukan";
  }

  if (loadingApp) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-8 py-6 shadow">
          <p className="font-medium text-slate-700">
            Memuat SIMETRI...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
          
          <section className="flex flex-col justify-center bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] p-8 text-white md:p-12">
          {/* Logo dan identitas universitas */}
          <div className="mb-8 flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-md">
              <img
                src="/logo-unsulbar.png"
                alt="Logo Universitas Sulawesi Barat"
                className="h-full w-full bg-white object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100 md:text-sm">
                Program Studi Matematika
              </p>

              <p className="mt-1 text-xl font-bold leading-tight text-white md:text-2xl">
                Universitas Sulawesi Barat
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
            Sistem Informasi Monitoring Evaluasi Tata Kelola dan Repositori Internal
          </span>

          <h1 className="mt-8 text-4xl font-bold tracking-tight md:text-5xl">
            SIMETRI
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
            Platform monitoring, evaluasi, tata kelola, dan repositori internal
            untuk data penelitian, pengabdian kepada masyarakat, publikasi,
            luaran, indikator kinerja, serta siklus PPEPP Program Studi
            Matematika Universitas Sulawesi Barat.
          </p>

          <div className="mt-10 grid gap-3 text-sm text-rose-50">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              Pengelolaan penelitian dan pengabdian kepada masyarakat
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              Pengelolaan publikasi dan luaran dosen
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              Verifikasi bukti dan pemantauan capaian PPEPP
            </div>
          </div>
        </section>

          <section className="flex items-center p-8 md:p-12">
            <div className="w-full">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#881337]">
                  Akses pengguna
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  Masuk ke sistem
                </h2>

                <p className="mt-2 text-slate-600">
                  Masukkan email dan kata sandi akun SIMETRI Anda.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="sample@unsulbar.ac.id"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Kata sandi
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                  />
                </div>

                {message && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-5 py-3 font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:bg-none"
                >
                  {loginLoading
                    ? "Sedang masuk..."
                    : "Masuk ke SIMETRI"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                Akun pengguna dikelola oleh administrator Program Studi Matematika
                <span className="mt-1 block">
                  Universitas Sulawesi Barat.
                </span>
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="text-xl font-bold text-slate-900">
              SIMETRI
            </p>

            <p className="text-sm text-slate-500">
              Sistem Informasi Monitoring Evaluasi Tata Kelola dan Repositori Internal
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {message && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {message}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#881337]">
            Selamat datang
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {profile?.nama_lengkap ||
              session.user.email}
          </h1>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Email
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {session.user.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Program studi
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile?.program_studi || "Matematika"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Hak akses
              </p>

              <p className="mt-1 font-semibold text-[#881337]">
                {getRoleLabel(profile?.app_role)}
              </p>
            </div>
          </div>
        </section>

        {profile?.app_role === "gpm_reviewer" && (
          <GpmWorkspace userId={session.user.id} />
        )}

        {profile?.app_role === "dosen" && (
          <DosenWorkspace userId={session.user.id} />
        )}

        {profile?.app_role === "satgas" && (
          <SatgasDashboard />
        )}
      </div>
    </main>
  );
}


export default App;