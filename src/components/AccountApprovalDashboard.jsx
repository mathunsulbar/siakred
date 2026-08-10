import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

function AccountApprovalDashboard({
  adminUserId,
}) {
  const [accounts, setAccounts] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [processingId, setProcessingId] =
    useState(null);
  const [message, setMessage] =
    useState("");
  const [messageType, setMessageType] =
    useState("");
  const [searchText, setSearchText] =
    useState("");

  const [rejectAccount, setRejectAccount] =
    useState(null);
  const [rejectNote, setRejectNote] =
    useState("");

  const loadAccounts = useCallback(
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
              catatan_penolakan
            `)
            .eq("app_role", "dosen")
            .eq("status_akun", "pending")
            .order("tanggal_pengajuan", {
              ascending: true,
            });

        if (error) {
          throw error;
        }

        setAccounts(data ?? []);
      } catch (error) {
        console.error(
          "Gagal memuat pengajuan akun:",
          error,
        );
        setMessageType("error");
        setMessage(
          error.message ||
            "Pengajuan akun belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function approveAccount(account) {
    const confirmed = window.confirm(
      `Aktifkan akun "${account.nama_lengkap || account.email}" sebagai Dosen?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(account.user_id);
      setMessage("");

      const { error } = await supabase
        .from("user_profiles")
        .update({
          status_akun: "active",
          tanggal_persetujuan:
            new Date().toISOString(),
          disetujui_oleh:
            adminUserId,
          catatan_penolakan: null,
          app_role: "dosen",
        })
        .eq("user_id", account.user_id)
        .eq("status_akun", "pending");

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage(
        "Akun dosen berhasil diaktifkan.",
      );

      await loadAccounts();
    } catch (error) {
      console.error(
        "Gagal menyetujui akun:",
        error,
      );
      setMessageType("error");
      setMessage(
        error.message ||
          "Akun belum dapat diaktifkan.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  function openReject(account) {
    setRejectAccount(account);
    setRejectNote("");
    setMessage("");
  }

  async function rejectAccountRequest(
    event,
  ) {
    event.preventDefault();

    if (
      !rejectAccount ||
      !rejectNote.trim()
    ) {
      return;
    }

    try {
      setProcessingId(
        rejectAccount.user_id,
      );
      setMessage("");

      const { error } = await supabase
        .from("user_profiles")
        .update({
          status_akun: "rejected",
          disetujui_oleh:
            adminUserId,
          catatan_penolakan:
            rejectNote.trim(),
        })
        .eq(
          "user_id",
          rejectAccount.user_id,
        )
        .eq("status_akun", "pending");

      if (error) {
        throw error;
      }

      setRejectAccount(null);
      setRejectNote("");

      setMessageType("success");
      setMessage(
        "Pengajuan akun telah ditolak.",
      );

      await loadAccounts();
    } catch (error) {
      console.error(
        "Gagal menolak akun:",
        error,
      );
      setMessageType("error");
      setMessage(
        error.message ||
          "Penolakan akun belum dapat disimpan.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  const filteredAccounts = useMemo(() => {
    const keyword =
      searchText.trim().toLowerCase();

    if (!keyword) {
      return accounts;
    }

    return accounts.filter((account) =>
      [
        account.nama_lengkap,
        account.email,
        account.nidn_nip,
        account.program_studi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [accounts, searchText]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8F1024]">
            Administrasi Akun
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Persetujuan Akun Dosen
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Periksa identitas pendaftar sebelum memberikan akses ke SIMETRI.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAccounts}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[#8F1024]/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#8F1024] disabled:opacity-50 lg:self-auto"
        >
          <RefreshIcon />
          {loading ? "Memuat..." : "Perbarui data"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-[#8F1024]/15 bg-gradient-to-br from-[#FFF7F7] to-white p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />
          <p className="text-sm font-semibold text-slate-500">
            Menunggu Persetujuan
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {loading ? "..." : accounts.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Akun dosen belum aktif
          </p>
        </article>

        <div className="rounded-2xl border border-[#8F1024]/15 bg-gradient-to-br from-[#FFF7F7] to-white p-4 shadow-sm">
          <label
            htmlFor="approval-search"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Cari pendaftar
          </label>

          <input
            id="approval-search"
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Nama, email, atau NIDN/NIP..."
            className="w-full rounded-xl border border-[#8F1024]/15 bg-[#FFF6F7] px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#9F1239] focus:bg-white focus:ring-4 focus:ring-rose-100"
          />
        </div>
      </div>

      {message && (
        <InlineNotice type={messageType === "success" ? "success" : "error"}>
          {message}
        </InlineNotice>
      )}

      <div className="overflow-hidden rounded-3xl border border-[#8F1024]/15 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-[#8F1024]/15 text-left">
                <Heading>No</Heading>
                <Heading>Nama</Heading>
                <Heading>Email</Heading>
                <Heading>
                  NIDN/NIP/NUPTK
                </Heading>
                <Heading>
                  Program Studi
                </Heading>
                <Heading>
                  Tanggal Daftar
                </Heading>
                <Heading align="right">
                  Tindakan
                </Heading>
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.map(
                (account, index) => (
                  <tr
                    key={account.user_id}
                    className="border-b border-slate-100 transition hover:bg-[#FFF6F7]"
                  >
                    <Cell>
                      {index + 1}
                    </Cell>

                    <Cell>
                      <span className="font-semibold text-slate-900">
                        {account.nama_lengkap ||
                          "-"}
                      </span>
                    </Cell>

                    <Cell>
                      {account.email || "-"}
                    </Cell>

                    <Cell>
                      {account.nidn_nip || "-"}
                    </Cell>

                    <Cell>
                      {account.program_studi ||
                        "Matematika"}
                    </Cell>

                    <Cell>
                      {formatDate(
                        account.tanggal_pengajuan,
                      )}
                    </Cell>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openReject(account)
                          }
                          disabled={
                            processingId ===
                            account.user_id
                          }
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Tolak
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            approveAccount(
                              account,
                            )
                          }
                          disabled={
                            processingId ===
                            account.user_id
                          }
                          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingId ===
                          account.user_id
                            ? "Memproses..."
                            : "Setujui"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}

              {!loading && filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8">
                    <TableEmptyState
                      title={searchText.trim() ? "Pendaftar tidak ditemukan" : "Tidak ada akun menunggu"}
                      description={searchText.trim() ? "Coba kata kunci lain atau hapus pencarian." : "Pendaftaran Dosen baru akan muncul otomatis di sini."}
                      actionLabel={searchText.trim() ? "Hapus Pencarian" : null}
                      onAction={searchText.trim() ? () => setSearchText("") : null}
                    />
                  </td>
                </tr>
              )}

              {loading && <LoadingTableRows colSpan={7} rows={3} />}
            </tbody>
          </table>
        </div>
      </div>

      {rejectAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              Tolak Pendaftaran Akun
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {rejectAccount.nama_lengkap ||
                rejectAccount.email}
            </p>

            <form
              onSubmit={
                rejectAccountRequest
              }
              className="mt-5"
            >
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Alasan penolakan
                <span className="ml-1 text-red-600">
                  *
                </span>
              </label>

              <textarea
                value={rejectNote}
                onChange={(event) =>
                  setRejectNote(
                    event.target.value,
                  )
                }
                rows="5"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/10"
                placeholder="Tuliskan alasan pengajuan belum dapat disetujui."
                required
              />

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setRejectAccount(null)
                  }
                  disabled={Boolean(
                    processingId,
                  )}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    Boolean(processingId) ||
                    !rejectNote.trim()
                  }
                  className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Tolak Pendaftaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

export default AccountApprovalDashboard;
