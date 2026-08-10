import {
  useCallback,
  useEffect,
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

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Persetujuan Akun Dosen
          </h2>

          <p className="mt-1 text-slate-600">
            Periksa pendaftaran dosen sebelum
            akun diaktifkan.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAccounts}
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left">
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
              {accounts.map(
                (account, index) => (
                  <tr
                    key={account.user_id}
                    className="border-b border-slate-100"
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
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
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
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
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

              {!loading &&
                accounts.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      Tidak ada pendaftaran
                      dosen yang menunggu
                      persetujuan.
                    </td>
                  </tr>
                )}

              {loading && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Memuat pengajuan akun...
                  </td>
                </tr>
              )}
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
