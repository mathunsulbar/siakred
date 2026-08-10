import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import PpeppCharts from "./PpeppCharts";

const BUCKET_NAME = "bukti-akreditasi";

function GpmDashboard({ canDeleteAll = false }) {
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
  const [deletingId, setDeletingId] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "status",
    direction: "asc",
  });
  const [detailItem, setDetailItem] = useState(null);
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
            semester,
            tahun_akademik,
            ketua_kegiatan,
            ketua_identitas,
            anggota_dosen,
            mahasiswa_terlibat,
            anggota_dosen_data,
            mahasiswa_data,
            sumber_dana,
            jumlah_dana,
            jenis_indikator,
            kode_indikator,
            link_bukti,
            dokumen_bukti_path,
            status_gpm,
            catatan_revisi_gpm,
            created_at
        `)
        .order("created_at", {
            ascending: false,
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
            semester,
            tahun_akademik,
            ketua_kegiatan,
            ketua_identitas,
            anggota_dosen,
            mahasiswa_terlibat,
            anggota_dosen_data,
            mahasiswa_data,
            nama_jurnal_penerbit,
            volume_nomor,
            doi_url,
            nomor_hki_isbn,
            sumber_dana,
            jumlah_dana,
            jenis_indikator,
            kode_indikator,
            link_bukti,
            dokumen_bukti_path,
            status_gpm,
            catatan_revisi_gpm,
            created_at
        `)
        .order("created_at", {
            ascending: false,
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
          sourceTable: "kegiatan_tridarma",
          sourceLabel: "Kegiatan",
          dosenId: item.dosen_id,
          namaDosen:
            profilesById[item.dosen_id]
              ?.nama_lengkap ||
            "Nama dosen belum tersedia",
          nidnNip:
            profilesById[item.dosen_id]
              ?.nidn_nip ||
            null,
          jenisKegiatan: item.jenis_kegiatan,
          jenisLuaran: null,
          judul: item.judul,
          tahun: item.tahun,
          semester: item.semester ?? "",
          tahunAkademik:
            item.tahun_akademik ?? "",
          ketuaKegiatan:
            item.ketua_kegiatan ?? "",
          ketuaIdentitas:
            item.ketua_identitas ?? "",
          anggotaDosen: formatPeopleData(
            item.anggota_dosen_data,
            item.anggota_dosen,
            "identitas",
          ),
          mahasiswaTerlibat:
            formatPeopleData(
              item.mahasiswa_data,
              item.mahasiswa_terlibat,
              "nim",
            ),
          sumberDana:
            item.sumber_dana ?? "",
          jumlahDana:
            Number(item.jumlah_dana ?? 0),
          namaJurnalPenerbit: "",
          volumeNomor: "",
          doiUrl: "",
          nomorHkiIsbn: "",
          jenisIndikator:
            item.jenis_indikator ?? "",
          kodeIndikator:
            item.kode_indikator ?? "",
          linkBukti:
            item.link_bukti ?? null,
          dokumenBuktiPath:
            item.dokumen_bukti_path ?? null,
          status: item.status_gpm,
          catatanRevisi:
            item.catatan_revisi_gpm ?? "",
          createdAt: item.created_at,
        }));

      const outputItems =
        (luaranQueue.data ?? []).map((item) => ({
          id: item.id,
          sourceTable:
            "publikasi_dan_luaran",
          sourceLabel: "Luaran",
          dosenId: item.dosen_id,
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
          tahun: item.tahun,
          semester: item.semester ?? "",
          tahunAkademik:
            item.tahun_akademik ?? "",
          ketuaKegiatan:
            item.ketua_kegiatan ?? "",
          ketuaIdentitas:
            item.ketua_identitas ?? "",
          anggotaDosen: formatPeopleData(
            item.anggota_dosen_data,
            item.anggota_dosen,
            "identitas",
          ),
          mahasiswaTerlibat:
            formatPeopleData(
              item.mahasiswa_data,
              item.mahasiswa_terlibat,
              "nim",
            ),
          sumberDana:
            item.sumber_dana ?? "",
          jumlahDana:
            Number(item.jumlah_dana ?? 0),
          namaJurnalPenerbit:
            item.nama_jurnal_penerbit ?? "",
          volumeNomor:
            item.volume_nomor ?? "",
          doiUrl: item.doi_url ?? "",
          nomorHkiIsbn:
            item.nomor_hki_isbn ?? "",
          jenisIndikator:
            item.jenis_indikator ?? "",
          kodeIndikator:
            item.kode_indikator ?? "",
          linkBukti:
            item.link_bukti ?? null,
          dokumenBuktiPath:
            item.dokumen_bukti_path ?? null,
          status: item.status_gpm,
          catatanRevisi:
            item.catatan_revisi_gpm ?? "",
          createdAt: item.created_at,
        }));

      setQueue([
        ...activityItems,
        ...outputItems,
      ]);

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


  const filteredQueue = useMemo(() => {
    const keyword =
      searchText.trim().toLowerCase();

    if (!keyword) {
      return queue;
    }

    return queue.filter((item) => {
      const searchableText = [
        item.namaDosen,
        item.nidnNip,
        item.sourceLabel,
        item.jenisKegiatan,
        item.jenisLuaran,
        item.judul,
        item.tahun,
        item.semester,
        item.tahunAkademik,
        item.ketuaKegiatan,
        item.ketuaIdentitas,
        item.anggotaDosen,
        item.mahasiswaTerlibat,
        item.sumberDana,
        item.jenisIndikator,
        item.kodeIndikator,
        item.status,
        item.catatanRevisi,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined,
        )
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [queue, searchText]);

  const sortedQueue = useMemo(() => {
    const statusOrder = {
      pending: 0,
      rejected: 1,
      approved: 2,
    };

    function getSortValue(item, key) {
      switch (key) {
        case "namaDosen":
          return item.namaDosen ?? "";
        case "jenis":
          return [
            item.sourceLabel,
            item.jenisKegiatan,
            item.jenisLuaran,
          ]
            .filter(Boolean)
            .join(" ");
        case "judul":
          return item.judul ?? "";
        case "tahun":
          return Number(item.tahun ?? 0);
        case "indikator":
          return [
            item.jenisIndikator,
            item.kodeIndikator,
          ]
            .filter(Boolean)
            .join(" ");
        case "createdAt":
          return item.createdAt
            ? new Date(
                item.createdAt,
              ).getTime()
            : 0;
        case "status":
          return statusOrder[item.status] ?? 9;
        default:
          return "";
      }
    }

    return [...filteredQueue].sort(
      (first, second) => {
        const firstValue = getSortValue(
          first,
          sortConfig.key,
        );
        const secondValue = getSortValue(
          second,
          sortConfig.key,
        );

        let comparison = 0;

        if (
          typeof firstValue === "number" &&
          typeof secondValue === "number"
        ) {
          comparison =
            firstValue - secondValue;
        } else {
          comparison = String(
            firstValue,
          ).localeCompare(
            String(secondValue),
            "id-ID",
            {
              sensitivity: "base",
              numeric: true,
            },
          );
        }

        if (
          comparison === 0 &&
          sortConfig.key === "status"
        ) {
          comparison =
            new Date(
              second.createdAt,
            ).getTime() -
            new Date(
              first.createdAt,
            ).getTime();
        }

        return sortConfig.direction === "asc"
          ? comparison
          : comparison * -1;
      },
    );
  }, [filteredQueue, sortConfig]);

  function handleSort(key) {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction:
            current.direction === "asc"
              ? "desc"
              : "asc",
        };
      }

      return {
        key,
        direction:
          key === "tahun" ||
          key === "createdAt"
            ? "desc"
            : "asc",
      };
    });

    setCurrentPage(1);
  }

  const numericPageSize =
    pageSize === "all"
      ? Math.max(sortedQueue.length, 1)
      : Number(pageSize);

  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(
          1,
          Math.ceil(
            sortedQueue.length /
              numericPageSize,
          ),
        );

  const safeCurrentPage =
    Math.min(currentPage, totalPages);

  const paginatedQueue =
    pageSize === "all"
      ? sortedQueue
      : sortedQueue.slice(
          (safeCurrentPage - 1) *
            numericPageSize,
          safeCurrentPage *
            numericPageSize,
        );

  const firstVisibleNumber =
    sortedQueue.length === 0
      ? 0
      : pageSize === "all"
        ? 1
        : (safeCurrentPage - 1) *
            numericPageSize +
          1;

  const lastVisibleNumber =
    pageSize === "all"
      ? sortedQueue.length
      : Math.min(
          safeCurrentPage *
            numericPageSize,
          sortedQueue.length,
        );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function getItemKey(item) {
    return `${item.sourceTable}:${item.id}`;
  }

  function toggleItemSelection(item) {
    const key = getItemKey(item);

    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function toggleSelectAll() {
    const pageKeys =
      paginatedQueue.map(getItemKey);

    const allSelected =
      pageKeys.length > 0 &&
      pageKeys.every((key) =>
        selectedKeys.has(key),
      );

    setSelectedKeys((current) => {
      const next = new Set(current);

      if (allSelected) {
        pageKeys.forEach((key) =>
          next.delete(key),
        );
      } else {
        pageKeys.forEach((key) =>
          next.add(key),
        );
      }

      return next;
    });
  }

  async function handleDeleteSelected() {
    if (!canDeleteAll) {
      return;
    }

    const selectedItems = queue.filter((item) =>
      selectedKeys.has(getItemKey(item)),
    );

    if (selectedItems.length === 0) {
      return;
    }

    const approvedCount =
      selectedItems.filter(
        (item) => item.status === "approved",
      ).length;

    const firstConfirmation = window.confirm(
      `Hapus permanen ${selectedItems.length} data terpilih?\n\nTindakan ini tidak dapat dibatalkan.`,
    );

    if (!firstConfirmation) {
      return;
    }

    if (approvedCount > 0) {
      const secondConfirmation = window.confirm(
        `${approvedCount} data terpilih sudah berstatus DISETUJUI GPM.\n\nApakah Anda benar-benar yakin ingin menghapus seluruh data terpilih secara permanen?`,
      );

      if (!secondConfirmation) {
        return;
      }
    }

    try {
      setDeletingId("bulk");
      setErrorMessage("");
      setSuccessMessage("");

      const kegiatanIds = selectedItems
        .filter(
          (item) =>
            item.sourceTable ===
            "kegiatan_tridarma",
        )
        .map((item) => item.id);

      const luaranIds = selectedItems
        .filter(
          (item) =>
            item.sourceTable ===
            "publikasi_dan_luaran",
        )
        .map((item) => item.id);

      if (kegiatanIds.length > 0) {
        const { error } = await supabase
          .from("kegiatan_tridarma")
          .delete()
          .in("id", kegiatanIds);

        if (error) {
          throw error;
        }
      }

      if (luaranIds.length > 0) {
        const { error } = await supabase
          .from("publikasi_dan_luaran")
          .delete()
          .in("id", luaranIds);

        if (error) {
          throw error;
        }
      }

      const evidencePaths = selectedItems
        .map((item) => item.dokumenBuktiPath)
        .filter(Boolean);

      if (evidencePaths.length > 0) {
        const { error: storageError } =
          await supabase.storage
            .from(BUCKET_NAME)
            .remove(evidencePaths);

        if (storageError) {
          console.error(
            "Sebagian file bukti belum berhasil dihapus:",
            storageError,
          );
        }
      }

      setSelectedKeys(new Set());

      setSuccessMessage(
        `${selectedItems.length} data berhasil dihapus secara permanen oleh GPM.`,
      );

      await loadDashboardData();
    } catch (error) {
      console.error(
        "Gagal menghapus data terpilih:",
        error,
      );

      if (error.code === "23503") {
        setErrorMessage(
          "Sebagian data belum dapat dihapus karena masih direferensikan oleh data atau log lain.",
        );
      } else if (
        error.message?.includes(
          "row-level security",
        )
      ) {
        setErrorMessage(
          "Hak hapus GPM belum diizinkan oleh RLS Supabase.",
        );
      } else {
        setErrorMessage(
          error.message ||
            "Data terpilih gagal dihapus.",
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function removeEvidence(filePath) {
    if (!filePath) {
      return;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error(
        "File bukti belum berhasil dihapus:",
        error,
      );
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
      setDetailItem(null);

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
      setDetailItem(null);
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8F1024]">
            Quality Assurance
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Verifikasi Dokumen GPM
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Periksa detail, bukti, status, dan keputusan verifikasi data penelitian, PkM, serta luaran.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#8F1024]/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#8F1024] disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
        >
          <RefreshIcon />
          {loading
            ? "Memuat..."
            : "Perbarui data"}
        </button>
      </div>

      {errorMessage && <InlineNotice type="error">{errorMessage}</InlineNotice>}
      {successMessage && <InlineNotice type="success">{successMessage}</InlineNotice>}

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

      <div className="relative overflow-hidden rounded-3xl border border-[#8F1024]/15 bg-white p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A]" />
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900">
            Kelola Dokumen GPM
          </h3>

          {canDeleteAll ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {selectedKeys.size > 0
                  ? `${selectedKeys.size} data dipilih`
                  : "Centang data yang ingin dihapus."}
              </p>

              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={
                  selectedKeys.size === 0 ||
                  deletingId === "bulk"
                }
                aria-label="Hapus data terpilih"
                title="Hapus data terpilih"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingId === "bulk" ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-25"
                    />
                    <path
                      d="M21 12a9 9 0 0 1-9 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
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
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Klik judul untuk membuka detail dan melakukan verifikasi.
            </p>
          )}
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl border border-[#8F1024]/15 bg-[#FFF6F7] p-4 md:grid-cols-[180px_1fr] md:items-end">
          <div>
            <label
              htmlFor="gpm-page-size"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Tampilkan
            </label>

            <select
              id="gpm-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/10"
            >
              <option value="10">10 data</option>
              <option value="20">20 data</option>
              <option value="30">30 data</option>
              <option value="50">50 data</option>
              <option value="all">Semua data</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="gpm-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Pencarian
            </label>

            <input
              id="gpm-search"
              type="search"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari dosen, judul, jenis, indikator, status, atau tahun..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1110px] table-fixed border-collapse">
            <colgroup>
              {canDeleteAll && (
                <col className="w-[44px]" />
              )}
              <col className="w-[44px]" />
              <col className="w-[125px]" />
              <col className="w-[110px]" />
              <col className="w-[300px]" />
              <col className="w-[65px]" />
              <col className="w-[105px]" />
              <col className="w-[120px]" />
              <col className="w-[95px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead className="bg-[#FFF6F7]">
              <tr className="border-b border-[#8F1024]/15 text-left">
                {canDeleteAll && (
                  <th className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedQueue.length > 0 &&
                        paginatedQueue.every(
                          (item) =>
                            selectedKeys.has(
                              getItemKey(item),
                            ),
                        )
                      }
                      onChange={toggleSelectAll}
                      aria-label="Pilih semua data pada halaman ini"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#A30E2D]"
                    />
                  </th>
                )}

                <TableHeading>No</TableHeading>

                <SortableTableHeading
                  sortKey="namaDosen"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Dosen
                </SortableTableHeading>

                <SortableTableHeading
                  sortKey="jenis"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Jenis
                </SortableTableHeading>

                <SortableTableHeading
                  sortKey="judul"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Judul
                </SortableTableHeading>

                <SortableTableHeading
                  sortKey="tahun"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Tahun
                </SortableTableHeading>

                <SortableTableHeading
                  sortKey="indikator"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Indikator
                </SortableTableHeading>

                <TableHeading>Bukti</TableHeading>

                <SortableTableHeading
                  sortKey="createdAt"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Dikirim
                </SortableTableHeading>

                <SortableTableHeading
                  sortKey="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Status
                </SortableTableHeading>
              </tr>
            </thead>

            <tbody>
              {paginatedQueue.map(
                (item, rowIndex) => (
                  <tr
                    key={`${item.sourceTable}-${item.id}`}
                    className={`border-b border-slate-100 align-top ${
                      canDeleteAll &&
                      selectedKeys.has(
                        getItemKey(item),
                      )
                        ? "bg-rose-50/50"
                        : "hover:bg-[#FFF6F7]"
                    }`}
                  >
                    {canDeleteAll && (
                      <td className="px-2 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(
                            getItemKey(item),
                          )}
                          onChange={() =>
                            toggleItemSelection(item)
                          }
                          aria-label={`Pilih ${item.judul}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#A30E2D]"
                        />
                      </td>
                    )}

                    <td className="whitespace-nowrap px-2 py-4 text-sm font-medium text-slate-600">
                      {pageSize === "all"
                        ? rowIndex + 1
                        : (safeCurrentPage - 1) *
                            numericPageSize +
                          rowIndex +
                          1}
                    </td>

                    <td className="px-2 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.namaDosen}
                      </p>

                      {item.nidnNip && (
                        <p className="mt-1 text-xs text-slate-500">
                          {item.nidnNip}
                        </p>
                      )}
                    </td>

                    <td className="px-2 py-4">
                      <span className="inline-flex rounded-full border border-[#881337]/20 bg-[#881337]/5 px-3 py-1 text-xs font-semibold text-[#881337]">
                        {item.sourceLabel}
                      </span>

                      <p className="mt-2 text-sm text-slate-600">
                        {formatActivityType(
                          item.jenisKegiatan,
                        )}
                      </p>
                    </td>

                    <td className="px-2 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setDetailItem(item)
                        }
                        className="break-words text-left font-semibold leading-6 text-slate-900 transition hover:text-[#A30E2D] hover:underline"
                        title="Klik untuk melihat detail verifikasi"
                      >
                        {item.judul}
                      </button>

                      {item.jenisLuaran && (
                        <p className="mt-2 text-sm text-slate-500">
                          Luaran:{" "}
                          {item.jenisLuaran}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-2 py-4 text-sm text-slate-700">
                      {item.tahun || "-"}
                    </td>

                    <td className="px-2 py-4">
                      {item.jenisIndikator ? (
                        <>
                          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {item.jenisIndikator}
                          </span>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.kodeIndikator ||
                              "Tanpa kode"}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Belum ditentukan
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-4">
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
                            openEvidence(
                              item.dokumenBuktiPath,
                            )
                          }
                          disabled={
                            openingFile ===
                            item.dokumenBuktiPath
                          }
                          className="rounded-lg border border-[#881337]/20 bg-[#881337]/5 px-3 py-2 text-sm font-semibold text-[#881337] hover:bg-[#FFF1F2] disabled:opacity-50"
                        >
                          {openingFile ===
                          item.dokumenBuktiPath
                            ? "Membuka..."
                            : "Lihat Bukti"}
                        </button>
                      ) : (
                        <span className="text-sm text-red-600">
                          Belum ada
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-2 py-4 text-sm text-slate-600">
                      {formatDate(
                        item.createdAt,
                      )}
                    </td>

                    <td className="px-2 py-4">
                      <StatusBadge
                        status={item.status}
                      />
                    </td>
                  </tr>
                ),
              )}

              {!loading && sortedQueue.length === 0 && (
                <tr>
                  <td colSpan={canDeleteAll ? 10 : 9} className="px-4 py-8">
                    <TableEmptyState
                      title={searchText.trim() ? "Data tidak ditemukan" : "Belum ada antrean verifikasi"}
                      description={searchText.trim() ? "Coba kata kunci lain atau hapus pencarian." : "Dokumen baru dari Dosen akan muncul otomatis di halaman ini."}
                      actionLabel={searchText.trim() ? "Hapus Pencarian" : null}
                      onAction={searchText.trim() ? () => setSearchText("") : null}
                    />
                  </td>
                </tr>
              )}

              {loading && (
                <LoadingTableRows colSpan={canDeleteAll ? 10 : 9} rows={4} />
              )}
            </tbody>
          </table>
        </div>

        {!loading && sortedQueue.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Menampilkan {firstVisibleNumber}–{lastVisibleNumber} dari{" "}
              {sortedQueue.length} data
            </p>

            {pageSize !== "all" && totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() =>
                      setCurrentPage(pageNumber)
                    }
                    className={`min-w-9 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      pageNumber === safeCurrentPage
                        ? "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] text-white shadow-sm"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-[#FFF1F2] hover:text-[#881337]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1,
                      ),
                    )
                  }
                  disabled={
                    safeCurrentPage === totalPages
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {detailItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[2px] sm:p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-[#8F1024]/15 bg-white/95 backdrop-blur">
              <div className="h-1 bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A]" />
              <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#881337]/20 bg-[#881337]/5 px-3 py-1 text-xs font-semibold text-[#881337]">
                    {detailItem.sourceLabel}
                  </span>

                  <StatusBadge
                    status={detailItem.status}
                  />
                </div>

                <h3 className="mt-3 text-2xl font-bold text-slate-900">
                  Detail Verifikasi Dokumen
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Periksa detail data dan bukti sebelum mengambil keputusan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailItem(null)
                }
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#8F1024]/15 text-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Tutup detail"
                title="Tutup"
              >
                ×
              </button>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              <div className="relative overflow-hidden rounded-2xl border border-[#8F1024]/15 bg-[#FFF6F7] p-5">
                <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-[#C5163A] via-[#8F1024] to-[#5B000A]" />

                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Judul Dokumen
                </p>

                <p className="mt-2 text-lg font-bold leading-7 text-slate-950 sm:text-xl">
                  {detailItem.judul}
                </p>
              </div>

              <DetailSectionTitle
                title="Informasi Umum"
                description="Identitas penginput, jenis data, periode, pendanaan, dan indikator."
              />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label="Dosen penginput"
                  value={detailItem.namaDosen}
                  subvalue={detailItem.nidnNip}
                />

                <DetailField
                  label="Jenis data"
                  value={
                    detailItem.sourceLabel
                  }
                  subvalue={
                    detailItem.jenisLuaran
                      ? `${formatActivityType(
                          detailItem.jenisKegiatan,
                        )} • ${detailItem.jenisLuaran}`
                      : formatActivityType(
                          detailItem.jenisKegiatan,
                        )
                  }
                />

                <DetailField
                  label="Tahun"
                  value={
                    detailItem.tahun || "-"
                  }
                  subvalue={[
                    formatSemester(
                      detailItem.semester,
                    ),
                    detailItem.tahunAkademik,
                  ]
                    .filter(
                      (value) =>
                        value &&
                        value !== "-",
                    )
                    .join(" • ")}
                />

                <DetailField
                  label="Ketua kegiatan"
                  value={
                    detailItem.ketuaKegiatan ||
                    "-"
                  }
                  subvalue={
                    detailItem.ketuaIdentitas
                      ? `NIDN/NUPTK/NIP: ${detailItem.ketuaIdentitas}`
                      : ""
                  }
                />

                <DetailField
                  label="Sumber dana"
                  value={
                    detailItem.sumberDana ||
                    "-"
                  }
                  subvalue={
                    Number(
                      detailItem.jumlahDana,
                    ) > 0
                      ? formatRupiah(
                          detailItem.jumlahDana,
                        )
                      : ""
                  }
                />

                <DetailField
                  label="Indikator"
                  value={
                    detailItem.jenisIndikator ||
                    "-"
                  }
                  subvalue={
                    detailItem.kodeIndikator ||
                    ""
                  }
                />
              </div>

              <DetailSectionTitle
                title="Pelaksana"
                description="Dosen dan mahasiswa yang tercatat pada kegiatan."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <DetailTextBlock
                  label="Anggota dosen"
                  value={
                    detailItem.anggotaDosen ||
                    "-"
                  }
                />

                <DetailTextBlock
                  label="Mahasiswa terlibat"
                  value={
                    detailItem.mahasiswaTerlibat ||
                    "-"
                  }
                />
              </div>

              {detailItem.sourceTable ===
                "publikasi_dan_luaran" && (
                <div className="rounded-2xl border border-[#8F1024]/15 p-5">
                  <DetailSectionTitle
                    title="Detail Publikasi / Luaran"
                    description="Informasi bibliografis dan identitas luaran."
                    compact
                  />

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <DetailField
                      label="Nama jurnal atau penerbit"
                      value={
                        detailItem.namaJurnalPenerbit ||
                        "-"
                      }
                    />

                    <DetailField
                      label="Volume dan nomor"
                      value={
                        detailItem.volumeNomor ||
                        "-"
                      }
                    />

                    <DetailField
                      label="DOI atau URL"
                      value={
                        detailItem.doiUrl ||
                        "-"
                      }
                    />

                    <DetailField
                      label="Nomor HKI, paten, atau ISBN"
                      value={
                        detailItem.nomorHkiIsbn ||
                        "-"
                      }
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[#8F1024]/15 p-5">
                <DetailSectionTitle
                  title="Bukti & Verifikasi"
                  description="Buka bukti pendukung dan lihat status pemeriksaan."
                  compact
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  {detailItem.linkBukti ? (
                    <a
                      href={
                        detailItem.linkBukti
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                    >
                      Buka Link Bukti
                    </a>
                  ) : (
                    <span className="rounded-xl border border-[#8F1024]/15 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Link bukti belum tersedia
                    </span>
                  )}

                  {detailItem.dokumenBuktiPath && (
                    <button
                      type="button"
                      onClick={() =>
                        openEvidence(
                          detailItem.dokumenBuktiPath,
                        )
                      }
                      disabled={
                        openingFile ===
                        detailItem.dokumenBuktiPath
                      }
                      className="rounded-xl border border-[#881337]/20 bg-[#881337]/5 px-4 py-3 text-sm font-semibold text-[#881337] transition hover:bg-[#FFF1F2] disabled:opacity-50"
                    >
                      {openingFile ===
                      detailItem.dokumenBuktiPath
                        ? "Membuka..."
                        : "Buka Dokumen Tambahan"}
                    </button>
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DetailField
                    label="Tanggal dikirim"
                    value={formatDate(
                      detailItem.createdAt,
                    )}
                  />

                  <DetailField
                    label="Status GPM"
                    value={getStatusLabel(
                      detailItem.status,
                    )}
                  />
                </div>

                {detailItem.catatanRevisi && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                      Catatan revisi GPM
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-700">
                      {detailItem.catatanRevisi}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-[#8F1024]/15 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {detailItem.status ===
                "pending"
                  ? "Pastikan data dan bukti telah diperiksa sebelum mengambil keputusan."
                  : `Status saat ini: ${getStatusLabel(
                      detailItem.status,
                    )}.`}
              </p>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDetailItem(null)
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Tutup
                </button>

                {detailItem.status ===
                  "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        openRejectDialog(
                          detailItem,
                        )
                      }
                      disabled={
                        processingId ===
                        detailItem.id
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Tolak
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleApprove(
                          detailItem,
                        )
                      }
                      disabled={
                        processingId ===
                        detailItem.id
                      }
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      {processingId ===
                      detailItem.id
                        ? "Memproses..."
                        : "Setujui"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectDialogOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#8F1024]/15 bg-white shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-red-500 to-[#9F1239]" />
            <div className="p-6">
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]"
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
        </div>
      )}
    </section>
  );
}

function SortableTableHeading({
  children,
  sortKey,
  sortConfig,
  onSort,
}) {
  const isActive =
    sortConfig?.key === sortKey;

  const symbol = isActive
    ? sortConfig.direction === "asc"
      ? "▲"
      : "▼"
    : "↕";

  return (
    <th className="px-2 py-3 text-left text-sm font-semibold text-slate-600">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 transition hover:text-[#881337]"
        title={`Urutkan berdasarkan ${children}`}
      >
        <span>{children}</span>
        <span
          className={
            isActive
              ? "text-[#881337]"
              : "text-slate-300"
          }
        >
          {symbol}
        </span>
      </button>
    </th>
  );
}

function DetailSectionTitle({
  title,
  description,
  compact = false,
}) {
  return (
    <div className={compact ? "" : "pt-1"}>
      <div className="flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-[#9F1239]" />
        <h4 className="font-black text-slate-900">
          {title}
        </h4>
      </div>

      {description && (
        <p className="mt-1 pl-3 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  subvalue = "",
}) {
  return (
    <div className="rounded-xl border border-[#8F1024]/15 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-slate-900">
        {value || "-"}
      </p>

      {subvalue && (
        <p className="mt-1 text-sm text-slate-500">
          {subvalue}
        </p>
      )}
    </div>
  );
}

function DetailTextBlock({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-[#8F1024]/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value || "-"}
      </p>
    </div>
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

function SummaryCard({
  title,
  value,
  description,
}) {
  const tone =
    title === "Disetujui"
      ? "green"
      : title === "Perlu revisi"
        ? "red"
        : title === "Antrean verifikasi"
          ? "amber"
          : "brand";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#8F1024]/15 bg-gradient-to-br from-[#FFF7F7] to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          tone === "green"
            ? "bg-green-500"
            : tone === "red"
              ? "bg-red-500"
              : tone === "amber"
                ? "bg-amber-500"
                : "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A]"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            tone === "green"
              ? "bg-green-50 text-green-700"
              : tone === "red"
                ? "bg-red-50 text-red-700"
                : tone === "amber"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-[#FFF1F2] text-[#8F1024]"
          }`}
        >
          <SummaryIcon tone={tone} />
        </span>
      </div>
    </article>
  );
}

function SummaryIcon({ tone }) {
  const className = "h-5 w-5";

  if (tone === "green") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (tone === "red") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }

  if (tone === "amber") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19V3" />
    </svg>
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

function TableHeading({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-2 py-3 text-sm font-semibold text-slate-600 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
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

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] ??
        "border-[#8F1024]/15 bg-slate-50 text-slate-600"
      }`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pending",
    approved: "Disetujui",
    rejected: "Perlu revisi",
  };

  return labels[status] ?? status ?? "-";
}

function formatActivityType(value) {
  if (value === "pkm") {
    return "Pengabdian kepada Masyarakat";
  }

  if (value === "penelitian") {
    return "Penelitian";
  }

  return value || "-";
}

function formatSemester(value) {
  if (value === "ganjil") {
    return "Ganjil";
  }

  if (value === "genap") {
    return "Genap";
  }

  return "-";
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatPeopleData(
  structuredData,
  legacyText,
  idField,
) {
  if (
    Array.isArray(structuredData) &&
    structuredData.length > 0
  ) {
    const rows = structuredData
      .map((person) => {
        const nama = String(
          person?.nama ?? "",
        ).trim();

        const id = String(
          person?.[idField] ?? "",
        ).trim();

        if (!nama && !id) {
          return "";
        }

        if (nama && id) {
          return `${nama} (${id})`;
        }

        return nama || id;
      })
      .filter(Boolean);

    if (rows.length > 0) {
      return rows.join("\n");
    }
  }

  return String(
    legacyText ?? "",
  ).trim();
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));
}

export default GpmDashboard;