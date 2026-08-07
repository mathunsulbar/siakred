import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const BUCKET_NAME = "bukti-akreditasi";
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const EXCEL_TEMPLATE_FILE_NAME =
  "Template_Import_Publikasi_dan_Luaran.xlsx";

const EXCEL_TEMPLATE_HEADERS = [
  "Asal Kegiatan",
  "Jenis Luaran",
  "Judul Publikasi atau Luaran",
  "Ketua Kegiatan",
  "Semester",
  "Anggota Dosen",
  "Mahasiswa Terlibat",
  "Tahun Akademik",
  "Tahun Terbit",
  "Nama Jurnal atau Penerbit",
  "Volume dan Nomor",
  "DOI atau URL",
  "Nomor HKI/Paten/ISBN",
  "Jenis Indikator",
  "Kode Indikator",
  "Link Bukti",
];


const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function createInitialForm() {
  return {
    jenis_kegiatan: "penelitian",
    jenis_luaran: "Artikel Jurnal",
    judul_luaran: "",
    tahun: new Date().getFullYear(),

    ketua_kegiatan: "",
    anggota_dosen: "",
    mahasiswa_terlibat: "",
    semester: "ganjil",
    tahun_akademik: getDefaultAcademicYear(),

    nama_jurnal_penerbit: "",
    volume_nomor: "",
    doi_url: "",
    nomor_hki_isbn: "",
    jenis_indikator: "",
    kode_indikator: "",
    link_bukti: "",
  };
}

function LuaranDashboard({ userId }) {
  const [form, setForm] = useState(createInitialForm());
  const [outputs, setOutputs] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [existingEvidencePath, setExistingEvidencePath] =
    useState(null);

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingFile, setOpeningFile] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [importPreview, setImportPreview] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importInputKey, setImportInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importMessageType, setImportMessageType] =
    useState("");

  const loadOutputs = useCallback(async () => {
    try {
      setLoadingData(true);

      const { data, error } = await supabase
        .from("publikasi_dan_luaran")
        .select(`
            id,
            jenis_kegiatan,
            jenis_luaran,
            judul_luaran,
            tahun,
            ketua_kegiatan,
            anggota_dosen,
            mahasiswa_terlibat,
            semester,
            tahun_akademik,
            nama_jurnal_penerbit,
            volume_nomor,
            doi_url,
            nomor_hki_isbn,
            jenis_indikator,
            kode_indikator,
            link_bukti,
            dokumen_bukti_path,
            status_gpm,
            catatan_revisi_gpm,
            created_at,
            updated_at
            `)
        .eq("dosen_id", userId)
        .order("created_at", {
            ascending: false,
        });

      if (error) {
        throw error;
      }

      setOutputs(data ?? []);
    } catch (error) {
      console.error("Gagal membaca luaran:", error);

      setMessageType("error");
      setMessage(
        error.message ||
          "Data publikasi dan luaran belum dapat dimuat.",
      );
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadOutputs();
  }, [loadOutputs]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function downloadExcelTemplate() {
    const currentYear = new Date().getFullYear();
    const academicYear = getDefaultAcademicYear();

    const sampleRows = [
      {
        "Asal Kegiatan": "Penelitian",
        "Jenis Luaran": "Artikel Jurnal",
        "Judul Publikasi atau Luaran":
          "Pemodelan Matematika untuk Prediksi Risiko Banjir Perkotaan",
        "Ketua Kegiatan": "Andi Rahman",
        Semester: "Ganjil",
        "Anggota Dosen":
          "Siti Aminah|0123456789; Muhammad Arif|9876543210",
        "Mahasiswa Terlibat":
          "Nurul Hikmah|H0221001; Ahmad Fadli|H0221002",
        "Tahun Akademik": academicYear,
        "Tahun Terbit": currentYear,
        "Nama Jurnal atau Penerbit":
          "Jurnal Matematika dan Aplikasinya",
        "Volume dan Nomor": "Vol. 8 No. 2",
        "DOI atau URL": "https://doi.org/10.0000/contoh.001",
        "Nomor HKI/Paten/ISBN": "",
        "Jenis Indikator": "IKU",
        "Kode Indikator": "IKU-PEN-02",
        "Link Bukti": "https://drive.google.com/",
      },
      {
        "Asal Kegiatan": "PkM",
        "Jenis Luaran": "HKI",
        "Judul Publikasi atau Luaran":
          "Modul Pembelajaran Statistika Dasar untuk Guru Sekolah Menengah",
        "Ketua Kegiatan": "Siti Aminah",
        Semester: "Genap",
        "Anggota Dosen": "Andi Rahman|0123456789",
        "Mahasiswa Terlibat": "Rahmawati|H0221003",
        "Tahun Akademik": academicYear,
        "Tahun Terbit": currentYear,
        "Nama Jurnal atau Penerbit": "Direktorat Jenderal Kekayaan Intelektual",
        "Volume dan Nomor": "",
        "DOI atau URL": "",
        "Nomor HKI/Paten/ISBN": "EC00202600001",
        "Jenis Indikator": "IKT",
        "Kode Indikator": "IKT-PKM-02",
        "Link Bukti": "https://drive.google.com/",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(
      sampleRows,
      {
        header: EXCEL_TEMPLATE_HEADERS,
      },
    );

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 55 },
      { wch: 28 },
      { wch: 12 },
      { wch: 55 },
      { wch: 55 },
      { wch: 18 },
      { wch: 14 },
      { wch: 40 },
      { wch: 20 },
      { wch: 42 },
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 45 },
    ];

    worksheet["!autofilter"] = {
      ref: `A1:P${sampleRows.length + 1}`,
    };

    const guideRows = [
      ["PETUNJUK IMPORT PUBLIKASI DAN LUARAN"],
      ["1. Jangan mengubah nama kolom pada sheet Publikasi dan Luaran."],
      ["2. Asal Kegiatan diisi Penelitian atau PkM."],
      ["3. Jenis Luaran mengikuti pilihan pada formulir SIAKRED."],
      ["4. Semester diisi Ganjil atau Genap."],
      ["5. Format Tahun Akademik: 2026/2027."],
      ["6. Anggota Dosen dapat ditulis Nama|NIDN/NUPTK/NIP; Nama|NIDN/NUPTK/NIP."],
      ["7. Mahasiswa dapat ditulis Nama|NIM; Nama|NIM."],
      ["8. Link Bukti wajib diawali http:// atau https://."],
      ["9. Dokumen bukti tidak diimpor. Gunakan Link Bukti untuk bukti yang dapat diakses reviewer."],
      [`10. Maksimal ${MAX_IMPORT_ROWS} baris dalam satu kali import.`],
      ["11. Hapus dua baris contoh sebelum mengisi data resmi."],
    ];

    const guideSheet =
      XLSX.utils.aoa_to_sheet(guideRows);

    guideSheet["!cols"] = [{ wch: 115 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Publikasi dan Luaran",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      guideSheet,
      "Petunjuk",
    );

    XLSX.writeFile(
      workbook,
      EXCEL_TEMPLATE_FILE_NAME,
    );
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0] ?? null;

    setImportPreview([]);
    setImportMessage("");
    setImportMessageType("");
    setImportFileName(file?.name ?? "");

    if (!file) {
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      extension !== "xlsx" &&
      extension !== "xls"
    ) {
      setImportMessageType("error");
      setImportMessage(
        "File import harus berformat .xlsx atau .xls.",
      );
      setImportInputKey((current) => current + 1);
      setImportFileName("");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const preferredSheetName =
        workbook.SheetNames.find(
          (sheetName) =>
            normalizeExcelHeader(sheetName) ===
            "publikasidanluaran",
        ) || workbook.SheetNames[0];

      if (!preferredSheetName) {
        throw new Error(
          "Workbook tidak memiliki sheet yang dapat dibaca.",
        );
      }

      const worksheet =
        workbook.Sheets[preferredSheetName];

      const rawRows = XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
          raw: true,
        },
      );

      if (rawRows.length === 0) {
        throw new Error(
          "Sheet publikasi dan luaran tidak memiliki data.",
        );
      }

      if (rawRows.length > MAX_IMPORT_ROWS) {
        throw new Error(
          `Maksimal ${MAX_IMPORT_ROWS} baris dalam satu kali import.`,
        );
      }

      const existingKeys = new Set(
        outputs.map((output) =>
          createOutputDuplicateKey({
            jenis_kegiatan: output.jenis_kegiatan,
            jenis_luaran: output.jenis_luaran,
            tahun: output.tahun,
            judul_luaran: output.judul_luaran,
          }),
        ),
      );

      const fileKeys = new Set();

      const parsedRows = rawRows.map(
        (row, index) => {
          const parsed = validateImportedOutputRow(
            row,
            index + 2,
          );

          const duplicateKey =
            createOutputDuplicateKey(parsed.data);

          const duplicateErrors = [];

          if (
            parsed.valid &&
            existingKeys.has(duplicateKey)
          ) {
            duplicateErrors.push(
              "Publikasi atau luaran dengan asal kegiatan, jenis, tahun, dan judul yang sama sudah tersimpan.",
            );
          }

          if (
            parsed.valid &&
            fileKeys.has(duplicateKey)
          ) {
            duplicateErrors.push(
              "Baris duplikat ditemukan dalam file Excel.",
            );
          }

          if (parsed.valid) {
            fileKeys.add(duplicateKey);
          }

          const errors = [
            ...parsed.errors,
            ...duplicateErrors,
          ];

          return {
            ...parsed,
            errors,
            valid: errors.length === 0,
          };
        },
      );

      setImportPreview(parsedRows);

      const validCount = parsedRows.filter(
        (row) => row.valid,
      ).length;

      const invalidCount =
        parsedRows.length - validCount;

      setImportMessageType(
        invalidCount > 0 ? "warning" : "success",
      );

      setImportMessage(
        `${parsedRows.length} baris dibaca: ${validCount} valid dan ${invalidCount} perlu diperbaiki.`,
      );
    } catch (error) {
      console.error(
        "Gagal membaca Excel publikasi dan luaran:",
        error,
      );

      setImportPreview([]);
      setImportMessageType("error");
      setImportMessage(
        error.message ||
          "File Excel belum dapat dibaca.",
      );
    }
  }

  function clearImportPreview() {
    setImportPreview([]);
    setImportFileName("");
    setImportMessage("");
    setImportMessageType("");
    setImportInputKey((current) => current + 1);
  }

  async function saveImportedOutputs() {
    const validRows = importPreview.filter(
      (row) => row.valid,
    );

    if (validRows.length === 0) {
      setImportMessageType("error");
      setImportMessage(
        "Tidak ada baris valid yang dapat disimpan.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Simpan ${validRows.length} data valid ke SIAKRED dengan status Pending?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setImporting(true);
      setImportMessage("");
      setImportMessageType("");

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const currentUserId =
        userId || authUser?.id;

      if (!currentUserId) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali.",
        );
      }

      const records = validRows.map(({ data }) => ({
        dosen_id: currentUserId,
        jenis_kegiatan: data.jenis_kegiatan,
        jenis_luaran: data.jenis_luaran,
        judul_luaran: data.judul_luaran,
        tahun: data.tahun,
        ketua_kegiatan: data.ketua_kegiatan,
        anggota_dosen: data.anggota_dosen || null,
        mahasiswa_terlibat:
          data.mahasiswa_terlibat || null,
        semester: data.semester,
        tahun_akademik: data.tahun_akademik,
        nama_jurnal_penerbit:
          data.nama_jurnal_penerbit || null,
        volume_nomor: data.volume_nomor || null,
        doi_url: data.doi_url || null,
        nomor_hki_isbn:
          data.nomor_hki_isbn || null,
        jenis_indikator:
          data.jenis_indikator || null,
        kode_indikator:
          data.kode_indikator || null,
        link_bukti: data.link_bukti,
        dokumen_bukti_path: null,
        status_gpm: "pending",
      }));

      const { error } = await supabase
        .from("publikasi_dan_luaran")
        .insert(records);

      if (error) {
        throw error;
      }

      setImportMessageType("success");
      setImportMessage(
        `${records.length} data berhasil diimpor dan dikirim ke GPM dengan status Pending.`,
      );
      setImportPreview([]);
      setImportFileName("");
      setImportInputKey((current) => current + 1);

      await loadOutputs();
    } catch (error) {
      console.error(
        "Gagal menyimpan import publikasi dan luaran:",
        error,
      );

      setImportMessageType("error");

      if (
        error.message?.includes("row-level security")
      ) {
        setImportMessage(
          "Import ditolak oleh sistem keamanan. Pastikan akun memiliki role Dosen.",
        );
      } else {
        setImportMessage(
          error.message ||
            "Data Excel gagal disimpan.",
        );
      }
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;

    setMessage("");
    setMessageType("");

    if (!file) {
      setEvidenceFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setEvidenceFile(null);
      setFileInputKey((current) => current + 1);

      setMessageType("error");
      setMessage(
        "Jenis file tidak didukung. Gunakan PDF, JPG, PNG, Word, atau Excel.",
      );

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setEvidenceFile(null);
      setFileInputKey((current) => current + 1);

      setMessageType("error");
      setMessage("Ukuran file maksimal 6 MB.");

      return;
    }

    setEvidenceFile(file);
  }

  function createSafeFileName(fileName) {
    const lastDot = fileName.lastIndexOf(".");

    const extension =
      lastDot >= 0
        ? fileName.slice(lastDot).toLowerCase()
        : "";

    const baseName =
      lastDot >= 0
        ? fileName.slice(0, lastDot)
        : fileName;

    const safeBaseName = baseName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    return `${safeBaseName || "dokumen"}${extension}`;
  }

  async function uploadEvidence(file) {
    const safeFileName = createSafeFileName(file.name);

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const filePath =
      `${userId}/luaran/${uniqueName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return data.path;
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
        "Dokumen lama belum berhasil dihapus:",
        error,
      );
    }
  }

  async function openEvidence(filePath) {
    if (!filePath) {
      return;
    }

    const previewWindow = window.open(
      "about:blank",
      "_blank",
    );

    if (!previewWindow) {
      setMessageType("error");
      setMessage(
        "Browser memblokir jendela dokumen. Izinkan pop-up untuk situs ini.",
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

      setMessageType("error");
      setMessage(
        error.message ||
          "Dokumen bukti belum dapat dibuka.",
      );
    } finally {
      setOpeningFile(null);
    }
  }

  function resetForm() {
    setForm(createInitialForm());
    setEditingId(null);
    setExistingEvidencePath(null);
    setEvidenceFile(null);
    setFileInputKey((current) => current + 1);
  }

  function handleEdit(output) {
    if (output.status_gpm !== "rejected") {
      return;
    }

    setEditingId(output.id);
    setExistingEvidencePath(
      output.dokumen_bukti_path ?? null,
    );

    setEvidenceFile(null);
    setFileInputKey((current) => current + 1);

    setForm({
        jenis_kegiatan:
            output.jenis_kegiatan ?? "penelitian",

        jenis_luaran:
            output.jenis_luaran ?? "Artikel Jurnal",

        judul_luaran:
            output.judul_luaran ?? "",

        tahun:
            output.tahun ?? new Date().getFullYear(),

        ketua_kegiatan:
            output.ketua_kegiatan ?? "",

        anggota_dosen:
            output.anggota_dosen ?? "",

        mahasiswa_terlibat:
            output.mahasiswa_terlibat ?? "",

        semester:
            output.semester ?? "ganjil",

        tahun_akademik:
            output.tahun_akademik ??
            getDefaultAcademicYear(),

        nama_jurnal_penerbit:
            output.nama_jurnal_penerbit ?? "",

        volume_nomor:
            output.volume_nomor ?? "",

        doi_url:
            output.doi_url ?? "",

        nomor_hki_isbn:
            output.nomor_hki_isbn ?? "",

        jenis_indikator:
            output.jenis_indikator ?? "",

        kode_indikator:
            output.kode_indikator ?? "",

        link_bukti:
            output.link_bukti ?? "",
        });

    setMessage("");
    setMessageType("");

    setTimeout(() => {
      document
        .getElementById("form-luaran")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  function handleCancelEdit() {
    resetForm();
    setMessage("");
    setMessageType("");
  }

  async function handleSubmit(event) {
  event.preventDefault();

    const linkBukti =
        String(form.link_bukti ?? "").trim();

    if (!form.judul_luaran.trim()) {
        setMessageType("error");
        setMessage(
        "Judul publikasi atau luaran wajib diisi.",
        );
        return;
    }

    if (!String(form.ketua_kegiatan ?? "").trim()) {
        setMessageType("error");
        setMessage("Nama ketua kegiatan wajib diisi.");
        return;
        }

        if (!form.semester) {
        setMessageType("error");
        setMessage("Semester wajib dipilih.");
        return;
        }

        const tahunAkademik =
        String(form.tahun_akademik ?? "").trim();

        if (!isValidAcademicYear(tahunAkademik)) {
        setMessageType("error");
        setMessage(
            "Tahun akademik tidak valid. Gunakan format 2026/2027.",
        );
        return;
        }

    if (!linkBukti) {
        setMessageType("error");
        setMessage("Link bukti wajib diisi.");
        return;
    }

    if (!isValidHttpUrl(linkBukti)) {
        setMessageType("error");
        setMessage(
        "Link bukti tidak valid. Gunakan alamat yang diawali http:// atau https://.",
        );
        return;
    }
      
    let newUploadedPath = null;

    try {
      setSaving(true);
      setMessage("");
      setMessageType("");

      if (evidenceFile) {
        newUploadedPath =
          await uploadEvidence(evidenceFile);
      }

      const finalEvidencePath =
        newUploadedPath ||
        existingEvidencePath ||
        null;

      const outputData = {
        jenis_kegiatan: form.jenis_kegiatan,
        jenis_luaran: form.jenis_luaran,

        judul_luaran:
            form.judul_luaran.trim(),

        tahun: Number(form.tahun),

        ketua_kegiatan:
            String(form.ketua_kegiatan ?? "").trim(),

        anggota_dosen:
            String(form.anggota_dosen ?? "").trim() || null,

        mahasiswa_terlibat:
            String(form.mahasiswa_terlibat ?? "").trim() || null,

        semester:
            form.semester,

        tahun_akademik:
            tahunAkademik,

        nama_jurnal_penerbit:
            form.nama_jurnal_penerbit.trim() || null,

        volume_nomor:
            form.volume_nomor.trim() || null,

        doi_url:
            form.doi_url.trim() || null,

        nomor_hki_isbn:
            form.nomor_hki_isbn.trim() || null,

        jenis_indikator:
            form.jenis_indikator || null,

        kode_indikator:
            form.kode_indikator.trim() || null,

        link_bukti: linkBukti,

        dokumen_bukti_path:
            finalEvidencePath,
        };

      if (editingId) {
        const { error } = await supabase
          .from("publikasi_dan_luaran")
          .update({
            ...outputData,
            status_gpm: "pending",
          })
          .eq("id", editingId)
          .eq("dosen_id", userId);

        if (error) {
          throw error;
        }

        if (
          newUploadedPath &&
          existingEvidencePath &&
          newUploadedPath !== existingEvidencePath
        ) {
          await removeEvidence(existingEvidencePath);
        }

        setMessage(
          "Perbaikan luaran berhasil dikirim ulang dan menunggu pemeriksaan GPM.",
        );
      } else {
        const { error } = await supabase
          .from("publikasi_dan_luaran")
          .insert({
            ...outputData,
            dosen_id: userId,
            status_gpm: "pending",
          });

        if (error) {
          throw error;
        }

        setMessage(
          "Publikasi atau luaran berhasil dikirim dan menunggu verifikasi GPM.",
        );
      }

      setMessageType("success");
      resetForm();

      await loadOutputs();
    } catch (error) {
      console.error("Gagal menyimpan luaran:", error);

      if (newUploadedPath) {
        await removeEvidence(newUploadedPath);
      }

      setMessageType("error");

      if (error.message?.includes("row-level security")) {
        setMessage(
          "Data ditolak oleh sistem keamanan. Pastikan akun memiliki role Dosen.",
        );
      } else if (
        error.message?.includes(
          "Data telah disetujui GPM",
        )
      ) {
        setMessage(
          "Data yang telah disetujui GPM tidak dapat diubah.",
        );
      } else {
        setMessage(
          error.message ||
            "Publikasi atau luaran gagal disimpan.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const validImportCount = importPreview.filter(
    (row) => row.valid,
  ).length;

  const invalidImportCount =
    importPreview.length - validImportCount;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Publikasi dan Luaran
        </h2>

        <p className="mt-1 text-slate-600">
          Tambahkan publikasi, HKI, buku, prosiding,
          produk penelitian, atau produk PkM.
        </p>
      </div>

      <div className="rounded-2xl border border-[#000080]/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Import Publikasi dan Luaran dari Excel.
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Gunakan template untuk data kolektif dan data individu.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100"
            >
              Unduh Template Excel
            </button>

            <label
              className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                editingId || importing
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-[#000080] hover:bg-[#000066]"
              }`}
            >
              Pilih File Excel

              <input
                key={importInputKey}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                disabled={Boolean(editingId) || importing}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {editingId && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Selesaikan atau batalkan mode perbaikan sebelum
            melakukan import Excel.
          </div>
        )}

        {importFileName && (
          <p className="mt-4 text-sm text-slate-600">
            File dipilih:{" "}
            <span className="font-semibold text-slate-900">
              {importFileName}
            </span>
          </p>
        )}

        {importMessage && (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm ${
              importMessageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : importMessageType === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {importMessage}
          </div>
        )}

        {importPreview.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
                  Total: {importPreview.length}
                </span>

                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 font-semibold text-green-700">
                  Valid: {validImportCount}
                </span>

                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-700">
                  Perlu diperbaiki: {invalidImportCount}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={clearImportPreview}
                  disabled={importing}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batalkan Import
                </button>

                <button
                  type="button"
                  onClick={saveImportedOutputs}
                  disabled={
                    importing || validImportCount === 0
                  }
                  className="rounded-xl bg-[#000080] px-4 py-2 text-sm font-semibold text-white hover:bg-[#000066] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {importing
                    ? "Menyimpan data..."
                    : `Simpan ${validImportCount} Data Valid`}
                </button>
              </div>
            </div>

            <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1500px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr className="border-b border-slate-200">
                    <TableHeading>Baris</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Asal</TableHeading>
                    <TableHeading>Jenis Luaran</TableHeading>
                    <TableHeading>Periode</TableHeading>
                    <TableHeading>Judul</TableHeading>
                    <TableHeading>Ketua</TableHeading>
                    <TableHeading>Link Bukti</TableHeading>
                    <TableHeading>Catatan Validasi</TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {importPreview.map((row) => (
                    <tr
                      key={`import-luaran-${row.rowNumber}`}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">
                        {row.rowNumber}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            row.valid
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {row.valid ? "Valid" : "Periksa"}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-700">
                        {row.data.jenis_kegiatan === "pkm"
                          ? "PkM"
                          : row.data.jenis_kegiatan === "penelitian"
                            ? "Penelitian"
                            : "-"}
                      </td>

                      <td className="px-3 py-3 font-medium text-slate-800">
                        {row.data.jenis_luaran || "-"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        <p>{row.data.tahun || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatSemesterLabel(
                            row.data.semester,
                          )}{" "}
                          · {row.data.tahun_akademik || "-"}
                        </p>
                      </td>

                      <td className="max-w-sm px-3 py-3 font-medium text-slate-900">
                        {row.data.judul_luaran || "-"}
                      </td>

                      <td className="px-3 py-3 text-slate-700">
                        {row.data.ketua_kegiatan || "-"}
                      </td>

                      <td className="max-w-xs break-all px-3 py-3 text-slate-600">
                        {row.data.link_bukti || "-"}
                      </td>

                      <td className="min-w-[300px] px-3 py-3">
                        {row.errors.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5 text-red-700">
                            {row.errors.map(
                              (errorText, errorIndex) => (
                                <li
                                  key={`error-luaran-${row.rowNumber}-${errorIndex}`}
                                >
                                  {errorText}
                                </li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <span className="text-green-700">
                            Siap disimpan
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidImportCount > 0 && (
              <p className="text-xs leading-5 text-slate-500">
                Hanya baris berstatus Valid yang akan
                disimpan. Perbaiki baris bermasalah pada
                Excel, kemudian pilih ulang file agar seluruh
                data dapat dimasukkan.
              </p>
            )}
          </div>
        )}
      </div>

      <div
        id="form-luaran"
        className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingId
                ? "Perbaiki Publikasi atau Luaran"
                : "Formulir Publikasi dan Luaran"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Data baru otomatis berstatus pending.
            </p>
          </div>

          {editingId && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Mode perbaikan
            </span>
          )}
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-2"
        >
          <FormField
            label="Asal kegiatan"
            htmlFor="luaran_jenis_kegiatan"
            required
          >
            <select
              id="luaran_jenis_kegiatan"
              name="jenis_kegiatan"
              value={form.jenis_kegiatan}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="penelitian">
                Penelitian
              </option>

              <option value="pkm">
                Pengabdian kepada Masyarakat
              </option>
            </select>
          </FormField>

          <FormField
            label="Jenis luaran"
            htmlFor="jenis_luaran"
            required
          >
            <select
              id="jenis_luaran"
              name="jenis_luaran"
              value={form.jenis_luaran}
              onChange={handleChange}
              className={inputClassName}
            >
              <option>Artikel Jurnal</option>
              <option>Prosiding</option>
              <option>Buku</option>
              <option>Book Chapter</option>
              <option>HKI</option>
              <option>Paten</option>
              <option>Produk Penelitian</option>
              <option>Produk PkM</option>
              <option>Media Pembelajaran</option>
              <option>Model atau Metode</option>
              <option>Luaran Lainnya</option>
            </select>
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Judul publikasi atau luaran"
              htmlFor="judul_luaran"
              required
            >
              <textarea
                id="judul_luaran"
                name="judul_luaran"
                rows="3"
                value={form.judul_luaran}
                onChange={handleChange}
                placeholder="Masukkan judul publikasi atau luaran"
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Ketua kegiatan"
            htmlFor="ketua_kegiatan_luaran"
            required
            >
            <input
                id="ketua_kegiatan_luaran"
                name="ketua_kegiatan"
                type="text"
                value={form.ketua_kegiatan}
                onChange={handleChange}
                placeholder="Nama lengkap ketua"
                className={inputClassName}
                required
            />
            </FormField>

            <FormField
            label="Semester"
            htmlFor="semester_luaran"
            required
            >
            <select
                id="semester_luaran"
                name="semester"
                value={form.semester}
                onChange={handleChange}
                className={inputClassName}
                required
            >
                <option value="ganjil">
                Ganjil
                </option>

                <option value="genap">
                Genap
                </option>
            </select>
            </FormField>

            <div className="md:col-span-2">
            <FormField
                label="Anggota dosen"
                htmlFor="anggota_dosen_luaran"
            >
                <textarea
                id="anggota_dosen_luaran"
                name="anggota_dosen"
                rows="3"
                value={form.anggota_dosen}
                onChange={handleChange}
                placeholder="Tuliskan nama anggota dosen, pisahkan dengan koma atau baris baru"
                className={inputClassName}
                />
            </FormField>
            </div>

            <div className="md:col-span-2">
            <FormField
                label="Mahasiswa terlibat"
                htmlFor="mahasiswa_terlibat_luaran"
            >
                <textarea
                id="mahasiswa_terlibat_luaran"
                name="mahasiswa_terlibat"
                rows="3"
                value={form.mahasiswa_terlibat}
                onChange={handleChange}
                placeholder="Tuliskan nama mahasiswa dan NIM, pisahkan dengan koma atau baris baru"
                className={inputClassName}
                />
            </FormField>
            </div>

            <FormField
            label="Tahun akademik"
            htmlFor="tahun_akademik_luaran"
            required
            >
            <input
                id="tahun_akademik_luaran"
                name="tahun_akademik"
                type="text"
                value={form.tahun_akademik}
                onChange={handleChange}
                placeholder="Contoh: 2026/2027"
                pattern="[0-9]{4}/[0-9]{4}"
                className={inputClassName}
                required
            />

            <p className="mt-2 text-xs text-slate-500">
                Gunakan format tahun awal/tahun akhir,
                misalnya 2026/2027.
            </p>
            </FormField>

          <FormField
            label="Tahun terbit atau luaran"
            htmlFor="tahun_luaran"
            required
          >
            <input
              id="tahun_luaran"
              name="tahun"
              type="number"
              min="2000"
              max="2100"
              value={form.tahun}
              onChange={handleChange}
              className={inputClassName}
              required
            />
          </FormField>

          <FormField
            label="Nama jurnal atau penerbit"
            htmlFor="nama_jurnal_penerbit"
          >
            <input
              id="nama_jurnal_penerbit"
              name="nama_jurnal_penerbit"
              type="text"
              value={form.nama_jurnal_penerbit}
              onChange={handleChange}
              placeholder="Nama jurnal, prosiding, atau penerbit"
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Volume dan nomor"
            htmlFor="volume_nomor"
          >
            <input
              id="volume_nomor"
              name="volume_nomor"
              type="text"
              value={form.volume_nomor}
              onChange={handleChange}
              placeholder="Contoh: Vol. 5 No. 2"
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="DOI atau URL"
            htmlFor="doi_url"
          >
            <input
              id="doi_url"
              name="doi_url"
              type="text"
              value={form.doi_url}
              onChange={handleChange}
              placeholder="DOI atau tautan publikasi"
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Nomor HKI, paten, atau ISBN"
            htmlFor="nomor_hki_isbn"
          >
            <input
              id="nomor_hki_isbn"
              name="nomor_hki_isbn"
              type="text"
              value={form.nomor_hki_isbn}
              onChange={handleChange}
              placeholder="Nomor HKI, paten, atau ISBN"
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Jenis indikator"
            htmlFor="jenis_indikator_luaran"
          >
            <select
              id="jenis_indikator_luaran"
              name="jenis_indikator"
              value={form.jenis_indikator}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="">
                Belum ditentukan
              </option>

              <option value="IKU">IKU</option>
              <option value="IKT">IKT</option>
            </select>
          </FormField>

          <FormField
            label="Kode indikator"
            htmlFor="kode_indikator_luaran"
          >
            <input
              id="kode_indikator_luaran"
              name="kode_indikator"
              type="text"
              value={form.kode_indikator}
              onChange={handleChange}
              placeholder="Contoh: IKU-PEN-02"
              className={inputClassName}
            />
          </FormField>

            <div className="md:col-span-2">
        <FormField
            label="Link bukti"
            htmlFor="link_bukti_luaran"
            required
        >
            <input
            id="link_bukti_luaran"
            name="link_bukti"
            type="url"
            value={form.link_bukti}
            onChange={handleChange}
            placeholder="Lampirkan link file yang bisa diakses"
            className={inputClassName}
            required
            />

            <p className="mt-2 text-xs text-slate-500">
            Masukkan tautan publikasi, DOI, repository,
            Google Drive, OneDrive, HKI, atau sumber bukti
            lainnya. Pastikan reviewer dapat membuka tautan.
            </p>
        </FormField>
        </div>
          <div className="md:col-span-2">
            <FormField
              label="Dokumen bukti"
              htmlFor="dokumen_bukti_luaran"
            >
              <input
                key={fileInputKey}
                id="dokumen_bukti_luaran"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Opsional. Format PDF, JPG, PNG, Word, atau Excel.
                Ukuran maksimal 6 MB.
              </p>
              {evidenceFile && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  File baru: {evidenceFile.name}
                </div>
              )}

              {editingId &&
                existingEvidencePath &&
                !evidenceFile && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                    <span className="text-sm text-green-700">
                      Dokumen lama masih tersedia.
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        openEvidence(existingEvidencePath)
                      }
                      className="text-sm font-semibold text-green-700 underline"
                    >
                      Lihat
                    </button>
                  </div>
                )}
            </FormField>
          </div>

          <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal Memperbaiki
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving
                ? "Mengunggah dan menyimpan..."
                : editingId
                  ? "Simpan dan Kirim Ulang"
                  : "Simpan dan Kirim ke GPM"}
            </button>
          </div>
        </form>
      </div>

      <OutputHistory
        outputs={outputs}
        loadingData={loadingData}
        openingFile={openingFile}
        loadOutputs={loadOutputs}
        openEvidence={openEvidence}
        handleEdit={handleEdit}
      />
    </section>
  );
}

function OutputHistory({
  outputs,
  loadingData,
  openingFile,
  loadOutputs,
  openEvidence,
  handleEdit,
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Riwayat Publikasi dan Luaran
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Daftar publikasi dan luaran yang pernah dikirim.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOutputs}
          disabled={loadingData}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {loadingData ? "Memuat..." : "Perbarui"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <TableHeading>Jenis</TableHeading>
              <TableHeading>Judul</TableHeading>
              <TableHeading>Tahun</TableHeading>
              <TableHeading>Indikator</TableHeading>
              <TableHeading>Bukti</TableHeading>
              <TableHeading>Status GPM</TableHeading>
              <TableHeading align="right">
                Tindakan
              </TableHeading>
            </tr>
          </thead>

          <tbody>
            {outputs.map((output) => (
              <tr
                key={output.id}
                className="border-b border-slate-100 align-top"
              >
                <td className="px-3 py-4">
                  <p className="font-medium text-slate-900">
                    {output.jenis_luaran}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {output.jenis_kegiatan === "pkm"
                      ? "PkM"
                      : "Penelitian"}
                  </p>
                </td>

                <td className="max-w-md px-3 py-4">
                  <p className="font-medium text-slate-900">
                    {output.judul_luaran}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Ketua: {output.ketua_kegiatan || "-"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                    Semester{" "}
                    {output.semester === "ganjil"
                        ? "Ganjil"
                        : output.semester === "genap"
                        ? "Genap"
                        : "-"}
                    {" • "}
                    Tahun Akademik{" "}
                    {output.tahun_akademik || "-"}
                    </p>

                    {output.anggota_dosen && (
                    <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                        Anggota dosen: {output.anggota_dosen}
                    </p>
                    )}

                    {output.mahasiswa_terlibat && (
                    <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                        Mahasiswa: {output.mahasiswa_terlibat}
                    </p>
                    )}

                  {output.nama_jurnal_penerbit && (
                    <p className="mt-1 text-sm text-slate-500">
                      {output.nama_jurnal_penerbit}
                    </p>
                  )}

                  {output.catatan_revisi_gpm && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold uppercase text-red-700">
                        Catatan GPM
                      </p>

                      <p className="mt-1 text-sm text-red-700">
                        {output.catatan_revisi_gpm}
                      </p>
                    </div>
                  )}
                </td>

                <td className="px-3 py-4 text-sm text-slate-700">
                  {output.tahun}
                </td>

                <td className="px-3 py-4 text-sm text-slate-700">
                  <p>{output.jenis_indikator || "-"}</p>

                  {output.kode_indikator && (
                    <p className="mt-1 text-xs text-slate-500">
                      {output.kode_indikator}
                    </p>
                  )}
                </td>

                <td className="px-3 py-4">
                <div className="flex flex-col items-start gap-2">
                    {output.link_bukti ? (
                    <a
                        href={output.link_bukti}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                    >
                        Buka Link Bukti
                    </a>
                    ) : (
                    <span className="text-sm text-red-600">
                        Link belum tersedia
                    </span>
                    )}

                    {output.dokumen_bukti_path && (
                    <button
                        type="button"
                        onClick={() =>
                        openEvidence(output.dokumen_bukti_path)
                        }
                        disabled={
                        openingFile === output.dokumen_bukti_path
                        }
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {openingFile === output.dokumen_bukti_path
                        ? "Membuka..."
                        : "Buka File Tambahan"}
                    </button>
                    )}
                </div>
                </td>

                <td className="px-3 py-4">
                  <StatusBadge
                    status={output.status_gpm}
                  />
                </td>

                <td className="px-3 py-4">
                  <div className="flex justify-end">
                    {output.status_gpm === "rejected" && (
                      <button
                        type="button"
                        onClick={() => handleEdit(output)}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                      >
                        Edit dan Kirim Ulang
                      </button>
                    )}

                    {output.status_gpm === "pending" && (
                      <span className="text-sm text-slate-500">
                        Menunggu pemeriksaan
                      </span>
                    )}

                    {output.status_gpm === "approved" && (
                      <span className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                        Data terkunci
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loadingData && outputs.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="px-3 py-10 text-center text-slate-500"
                >
                  Belum ada publikasi atau luaran.
                </td>
              </tr>
            )}

            {loadingData && (
              <tr>
                <td
                  colSpan="7"
                  className="px-3 py-10 text-center text-slate-500"
                >
                  Memuat publikasi dan luaran...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  required = false,
  children,
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </label>

      {children}
    </div>
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
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Perlu revisi",
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

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

function findExcelValue(row, possibleHeaders) {
  const normalizedHeaders = possibleHeaders.map(
    normalizeExcelHeader,
  );

  for (const [key, value] of Object.entries(row ?? {})) {
    if (
      normalizedHeaders.includes(
        normalizeExcelHeader(key),
      )
    ) {
      return value;
    }
  }

  return "";
}

function getExcelText(row, possibleHeaders) {
  return String(
    findExcelValue(row, possibleHeaders) ?? "",
  ).trim();
}

function normalizeExcelHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeImportedActivityType(value) {
  const normalized = normalizeExcelHeader(value);

  if (normalized === "penelitian") {
    return "penelitian";
  }

  if (
    normalized === "pkm" ||
    normalized === "pengabdian" ||
    normalized === "pengabdiankepadamasyarakat"
  ) {
    return "pkm";
  }

  return "";
}

function normalizeImportedSemester(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "ganjil") {
    return "ganjil";
  }

  if (normalized === "genap") {
    return "genap";
  }

  return "";
}

function normalizeImportedOutputType(value) {
  const normalized = normalizeExcelHeader(value);

  const outputTypes = {
    artikeljurnal: "Artikel Jurnal",
    prosiding: "Prosiding",
    buku: "Buku",
    bookchapter: "Book Chapter",
    hki: "HKI",
    paten: "Paten",
    produkpenelitian: "Produk Penelitian",
    produkpkm: "Produk PkM",
    mediapembelajaran: "Media Pembelajaran",
    modelataumetode: "Model atau Metode",
    luaranlainnya: "Luaran Lainnya",
  };

  return outputTypes[normalized] || "";
}

function normalizeImportedPeopleText(value) {
  return String(value ?? "")
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function validateImportedOutputRow(row, rowNumber) {
  const errors = [];

  const jenisKegiatan =
    normalizeImportedActivityType(
      getExcelText(row, [
        "Asal Kegiatan",
        "Jenis Kegiatan",
        "jenis_kegiatan",
      ]),
    );

  if (!jenisKegiatan) {
    errors.push(
      "Asal Kegiatan harus Penelitian atau PkM.",
    );
  }

  const jenisLuaranText = getExcelText(row, [
    "Jenis Luaran",
    "jenis_luaran",
  ]);

  const jenisLuaran =
    normalizeImportedOutputType(jenisLuaranText);

  if (!jenisLuaran) {
    errors.push(
      "Jenis Luaran tidak sesuai pilihan yang tersedia pada formulir.",
    );
  }

  const judulLuaran = getExcelText(row, [
    "Judul Publikasi atau Luaran",
    "Judul Luaran",
    "Judul",
    "judul_luaran",
  ]);

  if (!judulLuaran) {
    errors.push(
      "Judul Publikasi atau Luaran wajib diisi.",
    );
  }

  const ketuaKegiatan = getExcelText(row, [
    "Ketua Kegiatan",
    "ketua_kegiatan",
  ]);

  if (!ketuaKegiatan) {
    errors.push("Ketua Kegiatan wajib diisi.");
  }

  const semester = normalizeImportedSemester(
    getExcelText(row, ["Semester", "semester"]),
  );

  if (!semester) {
    errors.push(
      "Semester harus Ganjil atau Genap.",
    );
  }

  const tahunAkademik = getExcelText(row, [
    "Tahun Akademik",
    "tahun_akademik",
  ]);

  if (!isValidAcademicYear(tahunAkademik)) {
    errors.push(
      "Tahun Akademik harus menggunakan format berurutan, misalnya 2026/2027.",
    );
  }

  const yearValue = findExcelValue(row, [
    "Tahun Terbit",
    "Tahun Terbit atau Luaran",
    "Tahun",
    "tahun",
  ]);

  const tahun = Number(
    String(yearValue ?? "")
      .trim()
      .replace(/[^0-9]/g, ""),
  );

  if (
    !Number.isInteger(tahun) ||
    tahun < 2000 ||
    tahun > 2100
  ) {
    errors.push(
      "Tahun Terbit harus berupa angka antara 2000 dan 2100.",
    );
  }

  const anggotaDosen = normalizeImportedPeopleText(
    findExcelValue(row, [
      "Anggota Dosen",
      "anggota_dosen",
    ]),
  );

  const mahasiswaTerlibat =
    normalizeImportedPeopleText(
      findExcelValue(row, [
        "Mahasiswa Terlibat",
        "Mahasiswa",
        "mahasiswa_terlibat",
      ]),
    );

  const namaJurnalPenerbit = getExcelText(row, [
    "Nama Jurnal atau Penerbit",
    "Nama Jurnal/Penerbit",
    "nama_jurnal_penerbit",
  ]);

  const volumeNomor = getExcelText(row, [
    "Volume dan Nomor",
    "Volume/Nomor",
    "volume_nomor",
  ]);

  const doiUrl = getExcelText(row, [
    "DOI atau URL",
    "DOI/URL",
    "doi_url",
  ]);

  const nomorHkiIsbn = getExcelText(row, [
    "Nomor HKI/Paten/ISBN",
    "Nomor HKI, Paten, atau ISBN",
    "nomor_hki_isbn",
  ]);

  const jenisIndikatorText = getExcelText(row, [
    "Jenis Indikator",
    "jenis_indikator",
  ]).toUpperCase();

  const jenisIndikator =
    jenisIndikatorText === "IKU" ||
    jenisIndikatorText === "IKT"
      ? jenisIndikatorText
      : "";

  if (
    jenisIndikatorText &&
    !jenisIndikator
  ) {
    errors.push(
      "Jenis Indikator hanya boleh IKU, IKT, atau dikosongkan.",
    );
  }

  const kodeIndikator = getExcelText(row, [
    "Kode Indikator",
    "kode_indikator",
  ]);

  const linkBukti = getExcelText(row, [
    "Link Bukti",
    "link_bukti",
  ]);

  if (!linkBukti) {
    errors.push("Link Bukti wajib diisi.");
  } else if (!isValidHttpUrl(linkBukti)) {
    errors.push(
      "Link Bukti harus diawali http:// atau https://.",
    );
  }

  return {
    rowNumber,
    valid: errors.length === 0,
    errors,
    data: {
      jenis_kegiatan: jenisKegiatan,
      jenis_luaran: jenisLuaran,
      judul_luaran: judulLuaran,
      tahun,
      ketua_kegiatan: ketuaKegiatan,
      anggota_dosen: anggotaDosen,
      mahasiswa_terlibat: mahasiswaTerlibat,
      semester,
      tahun_akademik: tahunAkademik,
      nama_jurnal_penerbit: namaJurnalPenerbit,
      volume_nomor: volumeNomor,
      doi_url: doiUrl,
      nomor_hki_isbn: nomorHkiIsbn,
      jenis_indikator: jenisIndikator,
      kode_indikator: kodeIndikator,
      link_bukti: linkBukti,
    },
  };
}

function createOutputDuplicateKey(output) {
  return [
    String(output?.jenis_kegiatan ?? "")
      .trim()
      .toLowerCase(),
    String(output?.jenis_luaran ?? "")
      .trim()
      .toLowerCase(),
    String(output?.tahun ?? "").trim(),
    String(output?.judul_luaran ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " "),
  ].join("|");
}

function formatSemesterLabel(value) {
  if (value === "ganjil") {
    return "Ganjil";
  }

  if (value === "genap") {
    return "Genap";
  }

  return "-";
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(
      String(value ?? "").trim(),
    );

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function getDefaultAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (currentMonth >= 7) {
    return `${currentYear}/${currentYear + 1}`;
  }

  return `${currentYear - 1}/${currentYear}`;
}

function isValidAcademicYear(value) {
  const normalizedValue =
    String(value ?? "").trim();

  const match = normalizedValue.match(
    /^(\d{4})\/(\d{4})$/,
  );

  if (!match) {
    return false;
  }

  const firstYear = Number(match[1]);
  const secondYear = Number(match[2]);

  return secondYear === firstYear + 1;
}

export default LuaranDashboard;