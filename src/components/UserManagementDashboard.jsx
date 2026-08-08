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

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Kelola Pengguna
          </h2>

          <p className="mt-1 text-slate-600">
            Atur status akun dan role pengguna
            SIMETRI.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading
            ? "Memuat..."
            : "Perbarui data"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
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
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/10"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left">
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
                      className="border-b border-slate-100"
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
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
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
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
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

              {!loading &&
                filteredUsers.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      Tidak ada pengguna yang
                      sesuai pencarian.
                    </td>
                  </tr>
                )}

              {loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Memuat pengguna...
                  </td>
                </tr>
              )}
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
