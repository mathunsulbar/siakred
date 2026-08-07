import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

function VerificationHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [sourceFilter, setSourceFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [searchText, setSearchText] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [logsResult, profilesResult] =
        await Promise.all([
          supabase
            .from("log_verifikasi_gpm")
            .select(`
              id,
              sumber_data,
              sumber_id,
              dosen_id,
              judul_dokumen,
              status_sebelum,
              status_sesudah,
              catatan_gpm,
              aktor_id,
              aktor_role,
              created_at
            `)
            .order("created_at", {
              ascending: false,
            })
            .limit(300),

          supabase
            .from("user_profiles")
            .select(`
              user_id,
              nama_lengkap,
              nidn_nip,
              app_role
            `),
        ]);

      if (logsResult.error) {
        throw logsResult.error;
      }

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      const profilesById = {};

      for (const profile of profilesResult.data ?? []) {
        profilesById[profile.user_id] = profile;
      }

      const mappedLogs = (logsResult.data ?? []).map(
        (log) => ({
          ...log,

          namaDosen:
            profilesById[log.dosen_id]
              ?.nama_lengkap || "Dosen",

          nidnNip:
            profilesById[log.dosen_id]
              ?.nidn_nip || null,

          namaAktor:
            profilesById[log.aktor_id]
              ?.nama_lengkap ||
            getRoleLabel(log.aktor_role),
        }),
      );

      setLogs(mappedLogs);
    } catch (error) {
      console.error(
        "Gagal membaca riwayat verifikasi:",
        error,
      );

      setErrorMessage(
        error.message ||
          "Riwayat verifikasi belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    const channel = supabase
      .channel("siakred-verification-history")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "log_verifikasi_gpm",
        },
        () => {
          loadHistory();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadHistory]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSource =
        sourceFilter === "semua" ||
        log.sumber_data === sourceFilter;

      const matchesStatus =
        statusFilter === "semua" ||
        log.status_sesudah === statusFilter;

      const searchableText = [
        log.judul_dokumen,
        log.namaDosen,
        log.nidnNip,
        log.namaAktor,
        log.catatan_gpm,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return (
        matchesSource &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    logs,
    sourceFilter,
    statusFilter,
    searchText,
  ]);

  const summary = useMemo(() => {
    return {
      total: logs.length,

      approved: logs.filter(
        (log) =>
          log.status_sesudah === "approved",
      ).length,

      rejected: logs.filter(
        (log) =>
          log.status_sesudah === "rejected",
      ).length,

      resubmitted: logs.filter(
        (log) =>
          log.status_sebelum === "rejected" &&
          log.status_sesudah === "pending",
      ).length,
    };
  }, [logs]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Riwayat Verifikasi
        </h2>

        <p className="mt-1 text-slate-600">
          Jejak pemeriksaan, persetujuan, penolakan,
          dan pengajuan ulang dokumen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total tindakan"
          value={summary.total}
          description="Seluruh aktivitas verifikasi"
        />

        <SummaryCard
          title="Persetujuan"
          value={summary.approved}
          description="Dokumen disetujui"
        />

        <SummaryCard
          title="Penolakan"
          value={summary.rejected}
          description="Dokumen perlu revisi"
        />

        <SummaryCard
          title="Dikirim ulang"
          value={summary.resubmitted}
          description="Perbaikan dari dosen"
        />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label
              htmlFor="history-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Pencarian
            </label>

            <input
              id="history-search"
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Cari dosen, judul, aktor, atau catatan..."
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="history-source"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Sumber data
            </label>

            <select
              id="history-source"
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value)
              }
              className={inputClassName}
            >
              <option value="semua">
                Semua sumber
              </option>

              <option value="kegiatan_tridarma">
                Kegiatan
              </option>

              <option value="publikasi_dan_luaran">
                Publikasi dan Luaran
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="history-status"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Status akhir
            </label>

            <select
              id="history-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className={inputClassName}
            >
              <option value="semua">
                Semua status
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="approved">
                Disetujui
              </option>

              <option value="rejected">
                Ditolak
              </option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-500">
            Menampilkan {filteredLogs.length} dari{" "}
            {logs.length} aktivitas.
          </p>

          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Perbarui"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <TableHeading>Waktu</TableHeading>
                <TableHeading>Dosen</TableHeading>
                <TableHeading>Sumber</TableHeading>
                <TableHeading>Dokumen</TableHeading>
                <TableHeading>Perubahan</TableHeading>
                <TableHeading>Catatan</TableHeading>
                <TableHeading>Aktor</TableHeading>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-100 align-top"
                >
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                    {formatDateTime(log.created_at)}
                  </td>

                  <td className="px-3 py-4">
                    <p className="font-semibold text-slate-900">
                      {log.namaDosen}
                    </p>

                    {log.nidnNip && (
                      <p className="mt-1 text-xs text-slate-500">
                        {log.nidnNip}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <span className="inline-flex rounded-full border border-[#000080]/20 bg-[#000080]/5 px-3 py-1 text-xs font-semibold text-[#000080]">
                      {getSourceLabel(log.sumber_data)}
                    </span>
                  </td>

                  <td className="max-w-sm px-3 py-4">
                    <p className="font-medium text-slate-900">
                      {log.judul_dokumen}
                    </p>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={log.status_sebelum}
                      />

                      <span className="text-slate-400">
                        →
                      </span>

                      <StatusBadge
                        status={log.status_sesudah}
                      />
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {getActionLabel(log)}
                    </p>
                  </td>

                  <td className="max-w-sm px-3 py-4 text-sm text-slate-600">
                    {log.catatan_gpm || "-"}
                  </td>

                  <td className="px-3 py-4">
                    <p className="font-medium text-slate-900">
                      {log.namaAktor}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {getRoleLabel(log.aktor_role)}
                    </p>
                  </td>
                </tr>
              ))}

              {!loading &&
                filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-3 py-12 text-center text-slate-500"
                    >
                      Belum ada riwayat yang sesuai.
                    </td>
                  </tr>
                )}

              {loading && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-3 py-12 text-center text-slate-500"
                  >
                    Memuat riwayat verifikasi...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function getActionLabel(log) {
  if (
    log.status_sebelum === "pending" &&
    log.status_sesudah === "approved"
  ) {
    return "Dokumen disetujui";
  }

  if (
    log.status_sebelum === "pending" &&
    log.status_sesudah === "rejected"
  ) {
    return "Dokumen ditolak";
  }

  if (
    log.status_sebelum === "rejected" &&
    log.status_sesudah === "pending"
  ) {
    return "Dokumen dikirim ulang";
  }

  return "Status diperbarui";
}

function getSourceLabel(source) {
  const labels = {
    kegiatan_tridarma: "Kegiatan",
    publikasi_dan_luaran: "Luaran",
  };

  return labels[source] ?? source;
}

function getRoleLabel(role) {
  const labels = {
    dosen: "Dosen",
    satgas: "Satgas Akreditasi",
    gpm_reviewer: "Reviewer GPM",
  };

  return labels[role] ?? "Administrator";
}

function StatusBadge({ status }) {
  const styles = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-700",

    approved:
      "border-green-200 bg-green-50 text-green-700",

    rejected:
      "border-red-200 bg-red-50 text-red-700",
  };

  const labels = {
    pending: "Pending",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] ??
        "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </article>
  );
}

function TableHeading({ children }) {
  return (
    <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">
      {children}
    </th>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export default VerificationHistory;