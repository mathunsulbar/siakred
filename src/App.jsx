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

  const [authMode, setAuthMode] = useState("login");
  const [registerForm, setRegisterForm] = useState({
    nama_lengkap: "",
    email: "",
    nidn_nip: "",
    password: "",
    confirm_password: "",
  });
  const [registerLoading, setRegisterLoading] =
    useState(false);
  const [registerMessage, setRegisterMessage] =
    useState("");
  const [registerMessageType, setRegisterMessageType] =
    useState("");

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "user_id, nama_lengkap, nidn_nip, program_studi, app_role, status_akun",
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

  function handleRegisterChange(event) {
    const { name, value } = event.target;

    setRegisterForm((current) => ({
      ...current,
      [name]:
        name === "nidn_nip"
          ? value.replace(/\D/g, "")
          : value,
    }));
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setMessage("");
    setRegisterMessage("");
    setRegisterMessageType("");

    if (mode === "login") {
      setPassword("");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const namaLengkap =
      registerForm.nama_lengkap.trim();
    const registerEmail =
      registerForm.email.trim().toLowerCase();
    const identitas =
      registerForm.nidn_nip.trim();

    setRegisterMessage("");
    setRegisterMessageType("");

    if (!namaLengkap) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "Nama lengkap wajib diisi.",
      );
      return;
    }

    if (!registerEmail) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "Email wajib diisi.",
      );
      return;
    }

    if (!identitas) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "NIDN/NIP/NUPTK wajib diisi.",
      );
      return;
    }

    if (!/^\d+$/.test(identitas)) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "NIDN/NIP/NUPTK hanya boleh berisi angka.",
      );
      return;
    }

    if (registerForm.password.length < 8) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "Kata sandi minimal 8 karakter.",
      );
      return;
    }

    if (
      registerForm.password !==
      registerForm.confirm_password
    ) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "Konfirmasi kata sandi tidak sama.",
      );
      return;
    }

    try {
      setRegisterLoading(true);

      const { data, error } =
        await supabase.auth.signUp({
          email: registerEmail,
          password:
            registerForm.password,
          options: {
            data: {
              nama_lengkap:
                namaLengkap,
              nidn_nip:
                identitas,
              program_studi:
                "Matematika",
              registration_source:
                "simetri_dosen",
            },
          },
        });

      if (error) {
        throw error;
      }

      /*
       * Setelah pendaftaran, session lokal
       * ditutup karena akun tetap harus
       * disetujui Admin GPM sebelum digunakan.
       */
      if (data?.session) {
        await supabase.auth.signOut({
          scope: "local",
        });
      }

      setRegisterForm({
        nama_lengkap: "",
        email: "",
        nidn_nip: "",
        password: "",
        confirm_password: "",
      });

      setRegisterMessageType("success");

      setRegisterMessage(
        "Pendaftaran berhasil. Akun Anda telah diajukan dan menunggu persetujuan Admin GPM.",
      );
    } catch (error) {
      console.error(
        "Pendaftaran akun gagal:",
        error,
      );

      setRegisterMessageType("error");

      const errorText = String(
        error?.message || "",
      ).toLowerCase();

      if (
        errorText.includes(
          "already registered",
        ) ||
        errorText.includes(
          "already been registered",
        )
      ) {
        setRegisterMessage(
          "Email tersebut sudah terdaftar di SIMETRI.",
        );
      } else if (
        errorText.includes("password")
      ) {
        setRegisterMessage(
          "Kata sandi belum memenuhi ketentuan. Gunakan minimal 8 karakter.",
        );
      } else if (
        errorText.includes("invalid email")
      ) {
        setRegisterMessage(
          "Format email belum valid.",
        );
      } else if (
        errorText.includes("rate limit")
      ) {
        setRegisterMessage(
          "Pendaftaran belum dapat diproses saat ini. Silakan coba kembali beberapa saat lagi.",
        );
      } else {
        setRegisterMessage(
          "Pendaftaran akun belum berhasil. Silakan periksa data dan coba kembali.",
        );
      }
    } finally {
      setRegisterLoading(false);
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
      gpm_admin: "Admin GPM",
    };

    return labels[role] || role || "Belum ditentukan";
  }

  function getRoleDescription(role) {
    const descriptions = {
      dosen:
        "Kelola kegiatan tridarma, publikasi, luaran, dan bukti pendukung.",
      satgas:
        "Pantau rekap data dan informasi kinerja Program Studi Matematika.",
      gpm_reviewer:
        "Periksa kelengkapan data, bukti, dan keputusan verifikasi GPM.",
      gpm_admin:
        "Kelola verifikasi, pengguna, persetujuan akun, dan administrasi SIMETRI.",
    };

    return (
      descriptions[role] ||
      "Akses SIMETRI Program Studi Matematika."
    );
  }

  function getInitial(name) {
    const value = String(name || "").trim();

    if (!value) {
      return "S";
    }

    return value.charAt(0).toUpperCase();
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
            Sistem monitoring, evaluasi, tata kelola, dan repositori internal
            untuk data penelitian, pengabdian kepada masyarakat, luaran
            publikasi dan siklus PPEPP Program Studi Matematika Universitas
            Sulawesi Barat.
          </p>

          <div className="mt-10 grid gap-3 text-sm text-rose-50">
            <FeatureCardCompact
              icon="research"
              title="Pengelolaan penelitian dan pengabdian kepada masyarakat"
            />

            <FeatureCardCompact
              icon="publication"
              title="Pengelolaan publikasi dan luaran dosen"
            />

            <FeatureCardCompact
              icon="verification"
              title="Verifikasi bukti dan pemantauan capaian PPEPP"
            />
          </div>
        </section>

          <section className="flex items-center p-8 md:p-12">
            <div className="w-full">
              {authMode === "login" ? (
                <>
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
                          setEmail(
                            event.target.value,
                          )
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
                          setPassword(
                            event.target.value,
                          )
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

                    {registerMessage &&
                      registerMessageType ===
                        "success" && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
                          {registerMessage}
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

                  <div className="mt-6 border-t border-slate-200 pt-6 text-center">
                    <p className="text-sm text-slate-600">
                      Belum memiliki akun Dosen?
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        switchAuthMode(
                          "register",
                        )
                      }
                      className="mt-2 font-semibold text-[#881337] transition hover:text-[#701A35] hover:underline"
                    >
                      Daftar Akun Dosen
                    </button>
                  </div>

                  <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                    Akun pengguna dikelola oleh Admin GPM Program Studi Matematika
                    <span className="mt-1 block">
                      Universitas Sulawesi Barat.
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#881337]">
                      Pendaftaran Dosen
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                      Daftar Akun SIMETRI
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Akun baru akan berstatus menunggu dan hanya dapat digunakan setelah disetujui oleh Admin GPM.
                    </p>
                  </div>

                  <form
                    onSubmit={handleRegister}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="register-nama"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Nama lengkap
                        <span className="ml-1 text-red-600">
                          *
                        </span>
                      </label>

                      <input
                        id="register-nama"
                        name="nama_lengkap"
                        type="text"
                        value={
                          registerForm.nama_lengkap
                        }
                        onChange={
                          handleRegisterChange
                        }
                        placeholder="Nama lengkap dosen"
                        autoComplete="name"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="register-email"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Email
                        <span className="ml-1 text-red-600">
                          *
                        </span>
                      </label>

                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        value={
                          registerForm.email
                        }
                        onChange={
                          handleRegisterChange
                        }
                        placeholder="nama@unsulbar.ac.id"
                        autoComplete="email"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="register-identitas"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        NIDN/NIP/NUPTK
                        <span className="ml-1 text-red-600">
                          *
                        </span>
                      </label>

                      <input
                        id="register-identitas"
                        name="nidn_nip"
                        type="text"
                        inputMode="numeric"
                        value={
                          registerForm.nidn_nip
                        }
                        onChange={
                          handleRegisterChange
                        }
                        placeholder="Masukkan nomor identitas"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Program studi
                      </label>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700">
                        Matematika
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="register-password"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Kata sandi
                          <span className="ml-1 text-red-600">
                            *
                          </span>
                        </label>

                        <input
                          id="register-password"
                          name="password"
                          type="password"
                          value={
                            registerForm.password
                          }
                          onChange={
                            handleRegisterChange
                          }
                          placeholder="Minimal 8 karakter"
                          autoComplete="new-password"
                          minLength="8"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="register-confirm-password"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Konfirmasi
                          <span className="ml-1 text-red-600">
                            *
                          </span>
                        </label>

                        <input
                          id="register-confirm-password"
                          name="confirm_password"
                          type="password"
                          value={
                            registerForm.confirm_password
                          }
                          onChange={
                            handleRegisterChange
                          }
                          placeholder="Ulangi kata sandi"
                          autoComplete="new-password"
                          minLength="8"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
                          required
                        />
                      </div>
                    </div>

                    {registerMessage && (
                      <div
                        className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                          registerMessageType ===
                          "success"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {registerMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={registerLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-5 py-3 font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:bg-none"
                    >
                      {registerLoading
                        ? "Mendaftarkan..."
                        : "Daftar Akun Dosen"}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        switchAuthMode(
                          "login",
                        )
                      }
                      className="text-sm font-semibold text-[#881337] transition hover:text-[#701A35] hover:underline"
                    >
                      ← Kembali ke halaman masuk
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (
    session &&
    profile?.status_akun &&
    profile.status_akun !== "active"
  ) {
    const isRejected =
      profile.status_akun === "rejected";

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF1F2] text-2xl font-bold text-[#881337]">
            !
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            {isRejected
              ? "Pendaftaran akun ditolak"
              : "Akun belum aktif"}
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            {isRejected
              ? "Permohonan akun Anda belum dapat disetujui. Silakan menghubungi Admin GPM untuk informasi lebih lanjut."
              : "Akun Anda masih menunggu aktivasi Admin GPM. Akses ke SIMETRI akan tersedia setelah akun disetujui."}
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            Keluar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#FFF1F2] via-[#FDF2F8] to-[#F8FAFC]">
      <header className="sticky top-0 z-30 border-b border-[#8F1024]/15 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <img
                src="/logo-unsulbar.png"
                alt="Logo Universitas Sulawesi Barat"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-black tracking-tight text-slate-950 sm:text-lg">
                  SIMETRI
                </p>

                <span className="hidden rounded-full bg-[#FFF1F2] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9F1239] sm:inline-flex">
                  Matematika
                </span>
              </div>

              <p className="max-w-[180px] truncate text-[11px] text-slate-500 sm:max-w-none sm:text-sm">
                Monitoring Evaluasi Tata Kelola dan Repositori Internal
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF1F2] text-sm font-black text-[#9F1239]">
                {getInitial(
                  profile?.nama_lengkap ||
                    session.user.email,
                )}
              </div>

              <div className="max-w-[180px]">
                <p className="truncate text-xs font-bold text-slate-800">
                  {profile?.nama_lengkap ||
                    session.user.email}
                </p>

                <p className="text-[11px] font-medium text-slate-500">
                  {getRoleLabel(
                    profile?.app_role,
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari SIMETRI"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#9F1239]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
              </svg>

              <span className="hidden sm:inline">
                Keluar
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6 md:py-8">
        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-[#8F1024]/15 bg-gradient-to-br from-[#C5163A] via-[#8F1024] to-[#5B000A] text-white shadow-[0_20px_60px_-25px_rgba(143,16,36,0.75)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-white/20" />

          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute right-16 top-10 h-32 w-32 rounded-full border-[18px] border-white/10" />

          <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/15">
                  <span className="h-2 w-2 rounded-full bg-[#BE123C]" />
                  {getRoleLabel(
                    profile?.app_role,
                  )}
                </span>

                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
                  Program Studi Matematika
                </span>
              </div>

              <p className="mt-6 text-sm font-semibold text-white/75">
                Selamat datang kembali,
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">
                {profile?.nama_lengkap ||
                  session.user.email}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                {getRoleDescription(
                  profile?.app_role,
                )}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <UserInfoCard
                icon="email"
                label="Email"
                value={session.user.email}
              />

              <UserInfoCard
                icon="study"
                label="Program studi"
                value={
                  profile?.program_studi ||
                  "Matematika"
                }
              />

              <UserInfoCard
                icon="access"
                label="Hak akses"
                value={getRoleLabel(
                  profile?.app_role,
                )}
              />
            </div>
          </div>
        </section>

        {[
          "gpm_reviewer",
          "gpm_admin",
        ].includes(profile?.app_role) && (
          <GpmWorkspace
            userId={session.user.id}
            appRole={profile?.app_role}
          />
        )}

        {profile?.app_role === "dosen" && (
          <DosenWorkspace
            userId={session.user.id}
          />
        )}

        {profile?.app_role === "satgas" && (
          <SatgasDashboard />
        )}
      </div>
    </main>
  );

}


function UserInfoCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#9F1239] shadow-sm">
        <UserInfoIcon type={icon} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-white/70">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-bold text-white">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function UserInfoIcon({ type }) {
  const className = "h-4 w-4";

  if (type === "email") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (type === "study") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="m3 10 9-5 9 5-9 5-9-5Z" />
        <path d="M7 12v5c3 2 7 2 10 0v-5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function FeatureCardCompact({ icon, title }) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-white/10 p-4 pl-16 text-white">
      <div className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-white shadow-sm">
        <FeatureIconCompact type={icon} />
      </div>

      <span className="block leading-5">
        {title}
      </span>
    </div>
  );
}

function FeatureIconCompact({ type }) {
  const iconClassName = "h-[18px] w-[18px] text-[#C5163A]";

  if (type === "publication") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClassName}
        aria-hidden="true"
      >
        <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22.5v-17Z" />
        <path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5a3.5 3.5 0 0 1 3.5 3.5v-17Z" />
      </svg>
    );
  }

  if (type === "verification") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClassName}
        aria-hidden="true"
      >
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName}
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M9 3h6v4H9z" />
      <path d="M8 17v-4" />
      <path d="M12 17v-7" />
      <path d="M16 17v-2" />
    </svg>
  );
}


export default App;