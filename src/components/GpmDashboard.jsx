import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import PpeppCharts from "./PpeppCharts";

const BUCKET_NAME = "bukti-akreditasi";

function GpmDashboard() {
  const currentYear = new Date().getFullYear();

  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    ppepp: 0,
  });

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [openingFile, setOpeningFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [revisionNote, setRevisionNote] =
    useState("");

  async function getDocumentCount(table, status) {
    return supabase
      .from(table)
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status_gpm", status);
  }

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        kegiatanPending,
        luaranPending,
        kegiatanApproved,
        luaranApproved,
        kegiatanRejected,
        luaranRejected,
        kegiatanQueue,
        luaranQueue,
        profilesResult,
        ppeppResult,
      ] = await Promise.all([
        getDocumentCount(
          "kegiatan_tridarma",
          "pending",
        ),

        getDocumentCount(
          "publikasi_dan_luaran",
          "pending",
        ),

        getDocumentCount(
          "kegiatan_tridarma",
          "approved",
        ),

        getDocumentCount(
          "publikasi_dan_luaran",
          "approved",
        ),

        getDocumentCount(
          "kegiatan_tridarma",
          "rejected",
        ),

        getDocumentCount(
          "publikasi_dan_luaran",
          "rejected",
        ),

        // Antrean kegiatan Penelitian/PkM
        supabase
        .from("kegiatan_tridarma")
        .select(`
            id,
            dosen_id,
            jenis_kegiatan,
            judul,
            tahun,
            ketua_kegiatan,
            sumber_dana,
            jumlah_dana,
            jenis_indikator,
            kode_indikator,
            link_bukti,
            dokumen_bukti_path,
            status_gpm,
            created_at
        `)
        .eq("status_gpm", "pending")
        .order("created_at", {
            ascending: true,
        }),

        // Antrean publikasi dan luaran
        supabase
        .from("publikasi_dan_luaran")
        .select(`
            id,
            dosen_id,
            jenis_kegiatan,
            jenis_luaran,
            judul_luaran,
            tahun,
            ketua_kegiatan,
            anggota_dosen,
            mahasiswa_terlibat,
            semester,
            tahun_akademik,
            jenis_indikator,
            kode_indikator,
            link_bukti,
            dokumen_bukti_path,
            status_gpm,
            created_at
        `)
        .eq("status_gpm", "pending")
        .order("created_at", {
            ascending: true,
        }),

        supabase
          .from("user_profiles")
          .select(
            "user_id, nama_lengkap, nidn_nip",
          ),

        supabase
          .from("siklus_ppepp")
          .select(
            "target_nilai, realisasi_nilai",
          )
          .eq("tahun", currentYear),
      ]);

      const results = [
        kegiatanPending,
        luaranPending,
        kegiatanApproved,
        luaranApproved,
        kegiatanRejected,
        luaranRejected,
        kegiatanQueue,
        luaranQueue,
        profilesResult,
        ppeppResult,
      ];

      const failedResult = results.find(
        (result) => result.error,
      );

      if (failedResult?.error) {
        throw failedResult.error;
      }

      const profilesById = {};

      for (const profile of profilesResult.data ?? []) {
            profilesById[profile.user_id] = profile;
            }

      const activityItems =
        (kegiatanQueue.data ?? []).map((item) => ({
            id: item.id,

            sourceTable:
            "kegiatan_tridarma",

            sourceLabel:
            "Kegiatan",

            dosenId:
            item.dosen_id,

            namaDosen:
            profilesById[item.dosen_id]
                ?.nama_lengkap ||
            "Nama dosen belum tersedia",

            nidnNip:
            profilesById[item.dosen_id]
                ?.nidn_nip ||
            null,

            jenisKegiatan:
            item.jenis_kegiatan,

            judul:
            item.judul,

            tahun:
            item.tahun,

            jenisIndikator:
            item.jenis_indikator,

            kodeIndikator:
            item.kode_indikator,

            linkBukti:
            item.link_bukti ?? null,

            dokumenBuktiPath:
            item.dokumen_bukti_path ?? null,

            createdAt:
            item.created_at,
        }));

      const outputItems =
        (luaranQueue.data ?? []).map((item) => ({
            id: item.id,

            sourceTable:
            "publikasi_dan_luaran",

            sourceLabel:
            "Luaran",

            dosenId:
            item.dosen_id,

            namaDosen:
            profilesById[item.dosen_id]
                ?.nama_lengkap ||
            "Nama dosen belum tersedia",

            nidnNip:
            profilesById[item.dosen_id]
                ?.nidn_nip ||
            null,

            jenisKegiatan:
            item.jenis_kegiatan,

            jenisLuaran:
            item.jenis_luaran,

            judul:
            item.judul_luaran,

            tahun:
            item.tahun,

            jenisIndikator:
            item.jenis_indikator,

            kodeIndikator:
            item.kode_indikator,

            linkBukti:
            item.link_bukti ?? null,

            dokumenBuktiPath:
            item.dokumen_bukti_path ?? null,

            createdAt:
            item.created_at,
        }));

        const combinedQueue = [
        ...activityItems,
        ...outputItems,
      ].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime(),
      );

      setQueue(combinedQueue);

      const indicators = ppeppResult.data ?? [];

      const achievementValues = indicators
        .filter(
          (item) =>
            Number(item.target_nilai) > 0,
        )
        .map((item) => {
          const target = Number(
            item.target_nilai,
          );

          const realization = Number(
            item.realisasi_nilai,
          );

          return (realization / target) * 100;
        });

      const ppeppAchievement =
        achievementValues.length > 0
          ? achievementValues.reduce(
              (total, value) =>
                total + value,
              0,
            ) / achievementValues.length
          : 0;

      setSummary({
        pending:
          (kegiatanPending.count ?? 0) +
          (luaranPending.count ?? 0),

        approved:
          (kegiatanApproved.count ?? 0) +
          (luaranApproved.count ?? 0),

        rejected:
          (kegiatanRejected.count ?? 0) +
          (luaranRejected.count ?? 0),

        ppepp: Math.round(
          ppeppAchievement,
        ),
      });
    } catch (error) {
      console.error(
        "Gagal memuat dashboard:",
        error,
      );

      setErrorMessage(
        error.message ||
          "Data dashboard belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  async function openEvidence(filePath) {
  if (!filePath) {
    setErrorMessage(
      "Dokumen bukti belum tersedia untuk pengajuan ini.",
    );
    return;
  }

  /*
   * Membuka tab kosong terlebih dahulu untuk mencegah
   * browser memblokir tab setelah proses async selesai.
   */
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) {
    setErrorMessage(
      "Browser memblokir jendela dokumen. Izinkan pop-up untuk situs localhost.",
    );
    return;
  }

  previewWindow.opener = null;
  previewWindow.document.title = "Memuat dokumen...";
  previewWindow.document.body.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      padding: 32px;
      color: #334155;
    ">
      Memuat dokumen bukti...
    </div>
  `;

  try {
    setOpeningFile(filePath);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 300);

    if (error) {
      throw error;
    }

    previewWindow.location.href = data.signedUrl;
  } catch (error) {
    previewWindow.close();

    console.error("Gagal membuka dokumen:", error);

    setErrorMessage(
      error.message ||
        "Dokumen bukti tidak dapat dibuka.",
    );
  } finally {
    setOpeningFile(null);
  }
}


  async function handleApprove(item) {
    const confirmed = window.confirm(
      `Setujui dokumen "${item.judul}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(item.id);
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase
        .from(item.sourceTable)
        .update({
            status_gpm: "approved",
            catatan_revisi_gpm: null,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Dokumen berhasil disetujui oleh GPM.",
      );

      await loadDashboardData();
    } catch (error) {
      console.error(
        "Gagal menyetujui dokumen:",
        error,
      );

      setErrorMessage(
        error.message ||
          "Dokumen gagal disetujui.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  function openRejectDialog(item) {
    setSelectedItem(item);
    setRevisionNote("");
    setErrorMessage("");
    setSuccessMessage("");
    setRejectDialogOpen(true);
  }

  function closeRejectDialog() {
    if (processingId) {
      return;
    }

    setRejectDialogOpen(false);
    setSelectedItem(null);
    setRevisionNote("");
  }

  async function handleReject(event) {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    if (!revisionNote.trim()) {
      setErrorMessage(
        "Catatan revisi wajib diisi.",
      );
      return;
    }

    try {
      setProcessingId(selectedItem.id);
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase
        .from(selectedItem.sourceTable)
        .update({
            status_gpm: "rejected",
            catatan_revisi_gpm:
            revisionNote.trim(),
        })
        .eq("id", selectedItem.id);

      if (error) {
        throw error;
      }

      setRejectDialogOpen(false);
      setSelectedItem(null);
      setRevisionNote("");

      setSuccessMessage(
        "Dokumen ditolak dan dikembalikan kepada dosen untuk diperbaiki.",
      );

      await loadDashboardData();
    } catch (error) {
      console.error(
        "Gagal menolak dokumen:",
        error,
      );

      setErrorMessage(
        error.message ||
          "Keputusan penolakan gagal disimpan.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Dashboard Verifikasi GPM
          </h2>

          <p className="mt-1 text-slate-600">
            Kelola pemeriksaan penelitian, PkM,
            luaran, serta siklus PPEPP.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Memuat..."
            : "Perbarui data"}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Antrean verifikasi"
          value={
            loading ? "..." : summary.pending
          }
          description="Dokumen belum diperiksa"
        />

        <SummaryCard
          title="Disetujui"
          value={
            loading ? "..." : summary.approved
          }
          description="Dokumen telah valid"
        />

        <SummaryCard
          title="Perlu revisi"
          value={
            loading ? "..." : summary.rejected
          }
          description="Dokumen dikembalikan"
        />

        <SummaryCard
          title="Capaian PPEPP"
          value={
            loading
              ? "..."
              : `${summary.ppepp}%`
          }
          description={`IKU dan IKT tahun ${currentYear}`}
        />
      </div>
       <PpeppCharts />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900">
            Antrean Dokumen
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Dokumen berstatus pending yang belum
            diperiksa oleh Tim GPM.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <TableHeading>
                  Dosen
                </TableHeading>

                <TableHeading>
                  Jenis
                </TableHeading>

                <TableHeading>
                  Judul
                </TableHeading>

                <TableHeading>
                  Tahun
                </TableHeading>

                <TableHeading>
                  Indikator
                </TableHeading>

                <TableHeading>
                  Bukti
                </TableHeading>

                <TableHeading>
                  Dikirim
                </TableHeading>

                <TableHeading align="right">
                  Aksi
                </TableHeading>
              </tr>
            </thead>

            <tbody>
              {queue.map((item) => (
                <tr
                    key={`${item.sourceTable}-${item.id}`}
                    className="border-b border-slate-100 align-top"
                >
                  <td className="px-3 py-4">
                    <p className="font-semibold text-slate-900">
                      {item.namaDosen}
                    </p>

                    {item.nidnNip && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.nidnNip}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.sourceLabel}
                    </span>

                    <p className="mt-2 text-sm capitalize text-slate-600">
                      {item.jenisKegiatan ===
                      "pkm"
                        ? "PkM"
                        : "Penelitian"}
                    </p>
                  </td>

                  <td className="max-w-md px-3 py-4">
                    <p className="font-medium text-slate-900">
                      {item.judul}
                    </p>

                    {item.jenisLuaran && (
                      <p className="mt-1 text-sm text-slate-500">
                        Luaran:{" "}
                        {item.jenisLuaran}
                      </p>
                    )}

                    {item.ketuaKegiatan && (
                        <p className="mt-2 text-sm text-slate-600">
                            Ketua: {item.ketuaKegiatan}
                        </p>
                        )}

                        {item.tahunAkademik && (
                        <p className="mt-1 text-xs text-slate-500">
                            Semester{" "}
                            {item.semester === "ganjil"
                            ? "Ganjil"
                            : "Genap"}
                            {" • "}
                            Tahun Akademik {item.tahunAkademik}
                        </p>
                        )}

                        {item.anggotaDosen && (
                        <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                            Anggota dosen: {item.anggotaDosen}
                        </p>
                        )}

                        {item.mahasiswaTerlibat && (
                        <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                            Mahasiswa: {item.mahasiswaTerlibat}
                        </p>
                        )}

                    {item.sumberDana && (
                      <p className="mt-1 text-sm text-slate-500">
                        Sumber dana:{" "}
                        {item.sumberDana}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-4 text-sm text-slate-700">
                    {item.tahun}
                  </td>

                  {/* Kolom indikator */}
                    <td className="px-3 py-4">
                    {item.jenisIndikator ? (
                        <>
                        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {item.jenisIndikator}
                        </span>

                        <p className="mt-1 text-xs text-slate-500">
                            {item.kodeIndikator || "Tanpa kode"}
                        </p>
                        </>
                    ) : (
                        <span className="text-sm text-slate-400">
                        Belum ditentukan
                        </span>
                    )}
                    </td>

                    {/* Kolom bukti */} 
                    <td className="px-3 py-4">
                    <div className="flex flex-col items-start gap-2">
                        {item.linkBukti ? (
                            <a
                                href={item.linkBukti}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                            >
                                Buka Link Bukti
                            </a>
                            ) : item.dokumenBuktiPath ? (
                            <button
                                type="button"
                                onClick={() =>
                                openEvidence(item.dokumenBuktiPath)
                                }
                                disabled={
                                openingFile === item.dokumenBuktiPath
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                                {openingFile === item.dokumenBuktiPath
                                ? "Membuka..."
                                : "Lihat Bukti"}
                            </button>
                            ) : (
                            <span className="text-sm text-red-600">
                                Belum ada
                            </span>
                            )}
                    </div>
                    </td>

                  <td className="px-3 py-4 text-sm text-slate-600">
                    {formatDate(
                      item.createdAt,
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleApprove(item)
                        }
                        disabled={
                          processingId === item.id
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                      >
                        {processingId === item.id
                          ? "Memproses..."
                          : "Setujui"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openRejectDialog(item)
                        }
                        disabled={
                          processingId === item.id
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && queue.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-3 py-12 text-center text-slate-500"
                  >
                    Tidak ada dokumen dalam antrean
                    verifikasi.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-3 py-12 text-center text-slate-500"
                  >
                    Memuat antrean dokumen...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectDialogOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              Tolak Dokumen
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Dokumen:
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {selectedItem.judul}
            </p>

            <form
              onSubmit={handleReject}
              className="mt-6"
            >
              <label
                htmlFor="revision-note"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Catatan revisi
                <span className="ml-1 text-red-600">
                  *
                </span>
              </label>

              <textarea
                id="revision-note"
                value={revisionNote}
                onChange={(event) =>
                  setRevisionNote(
                    event.target.value,
                  )
                }
                rows="6"
                placeholder="Contoh: Lampirkan surat tugas, kontrak penelitian, dan bukti keterlibatan mahasiswa."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                required
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRejectDialog}
                  disabled={Boolean(processingId)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    Boolean(processingId) ||
                    !revisionNote.trim()
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {processingId
                    ? "Menyimpan..."
                    : "Tolak dan Kirim Catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  title,
  value,
  description,
}) {
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

function TableHeading({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-3 py-3 text-sm font-semibold text-slate-600 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

export default GpmDashboard;