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
            Memuat SIAKRED...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
          <section className="flex flex-col justify-center bg-blue-700 p-8 text-white md:p-12">
            <span className="w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              Sistem Penjaminan Mutu Internal
            </span>

            <h1 className="mt-8 text-4xl font-bold tracking-tight md:text-5xl">
              SIAKRED Matematika
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">
              Sistem Informasi Manajemen Akreditasi Internal untuk
              mengelola penelitian, pengabdian kepada masyarakat,
              IKU, IKT, dan siklus PPEPP.
            </p>

            <div className="mt-10 grid gap-3 text-sm text-blue-50">
              <div className="rounded-xl bg-white/10 p-4">
                Pengelolaan penelitian dan PkM
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                Verifikasi bukti oleh Tim GPM
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                Pemantauan capaian IKU, IKT, dan PPEPP
              </div>
            </div>
          </section>

          <section className="flex items-center p-8 md:p-12">
            <div className="w-full">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                  Akses pengguna
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  Masuk ke sistem
                </h2>

                <p className="mt-2 text-slate-600">
                  Gunakan akun yang telah dibuat pada Supabase.
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
                    placeholder="gpm.matematika@kampus.ac.id"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loginLoading
                    ? "Sedang masuk..."
                    : "Masuk ke SIAKRED"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                Akun pengguna dikelola oleh administrator SIAKRED
                Program Studi Matematika.
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
              SIAKRED Matematika
            </p>

            <p className="text-sm text-slate-500">
              Sistem Penjaminan Mutu Internal
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
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
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

              <p className="mt-1 font-semibold text-blue-700">
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