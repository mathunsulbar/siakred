import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

const ROLE_OPTIONS = [
  {
    value: "dosen",
    label: "Dosen",
  },
  {
    value: "gpm_reviewer",
    label: "Reviewer GPM",
  },
  {
    value: "satgas",
    label: "Viewer",
  },
  {
    value: "gpm_admin",
    label: "Admin GPM",
  },
];

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Aktif",
  },
  {
    value: "pending",
    label: "Menunggu",
  },
  {
    value: "rejected",
    label: "Ditolak",
  },
  {
    value: "inactive",
    label: "Nonaktif",
  },
];

function UserManagementDashboard({
  adminUserId,
}) {
  const [users, setUsers] =
    useState([]);
  const [drafts, setDrafts] =
    useState({});
  const [loading, setLoading] =
    useState(true);
  const [savingId, setSavingId] =
    useState(null);
  const [searchText, setSearchText] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [messageType, setMessageType] =
    useState("");

  const loadUsers = useCallback(
    async () => {
      try {
        setLoading(true);
        setMessage("");

        const { data, error } =
          await supabase
            .from("user_profiles")
            .select(`
              user_id,
              email,
              nama_lengkap,
              nidn_nip,
              program_studi,
              app_role,
              status_akun,
              tanggal_pengajuan,
              tanggal_persetujuan
            `)
            .order("nama_lengkap", {
              ascending: true,
            });

        if (error) {
          throw error;
        }

        const rows = data ?? [];

        setUsers(rows);

        setDrafts(
          Object.fromEntries(
            rows.map((user) => [
              user.user_id,
              {
                app_role:
                  user.app_role,
                status_akun:
                  user.status_akun,
              },
            ]),
          ),
        );
      } catch (error) {
        console.error(
          "Gagal memuat pengguna:",
          error,
        );
        setMessageType("error");
        setMessage(
          error.message ||
            "Data pengguna belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword =
      searchText.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((user) =>
      [
        user.nama_lengkap,
        user.email,
        user.nidn_nip,
        user.program_studi,
        user.app_role,
        user.status_akun,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [users, searchText]);

  function updateDraft(
    userId,
    field,
    value,
  ) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  }

  async function saveUser(user) {
    if (
      user.user_id === adminUserId
    ) {
      return;
    }

    const draft = drafts[user.user_id];

    if (!draft) {
      return;
    }

    const confirmed = window.confirm(
      `Simpan perubahan hak akses untuk "${user.nama_lengkap || user.email}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingId(user.user_id);
      setMessage("");

      const updateData = {
        app_role: draft.app_role,
        status_akun:
          draft.status_akun,
      };

      if (
        draft.status_akun ===
          "active" &&
        user.status_akun !== "active"
      ) {
        updateData.tanggal_persetujuan =
          new Date().toISOString();
        updateData.disetujui_oleh =
          adminUserId;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", user.user_id);

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage(
        "Pengaturan pengguna berhasil diperbarui.",
      );

      await loadUsers();
    } catch (error) {
      console.error(
        "Gagal memperbarui pengguna:",
        error,
      );
      setMessageType("error");
      setMessage(
        error.message ||
          "Pengaturan pengguna belum dapat disimpan.",
      );
    } finally {
      setSavingId(null);
    }
  }

  const userStats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(
        (user) =>
          user.status_akun === "active",
      ).length,
      reviewer: users.filter(
        (user) =>
          user.app_role === "gpm_reviewer",
      ).length,
      admin: users.filter(
        (user) =>
          user.app_role === "gpm_admin",
      ).length,
    };
  }, [users]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8F1024]">
            Super Admin
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Kelola Pengguna
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Atur role, status akun, dan akses pengguna SIMETRI secara terpusat.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[#8F1024]/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#8F1024] disabled:opacity-50 lg:self-auto"
        >
          <RefreshIcon />
          {loading ? "Memuat..." : "Perbarui data"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UserStatCard label="Total Pengguna" value={loading ? "..." : userStats.total} tone="brand" />
        <UserStatCard label="Akun Aktif" value={loading ? "..." : userStats.active} tone="green" />
        <UserStatCard label="Reviewer GPM" value={loading ? "..." : userStats.reviewer} tone="amber" />
        <UserStatCard label="Admin GPM" value={loading ? "..." : userStats.admin} tone="red" />
      </div>

      {message && (
        <InlineNotice type={messageType === "success" ? "success" : "error"}>
          {message}
        </InlineNotice>
      )}

      <div className="rounded-2xl border border-[#8F1024]/15 bg-gradient-to-br from-[#FFF7F7] to-white p-4 shadow-sm">
        <label
          htmlFor="user-search"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Pencarian
        </label>

        <input
          id="user-search"
          type="search"
          value={searchText}
          onChange={(event) =>
            setSearchText(
              event.target.value,
            )
          }
          placeholder="Cari nama, email, identitas, role, atau status..."
          className="w-full rounded-xl border border-[#8F1024]/15 bg-[#FFF6F7] px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-[#9F1239] focus:bg-white focus:ring-4 focus:ring-rose-100"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#8F1024]/15 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-[#8F1024]/15 text-left">
                <Heading>No</Heading>
                <Heading>Pengguna</Heading>
                <Heading>
                  NIDN/NIP/NUPTK
                </Heading>
                <Heading>Role</Heading>
                <Heading>Status</Heading>
                <Heading align="right">
                  Tindakan
                </Heading>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map(
                (user, index) => {
                  const isSelf =
                    user.user_id ===
                    adminUserId;

                  const draft =
                    drafts[user.user_id] ??
                    {
                      app_role:
                        user.app_role,
                      status_akun:
                        user.status_akun,
                    };

                  return (
                    <tr
                      key={user.user_id}
                      className="border-b border-slate-100 transition hover:bg-[#FFF6F7]"
                    >
                      <Cell>
                        {index + 1}
                      </Cell>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {user.nama_lengkap ||
                            "-"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {user.email || "-"}
                        </p>

                        {isSelf && (
                          <span className="mt-2 inline-flex rounded-full bg-[#FFF1F2] px-3 py-1 text-xs font-semibold text-[#881337]">
                            Akun Anda
                          </span>
                        )}
                      </td>

                      <Cell>
                        {user.nidn_nip ||
                          "-"}
                      </Cell>

                      <td className="px-4 py-4">
                        <select
                          value={
                            draft.app_role ||
                            "dosen"
                          }
                          onChange={(event) =>
                            updateDraft(
                              user.user_id,
                              "app_role",
                              event.target
                                .value,
                            )
                          }
                          disabled={isSelf}
                          className="w-full rounded-xl border border-[#8F1024]/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9F1239] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {ROLE_OPTIONS.map(
                            (option) => (
                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={
                            draft.status_akun ||
                            "active"
                          }
                          onChange={(event) =>
                            updateDraft(
                              user.user_id,
                              "status_akun",
                              event.target
                                .value,
                            )
                          }
                          disabled={isSelf}
                          className="w-full rounded-xl border border-[#8F1024]/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9F1239] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {STATUS_OPTIONS.map(
                            (option) => (
                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {isSelf ? (
                          <span className="text-sm text-slate-400">
                            Dilindungi
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              saveUser(user)
                            }
                            disabled={
                              savingId ===
                              user.user_id
                            }
                            className="rounded-lg bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
                          >
                            {savingId ===
                            user.user_id
                              ? "Menyimpan..."
                              : "Simpan"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                },
              )}

              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8">
                    <TableEmptyState
                      title={searchText.trim() ? "Pengguna tidak ditemukan" : "Belum ada pengguna"}
                      description={searchText.trim() ? "Gunakan nama, email, NIDN/NIP, atau role lain." : "Pengguna SIMETRI akan tampil pada tabel ini."}
                      actionLabel={searchText.trim() ? "Hapus Pencarian" : null}
                      onAction={searchText.trim() ? () => setSearchText("") : null}
                    />
                  </td>
                </tr>
              )}

              {loading && <LoadingTableRows colSpan={6} rows={4} />}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Akun Admin GPM yang sedang digunakan
        dilindungi dari perubahan role dan status
        untuk mencegah kehilangan akses
        administratif.
      </p>
    </section>
  );
}


function InlineNotice({ type = "info", children }) {
  const isSuccess = type === "success";
  const isError = type === "error";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-sm ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-800"
          : isError
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
      role="status"
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-black ${
          isSuccess
            ? "bg-green-100 text-green-700"
            : isError
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
        }`}
      >
        {isSuccess ? "✓" : isError ? "!" : "i"}
      </span>
      <div className="min-w-0 flex-1 leading-6">
        {children}
      </div>
    </div>
  );
}


function TableEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] text-[#8F1024] ring-1 ring-[#8F1024]/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h8L20 8.5V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5.5Z" />
          <path d="M14 3v6h6" />
          <path d="M8 14h8" />
          <path d="M8 17h5" />
        </svg>
      </div>

      <p className="mt-4 text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function LoadingTableRows({ colSpan, rows = 3 }) {
  return Array.from({ length: rows }).map((_, index) => (
    <tr key={`loading-row-${index}`} className="border-b border-[#8F1024]/10">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded-full bg-slate-200" />
            <div className="h-2.5 w-3/5 rounded-full bg-slate-100" />
          </div>
          <div className="hidden h-8 w-24 rounded-xl bg-slate-100 sm:block" />
        </div>
      </td>
    </tr>
  ));
}

function UserStatCard({
  label,
  value,
  tone,
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#8F1024]/15 bg-gradient-to-br from-[#FFF7F7] to-white p-4 shadow-sm">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          tone === "green"
            ? "bg-green-500"
            : tone === "amber"
              ? "bg-amber-500"
              : tone === "red"
                ? "bg-red-500"
                : "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A]"
        }`}
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
    </article>
  );
}

function RefreshIcon() {
  return (
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
      <path d="M20 6v6h-6" />
      <path d="M4 18v-6h6" />
      <path d="M5.5 9A7 7 0 0 1 17 5l3 3" />
      <path d="m4 16 3 3a7 7 0 0 0 11.5-4" />
    </svg>
  );
}

function Heading({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-4 py-3 text-sm font-semibold text-slate-600 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Cell({ children }) {
  return (
    <td className="px-4 py-4 text-sm text-slate-700">
      {children}
    </td>
  );
}

export default UserManagementDashboard;
