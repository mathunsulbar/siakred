import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const BUCKET_NAME = "bukti-akreditasi";
const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ACADEMIC_YEAR_OPTIONS = createAcademicYearOptions();
const MAX_IMPORT_ROWS = 500;
const EXCEL_TEMPLATE_FILE_NAME =
  "Template_Import_Kegiatan_Penelitian_PkM.xlsx";

const EXCEL_TEMPLATE_HEADERS = [
  "Jenis Kegiatan",
  "Tahun",
  "Semester",
  "Tahun Akademik",
  "Judul Kegiatan",
  "Ketua Kegiatan",
  "Identitas Ketua",
  "Anggota Dosen",
  "Mahasiswa Terlibat",
  "Sumber Dana",
  "Jumlah Dana",
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
    judul: "",
    tahun: new Date().getFullYear(),

    semester: "ganjil",
    tahun_akademik: getDefaultAcademicYear(),

    ketua_kegiatan: "",
    ketua_identitas: "",

    anggota_dosen_data: [
      {
        nama: "",
        identitas: "",
      },
    ],

    mahasiswa_data: [
      {
        nama: "",
        nim: "",
      },
    ],

    sumber_dana: "",
    jumlah_dana: "",

    jenis_indikator: "",
    kode_indikator: "",
    link_bukti: "",
  };
}

function DosenDashboard({ userId }) {
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState(null);

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [existingEvidencePath, setExistingEvidencePath] =
    useState(null);

  const [activities, setActivities] = useState([]);
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

  const loadActivities = useCallback(async () => {
    try {
      setLoadingData(true);

      const { data, error } = await supabase
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

      setActivities(data ?? []);
    } catch (error) {
      console.error("Gagal membaca kegiatan:", error);

      setMessageType("error");
      setMessage(
        error.message ||
          "Data kegiatan belum dapat dimuat.",
      );
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleFundingChange(event) {
    const digits = onlyDigits(event.target.value);

    setForm((currentForm) => ({
        ...currentForm,
        jumlah_dana: digits,
    }));
    }

    function handleAnggotaDosenChange(
    index,
    field,
    value,
    ) {
    const safeValue =
        field === "identitas"
        ? onlyDigits(value)
        : value;

    setForm((currentForm) => {
        const rows =
        currentForm.anggota_dosen_data ?? [];

        return {
        ...currentForm,

        anggota_dosen_data: rows.map(
            (row, rowIndex) =>
            rowIndex === index
                ? {
                    ...row,
                    [field]: safeValue,
                }
                : row,
        ),
        };
    });
    }

    function addAnggotaDosen() {
    setForm((currentForm) => ({
        ...currentForm,

        anggota_dosen_data: [
        ...(currentForm.anggota_dosen_data ?? []),
        {
            nama: "",
            identitas: "",
        },
        ],
    }));
    }

    function removeAnggotaDosen(index) {
    setForm((currentForm) => ({
        ...currentForm,

        anggota_dosen_data:
        currentForm.anggota_dosen_data.filter(
            (_, rowIndex) => rowIndex !== index,
        ),
    }));
    }

    function handleMahasiswaChange(
        index,
        field,
        value,
        ) {
        const safeValue =
            field === "nim"
            ? normalizeNim(value)
            : value;

        setForm((currentForm) => {
            const rows =
            currentForm.mahasiswa_data ?? [];

            return {
            ...currentForm,

            mahasiswa_data: rows.map(
                (row, rowIndex) =>
                rowIndex === index
                    ? {
                        ...row,
                        [field]: safeValue,
                    }
                    : row,
            ),
            };
        });
        }

    function addMahasiswa() {
    setForm((currentForm) => ({
        ...currentForm,

        mahasiswa_data: [
        ...(currentForm.mahasiswa_data ?? []),
        {
            nama: "",
            nim: "",
        },
        ],
    }));
    }

    function removeMahasiswa(index) {
    setForm((currentForm) => ({
        ...currentForm,

        mahasiswa_data:
        currentForm.mahasiswa_data.filter(
            (_, rowIndex) => rowIndex !== index,
        ),
    }));
    }

  function downloadExcelTemplate() {
    const sampleRows = [
      {
        "Jenis Kegiatan": "Penelitian",
        Tahun: new Date().getFullYear(),
        Semester: "Ganjil",
        "Tahun Akademik": getDefaultAcademicYear(),
        "Judul Kegiatan":
          "Contoh judul penelitian Program Studi Matematika",
        "Ketua Kegiatan": "Nama Ketua",
        "Identitas Ketua": "0123456789",
        "Anggota Dosen":
          "Nama Anggota 1|1111111111; Nama Anggota 2|2222222222",
        "Mahasiswa Terlibat":
          "Nama Mahasiswa 1|H0221001; Nama Mahasiswa 2|H0221002",
        "Sumber Dana": "Internal",
        "Jumlah Dana": 10000000,
        "Jenis Indikator": "IKU",
        "Kode Indikator": "IKU-PEN-01",
        "Link Bukti": "https://drive.google.com/",
      },
      {
        "Jenis Kegiatan": "PkM",
        Tahun: new Date().getFullYear(),
        Semester: "Genap",
        "Tahun Akademik": getDefaultAcademicYear(),
        "Judul Kegiatan":
          "Contoh judul pengabdian kepada masyarakat",
        "Ketua Kegiatan": "Nama Ketua",
        "Identitas Ketua": "0123456789",
        "Anggota Dosen": "",
        "Mahasiswa Terlibat": "Nama Mahasiswa|H0221003",
        "Sumber Dana": "Mandiri",
        "Jumlah Dana": 5000000,
        "Jenis Indikator": "IKT",
        "Kode Indikator": "IKT-PKM-01",
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
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 52 },
      { wch: 26 },
      { wch: 22 },
      { wch: 55 },
      { wch: 55 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 45 },
    ];

    worksheet["!autofilter"] = {
      ref: `A1:N${sampleRows.length + 1}`,
    };

    const guideRows = [
      ["PETUNJUK IMPORT DATA KEGIATAN"],
      [
        "1. Jangan mengubah nama kolom pada sheet Kegiatan.",
      ],
      [
        "2. Jenis Kegiatan diisi Penelitian atau PkM.",
      ],
      ["3. Semester diisi Ganjil atau Genap."],
      [
        "4. Format Tahun Akademik: 2026/2027.",
      ],
      [
        "5. Anggota Dosen: Nama|NIDN/NUPTK/NIP; Nama|NIDN/NUPTK/NIP.",
      ],
      [
        "6. Mahasiswa: Nama|NIM; Nama|NIM.",
      ],
      [
        "7. Link Bukti wajib diawali http:// atau https://.",
      ],
      [
        "8. Dokumen bukti tambahan tidak diimpor dan dapat dilengkapi melalui link bukti.",
      ],
      [
        `9. Maksimal ${MAX_IMPORT_ROWS} baris dalam satu kali import.`,
      ],
      [
        "10. Hapus dua baris contoh sebelum mengisi data resmi.",
      ],
    ];

    const guideSheet =
      XLSX.utils.aoa_to_sheet(guideRows);

    guideSheet["!cols"] = [{ wch: 105 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Kegiatan",
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

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error(
          "Workbook tidak memiliki sheet yang dapat dibaca.",
        );
      }

      const worksheet =
        workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
          raw: true,
        },
      );

      if (rawRows.length === 0) {
        throw new Error(
          "Sheet pertama tidak memiliki data.",
        );
      }

      if (rawRows.length > MAX_IMPORT_ROWS) {
        throw new Error(
          `Maksimal ${MAX_IMPORT_ROWS} baris dalam satu kali import.`,
        );
      }

      const existingKeys = new Set(
        activities.map((activity) =>
          createActivityDuplicateKey({
            jenis_kegiatan:
              activity.jenis_kegiatan,
            tahun: activity.tahun,
            judul: activity.judul,
          }),
        ),
      );

      const fileKeys = new Set();

      const parsedRows = rawRows.map(
        (row, index) => {
          const parsed = validateImportedActivityRow(
            row,
            index + 2,
          );

          const duplicateKey =
            createActivityDuplicateKey(parsed.data);

          const duplicateErrors = [];

          if (
            parsed.valid &&
            existingKeys.has(duplicateKey)
          ) {
            duplicateErrors.push(
              "Data dengan jenis, tahun, dan judul yang sama sudah tersimpan.",
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
      console.error("Gagal membaca Excel:", error);

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

  async function saveImportedActivities() {
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
      `Simpan ${validRows.length} data valid ke SIMETRI dengan status Pending?`,
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
        judul: data.judul,
        tahun: data.tahun,
        semester: data.semester,
        tahun_akademik: data.tahun_akademik,
        ketua_kegiatan: data.ketua_kegiatan,
        ketua_identitas: data.ketua_identitas,
        anggota_dosen_data:
          data.anggota_dosen_data,
        mahasiswa_data: data.mahasiswa_data,
        anggota_dosen:
          data.anggota_dosen_data.length > 0
            ? data.anggota_dosen_data
                .map(
                  (person) =>
                    `${person.nama} (${person.identitas})`,
                )
                .join("\n")
            : null,
        mahasiswa_terlibat:
          data.mahasiswa_data.length > 0
            ? data.mahasiswa_data
                .map(
                  (person) =>
                    `${person.nama} (${person.nim})`,
                )
                .join("\n")
            : null,
        sumber_dana: data.sumber_dana || null,
        jumlah_dana: data.jumlah_dana,
        jenis_indikator:
          data.jenis_indikator || null,
        kode_indikator:
          data.kode_indikator || null,
        link_bukti: data.link_bukti,
        dokumen_bukti_path: null,
        status_gpm: "pending",
      }));

      const { error } = await supabase
        .from("kegiatan_tridarma")
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

      await loadActivities();
    } catch (error) {
      console.error("Gagal menyimpan import:", error);

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
      setMessage(
        "Ukuran file maksimal 6 MB.",
      );
      return;
    }

    setEvidenceFile(file);
  }

  function resetForm() {
    setForm(createInitialForm());
    setEditingId(null);
    setEvidenceFile(null);
    setExistingEvidencePath(null);
    setFileInputKey((current) => current + 1);
  }

  function handleEdit(activity) {
    if (activity.status_gpm !== "rejected") {
      return;
    }

    setEditingId(activity.id);
    setExistingEvidencePath(
      activity.dokumen_bukti_path ?? null,
    );

    setEvidenceFile(null);
    setFileInputKey((current) => current + 1);

    setForm({
        jenis_kegiatan:
            activity.jenis_kegiatan ?? "penelitian",

        judul:
            activity.judul ?? "",

        tahun:
            activity.tahun ?? new Date().getFullYear(),

        semester:
            activity.semester ?? "ganjil",

        tahun_akademik:
            activity.tahun_akademik ??
            getDefaultAcademicYear(),

        ketua_kegiatan:
            activity.ketua_kegiatan ?? "",

        ketua_identitas:
            activity.ketua_identitas ?? "",

        anggota_dosen_data:
            normalizePeopleRows(
            activity.anggota_dosen_data,
            activity.anggota_dosen,
            "identitas",
            ),

        mahasiswa_data:
            normalizePeopleRows(
            activity.mahasiswa_data,
            activity.mahasiswa_terlibat,
            "nim",
            ),

        sumber_dana:
            activity.sumber_dana ?? "",

        jumlah_dana:
            String(activity.jumlah_dana ?? ""),

        jenis_indikator:
            activity.jenis_indikator ?? "",

        kode_indikator:
            activity.kode_indikator ?? "",

        link_bukti:
            activity.link_bukti ?? "",
        });

    setMessage("");
    setMessageType("");

    setTimeout(() => {
      document
        .getElementById("form-kegiatan")
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

    async function uploadEvidence(
        file,
        activityType,
        ownerId,
        ) {
        const safeFileName =
            createSafeFileName(file.name);

        const uniqueName =
            `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

        const safeActivityType =
            activityType || "kegiatan";

        const filePath =
            `${ownerId}/${safeActivityType}/${uniqueName}`;

        const { data, error } =
            await supabase.storage
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
        "File lama belum berhasil dihapus:",
        error,
      );
    }
  }

  async function openEvidence(filePath) {
    if (!filePath) {
      return;
    }

    try {
      setOpeningFile(filePath);
      setMessage("");
      setMessageType("");

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 300);

      if (error) {
        throw error;
      }

      const newWindow = window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer",
      );

      if (!newWindow) {
        setMessageType("error");
        setMessage(
          "Browser memblokir jendela dokumen. Izinkan pop-up untuk situs ini.",
        );
      }
    } catch (error) {
      console.error("Gagal membuka dokumen:", error);

      setMessageType("error");
      setMessage(
        error.message ||
          "Dokumen belum dapat dibuka.",
      );
    } finally {
      setOpeningFile(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    /*
    * Menyiapkan dan membersihkan semua nilai formulir.
    */
    const judulKegiatan =
        String(form.judul ?? "").trim();

    const linkBukti =
        String(form.link_bukti ?? "").trim();

    const ketuaKegiatan =
        String(form.ketua_kegiatan ?? "").trim();

    const ketuaIdentitas =
        onlyDigits(form.ketua_identitas);

    const tahunAkademik =
        String(form.tahun_akademik ?? "").trim();

    const jumlahDana =
        onlyDigits(form.jumlah_dana);

    /*
    * Menghapus baris anggota yang benar-benar kosong.
    * Baris yang hanya terisi sebagian tetap dipertahankan
    * agar dapat diperiksa oleh validasi.
    */
    const anggotaDosen = preparePeopleRows(
        form.anggota_dosen_data,
        "identitas",
    );

    const mahasiswa = preparePeopleRows(
        form.mahasiswa_data,
        "nim",
    );

    /*
    * 1. Validasi judul kegiatan
    */
    if (!judulKegiatan) {
        setMessageType("error");
        setMessage("Judul kegiatan wajib diisi.");
        return;
    }

    /*
    * 2. Validasi semester
    */
    if (
        form.semester !== "ganjil" &&
        form.semester !== "genap"
    ) {
        setMessageType("error");
        setMessage(
        "Semester wajib dipilih: Ganjil atau Genap.",
        );
        return;
    }

    /*
    * 3. Validasi tahun akademik
    */
    if (!tahunAkademik) {
        setMessageType("error");
        setMessage("Tahun akademik wajib dipilih.");
        return;
    }

    /*
    * 4. Validasi nama ketua
    */
    if (!ketuaKegiatan) {
        setMessageType("error");
        setMessage("Nama ketua kegiatan wajib diisi.");
        return;
    }

    /*
    * 5. Validasi NIDN/NUPTK/NIP ketua
    */
    if (!ketuaIdentitas) {
        setMessageType("error");
        setMessage(
        "NIDN/NUPTK/NIP ketua wajib diisi dengan angka.",
        );
        return;
    }

    /*
    * 6. Validasi anggota dosen.
    *
    * Anggota boleh kosong seluruhnya.
    * Namun, jika satu baris mulai diisi, nama dan
    * NIDN/NUPTK/NIP harus sama-sama terisi.
    */
    const anggotaTidakLengkap =
        anggotaDosen.some((anggota) => {
        return (
            !anggota.nama ||
            !anggota.identitas
        );
        });

    if (anggotaTidakLengkap) {
        setMessageType("error");
        setMessage(
        "Setiap anggota dosen yang ditambahkan harus memiliki nama dan NIDN/NUPTK/NIP.",
        );
        return;
    }

    /*
    * 7. Validasi mahasiswa.
    *
    * Mahasiswa boleh kosong seluruhnya.
    * Namun, jika satu baris mulai diisi, nama dan NIM
    * harus sama-sama terisi.
    */
    const mahasiswaTidakLengkap =
        mahasiswa.some((item) => {
        return (
            !item.nama ||
            !item.nim
        );
        });

    if (mahasiswaTidakLengkap) {
        setMessageType("error");
        setMessage(
        "Setiap mahasiswa yang ditambahkan harus memiliki nama dan NIM.",
        );
        return;
    }

    /*
    * 8. Validasi link bukti
    */
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

    /*
    * Setelah semua validasi berhasil, proses unggah
    * dan penyimpanan dapat dilanjutkan.
    */
    let newUploadedPath = null;

try {
  setSaving(true);
  setMessage("");
  setMessageType("");

  /*
   * Mengambil akun yang sedang login.
   */
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authUser) {
    throw new Error(
      "Sesi login tidak ditemukan. Silakan login kembali.",
    );
  }

  /*
   * userId dari props digunakan jika tersedia.
   * Jika tidak tersedia, gunakan ID dari Supabase Auth.
   */
  const currentUserId =
    userId || authUser.id;

  if (!currentUserId) {
    throw new Error(
      "ID pengguna tidak ditemukan. Silakan login kembali.",
    );
  }

  /*
   * Mengunggah file tambahan jika ada.
   */
  if (evidenceFile) {
    newUploadedPath =
      await uploadEvidence(
        evidenceFile,
        form.jenis_kegiatan,
        currentUserId,
      );
  }

  const finalEvidencePath =
    newUploadedPath ||
    existingEvidencePath ||
    null;

  /*
   * Data yang akan disimpan ke kegiatan_tridarma.
   */
  const activityData = {
    dosen_id:
      currentUserId,

    jenis_kegiatan:
      form.jenis_kegiatan,

    judul:
      judulKegiatan,

    tahun:
      Number(form.tahun),

    semester:
      form.semester,

    tahun_akademik:
      tahunAkademik,

    ketua_kegiatan:
      ketuaKegiatan,

    ketua_identitas:
      ketuaIdentitas,

    anggota_dosen_data:
      anggotaDosen,

    mahasiswa_data:
      mahasiswa,

    anggota_dosen:
      anggotaDosen.length > 0
        ? anggotaDosen
            .map(
              (anggota) =>
                `${anggota.nama} (${anggota.identitas})`,
            )
            .join("\n")
        : null,

    mahasiswa_terlibat:
      mahasiswa.length > 0
        ? mahasiswa
            .map(
              (item) =>
                `${item.nama} (${item.nim})`,
            )
            .join("\n")
        : null,

    sumber_dana:
      String(form.sumber_dana ?? "").trim() ||
      null,

    jumlah_dana:
      jumlahDana
        ? Number(jumlahDana)
        : 0,

    jenis_indikator:
      form.jenis_indikator || null,

    kode_indikator:
      String(form.kode_indikator ?? "").trim() ||
      null,

    link_bukti:
      linkBukti,

    dokumen_bukti_path:
      finalEvidencePath,
  };

      if (editingId) {
        const { error } = await supabase
          .from("kegiatan_tridarma")
          .update({
            ...activityData,
            status_gpm: "pending",
          })
          .eq("id", editingId)
          .eq("dosen_id", currentUserId);

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
          "Perbaikan dan dokumen bukti berhasil dikirim ulang ke GPM.",
        );
      } else {
            const { error } = await supabase
                .from("kegiatan_tridarma")
                .insert({
                ...activityData,
                status_gpm: "pending",
                });

            if (error) {
                throw error;
            }

            setMessage(
                "Data dan dokumen bukti berhasil dikirim ke GPM.",
            );
            }

      setMessageType("success");
      resetForm();

      await loadActivities();
    } catch (error) {
      console.error("Gagal menyimpan kegiatan:", error);

      /*
       * Jika file sudah terunggah tetapi database gagal,
       * hapus kembali agar tidak menjadi file yatim.
       */
      if (newUploadedPath) {
        await removeEvidence(newUploadedPath);
      }

      setMessageType("error");

      if (
        error.message?.includes(
          "row-level security",
        )
      ) {
        setMessage(
          "Data atau file ditolak oleh sistem keamanan. Pastikan akun memiliki role Dosen.",
        );
      } else if (
        error.message?.includes(
          "Data telah disetujui GPM",
        )
      ) {
        setMessage(
          "Data yang sudah disetujui GPM tidak dapat diubah.",
        );
      } else {
        setMessage(
          error.message ||
            "Data kegiatan gagal disimpan.",
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
    <section className="mt-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Dashboard Dosen
        </h2>

        <p className="mt-1 text-slate-600">
          Tambahkan kegiatan penelitian atau pengabdian
          kepada masyarakat beserta dokumen buktinya.
        </p>
      </div>

      <div className="rounded-2xl border border-[#881337]/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Import Data Kegiatan dari Excel
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
                  ? "cursor-not-allowed bg-[#FDA4AF]"
                  : "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] hover:brightness-95 shadow-sm"
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
                  onClick={saveImportedActivities}
                  disabled={
                    importing || validImportCount === 0
                  }
                  className="rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#FDA4AF] disabled:bg-none"
                >
                  {importing
                    ? "Menyimpan data..."
                    : `Simpan ${validImportCount} Data Valid`}
                </button>
              </div>
            </div>

            <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1250px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr className="border-b border-slate-200">
                    <TableHeading>Baris</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Jenis</TableHeading>
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
                      key={`import-row-${row.rowNumber}`}
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
                          : row.data.jenis_kegiatan ===
                              "penelitian"
                            ? "Penelitian"
                            : "-"}
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
                        {row.data.judul || "-"}
                      </td>

                      <td className="px-3 py-3 text-slate-700">
                        <p>{row.data.ketua_kegiatan || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.data.ketua_identitas || "-"}
                        </p>
                      </td>

                      <td className="max-w-xs break-all px-3 py-3 text-slate-600">
                        {row.data.link_bukti || "-"}
                      </td>

                      <td className="min-w-[280px] px-3 py-3">
                        {row.errors.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5 text-red-700">
                            {row.errors.map(
                              (errorText, errorIndex) => (
                                <li
                                  key={`error-${row.rowNumber}-${errorIndex}`}
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
                Excel, kemudian pilih ulang file apabila
                seluruh data ingin dimasukkan.
              </p>
            )}
          </div>
        )}
      </div>

      <div
        id="form-kegiatan"
        className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingId
                ? "Perbaiki Data Kegiatan"
                : "Formulir Kegiatan Tridarma"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {editingId
                ? "Perbaiki data dan dokumen sesuai catatan GPM."
                : "Data baru otomatis berstatus pending."}
            </p>
          </div>

          {editingId && (
            <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
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
            label="Jenis kegiatan"
            htmlFor="jenis_kegiatan"
            required
          >
            <select
              id="jenis_kegiatan"
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

          {/* Tahun kegiatan */}
<FormField
  label="Tahun kegiatan"
  htmlFor="tahun"
  required
>
  <input
    id="tahun"
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

{/* Semester dan Tahun Akademik */}
<div className="md:col-span-2">
  <div className="grid gap-5 md:grid-cols-2">
    <FormField
      label="Semester"
      htmlFor="semester_kegiatan"
      required
    >
      <select
        id="semester_kegiatan"
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

    <FormField
        label="Tahun akademik"
        htmlFor="tahun_akademik_kegiatan"
        required
        >
        <select
            id="tahun_akademik_kegiatan"
            name="tahun_akademik"
            value={form.tahun_akademik}
            onChange={handleChange}
            className={inputClassName}
            required
        >
            {ACADEMIC_YEAR_OPTIONS.map(
            (academicYear) => (
                <option
                key={academicYear}
                value={academicYear}
                >
                {academicYear}
                </option>
            ),
            )}
        </select>
        </FormField>
    </div>
    </div>

    {/* Judul kegiatan */}
    <div className="md:col-span-2">
    <FormField
        label="Judul kegiatan"
        htmlFor="judul"
        required
    >
        <textarea
        id="judul"
        name="judul"
        rows="3"
        value={form.judul}
        onChange={handleChange}
        placeholder="Masukkan judul penelitian atau PkM"
        className={inputClassName}
        required
        />
    </FormField>
    </div>

    {/* Ketua kegiatan dan identitas ketua */}
    <div className="md:col-span-2">
    <div className="grid gap-5 md:grid-cols-2">
        <FormField
        label="Ketua kegiatan"
        htmlFor="ketua_kegiatan"
        required
        >
        <input
            id="ketua_kegiatan"
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
        label="NIDN/NUPTK/NIP ketua"
        htmlFor="ketua_identitas"
        required
        >
        <input
            id="ketua_identitas"
            name="ketua_identitas"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.ketua_identitas}
            onChange={(event) =>
            setForm((currentForm) => ({
                ...currentForm,
                ketua_identitas:
                onlyDigits(event.target.value),
            }))
            }
            placeholder="Masukkan angka saja"
            className={inputClassName}
            required
        />
        </FormField>
    </div>
    </div>

    <div className="md:col-span-2">
    <div className="mb-3 flex items-center justify-between">
        <div>
        <h4 className="font-semibold text-slate-800">
            Anggota dosen
        </h4>

        <p className="mt-1 text-xs text-slate-500">
            Opsional. Tambahkan nama dan
            NIDN/NUPTK/NIP setiap anggota.
        </p>
        </div>

        <button
        type="button"
        onClick={addAnggotaDosen}
        className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm font-semibold text-[#881337] hover:bg-[#FFE4E6]"
        >
        + Tambah Anggota
        </button>
    </div>

    <div className="space-y-3">
        {(form.anggota_dosen_data ?? []).map(
        (anggota, index) => (
            <div
            key={`anggota-${index}`}
            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
            >
            <input
                type="text"
                value={anggota.nama}
                onChange={(event) =>
                handleAnggotaDosenChange(
                    index,
                    "nama",
                    event.target.value,
                )
                }
                placeholder="Nama anggota dosen"
                className={inputClassName}
            />

            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={anggota.identitas}
                onChange={(event) =>
                handleAnggotaDosenChange(
                    index,
                    "identitas",
                    event.target.value,
                )
                }
                placeholder="NIDN/NUPTK/NIP"
                className={inputClassName}
            />

            {(form.anggota_dosen_data ?? [])
                .length > 1 && (
                <button
                type="button"
                onClick={() =>
                    removeAnggotaDosen(index)
                }
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                Hapus
                </button>
            )}
            </div>
        ),
        )}
    </div>
    </div>      

    <div className="md:col-span-2">
    <div className="mb-3 flex items-center justify-between">
        <div>
        <h4 className="font-semibold text-slate-800">
            Mahasiswa terlibat
        </h4>

        <p className="mt-1 text-xs text-slate-500">
            Opsional. Tambahkan nama dan NIM setiap
            mahasiswa.
        </p>
        </div>

        <button
        type="button"
        onClick={addMahasiswa}
        className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm font-semibold text-[#881337] hover:bg-[#FFE4E6]"
        >
        + Tambah Mahasiswa
        </button>
    </div>

    <div className="space-y-3">
        {(form.mahasiswa_data ?? []).map(
        (mahasiswa, index) => (
            <div
            key={`mahasiswa-${index}`}
            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
            >
            <input
                type="text"
                value={mahasiswa.nama}
                onChange={(event) =>
                handleMahasiswaChange(
                    index,
                    "nama",
                    event.target.value,
                )
                }
                placeholder="Nama mahasiswa"
                className={inputClassName}
            />

            <input
                id={`mahasiswa-nim-${index}`}
                type="text"
                inputMode="text"
                pattern="[A-Za-z0-9]*"
                value={mahasiswa.nim ?? ""}
                onChange={(event) =>
                    handleMahasiswaChange(
                    index,
                    "nim",
                    event.target.value,
                    )
                }
                placeholder="NIM, huruf dan angka"
                className={inputClassName}
                />

            {(form.mahasiswa_data ?? [])
                .length > 1 && (
                <button
                type="button"
                onClick={() =>
                    removeMahasiswa(index)
                }
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                Hapus
                </button>
            )}
            </div>
        ),
        )}
    </div>
    </div>
 
          <FormField
            label="Sumber dana"
            htmlFor="sumber_dana"
          >
            <input
              id="sumber_dana"
              name="sumber_dana"
              type="text"
              value={form.sumber_dana}
              onChange={handleChange}
              placeholder="Internal, DRTPM, mandiri, mitra"
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Jumlah dana (Rp)"
            htmlFor="jumlah_dana"
            >
            <input
                id="jumlah_dana"
                name="jumlah_dana"
                type="text"
                inputMode="numeric"
                value={formatNominalInput(
                form.jumlah_dana,
                )}
                onChange={handleFundingChange}
                placeholder="Contoh: 10.000.000"
                className={inputClassName}
            />

            <p className="mt-2 text-xs text-slate-500">
                Masukkan angka. Pemisah ribuan ditambahkan
                secara otomatis.
            </p>
            </FormField>

          <FormField
            label="Jenis indikator"
            htmlFor="jenis_indikator"
          >
            <select
              id="jenis_indikator"
              name="jenis_indikator"
              value={form.jenis_indikator}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="">
                Belum ditentukan
              </option>

              <option value="IKU">
                IKU
              </option>

              <option value="IKT">
                IKT
              </option>
            </select>
          </FormField>

          <FormField
            label="Kode indikator"
            htmlFor="kode_indikator"
          >
            <input
              id="kode_indikator"
              name="kode_indikator"
              type="text"
              value={form.kode_indikator}
              onChange={handleChange}
              placeholder="Contoh: IKU-PEN-01"
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
                Tautan publikasi, DOI, repository, Google
                Drive, OneDrive, HKI, atau sumber bukti lainnya.
                </p>
            </FormField>
            </div>


          <div className="md:col-span-2">
            <FormField
              label="Dokumen bukti tambahan"
              htmlFor="dokumen_bukti_luaran"
             
            >
              <input
                key={fileInputKey}
                id="dokumen_bukti"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#FFF1F2] file:px-4 file:py-2 file:font-semibold file:text-[#881337] hover:file:bg-[#FFE4E6]"
              />

              <p className="mt-2 text-xs text-slate-500">
                Format: PDF, JPG, PNG, Word, atau Excel.
                Maksimal 6 MB.
              </p>

              {evidenceFile && (
                <div className="mt-3 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] p-3 text-sm text-[#881337]">
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
                        openEvidence(
                          existingEvidencePath,
                        )
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
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal Memperbaiki
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-6 py-3 font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#FDA4AF] disabled:bg-none"
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

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Riwayat Pengajuan
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Daftar penelitian dan PkM yang pernah dikirim.
            </p>
          </div>

          <button
            type="button"
            onClick={loadActivities}
            disabled={loadingData}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {loadingData
              ? "Memuat..."
              : "Perbarui"}
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
              {activities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-slate-100 align-top"
                >
                  <td className="px-3 py-4 text-sm text-slate-700">
                    {activity.jenis_kegiatan === "pkm"
                      ? "PkM"
                      : "Penelitian"}
                  </td>

                  <td className="max-w-md px-3 py-4">
                    <p className="font-medium text-slate-900">
                      {activity.judul}
                    </p>

                    {activity.catatan_revisi_gpm && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-semibold uppercase text-red-700">
                          Catatan GPM
                        </p>

                        <p className="mt-1 text-sm text-red-700">
                          {activity.catatan_revisi_gpm}
                        </p>
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-4 text-sm text-slate-700">
                    {activity.tahun}
                  </td>

                  <td className="px-3 py-4 text-sm text-slate-700">
                    <p>
                      {activity.jenis_indikator || "-"}
                    </p>

                    {activity.kode_indikator && (
                      <p className="mt-1 text-xs text-slate-500">
                        {activity.kode_indikator}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex flex-col items-start gap-2">
                        {activity.link_bukti ? (
                        <a
                            href={activity.link_bukti}
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

                        {activity.dokumen_bukti_path && (
                        <button
                            type="button"
                            onClick={() =>
                            openEvidence(activity.dokumen_bukti_path)
                            }
                            disabled={
                            openingFile === activity.dokumen_bukti_path
                            }
                            className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm font-semibold text-[#881337] hover:bg-[#FFE4E6] disabled:opacity-50"
                        >
                            {openingFile === activity.dokumen_bukti_path
                            ? "Membuka..."
                            : "Buka File Tambahan"}
                        </button>
                        )}
                    </div>
                    </td>

                  <td className="px-3 py-4">
                    <StatusBadge
                      status={activity.status_gpm}
                    />
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex justify-end">
                      {activity.status_gpm ===
                        "rejected" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(activity)
                          }
                          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                        >
                          Edit dan Kirim Ulang
                        </button>
                      )}

                      {activity.status_gpm ===
                        "pending" && (
                        <span className="text-sm text-slate-500">
                          Menunggu pemeriksaan
                        </span>
                      )}

                      {activity.status_gpm ===
                        "approved" && (
                        <span className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                          Data terkunci
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!loadingData &&
                activities.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      Belum ada kegiatan yang dikirim.
                    </td>
                  </tr>
                )}

              {loadingData && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    Memuat data kegiatan...
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
          <span className="ml-1 text-red-600">
            *
          </span>
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
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#881337] focus:ring-4 focus:ring-[#FFE4E6]";

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
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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

function parseImportedPeople(value, idField) {
  const text = String(value ?? "").trim();

  if (!text) {
    return {
      rows: [],
      errors: [],
    };
  }

  const entries = text
    .split(/\r?\n|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const rows = [];
  const errors = [];

  entries.forEach((entry, index) => {
    const separatorIndex = entry.indexOf("|");

    if (separatorIndex < 0) {
      errors.push(
        `Entri ke-${index + 1} harus menggunakan format Nama|${
          idField === "nim" ? "NIM" : "Identitas"
        }.`,
      );
      return;
    }

    const nama = entry
      .slice(0, separatorIndex)
      .trim();

    const rawIdentity = entry
      .slice(separatorIndex + 1)
      .trim();

    const identity =
      idField === "nim"
        ? normalizeNim(rawIdentity)
        : onlyDigits(rawIdentity);

    if (!nama || !identity) {
      errors.push(
        `Entri ke-${index + 1} belum memiliki nama dan ${
          idField === "nim"
            ? "NIM"
            : "NIDN/NUPTK/NIP"
        } yang lengkap.`,
      );
      return;
    }

    rows.push({
      nama,
      [idField]: identity,
    });
  });

  return {
    rows,
    errors,
  };
}

function validateImportedActivityRow(row, rowNumber) {
  const errors = [];

  const jenisKegiatan =
    normalizeImportedActivityType(
      getExcelText(row, [
        "Jenis Kegiatan",
        "jenis_kegiatan",
      ]),
    );

  if (!jenisKegiatan) {
    errors.push(
      "Jenis Kegiatan harus Penelitian atau PkM.",
    );
  }

  const yearText = getExcelText(row, [
    "Tahun",
    "tahun",
  ]);

  const tahun = Number(onlyDigits(yearText));

  if (
    !Number.isInteger(tahun) ||
    tahun < 2000 ||
    tahun > 2100
  ) {
    errors.push(
      "Tahun harus berupa angka antara 2000 dan 2100.",
    );
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

  const academicYearMatch =
    tahunAkademik.match(/^(\d{4})\/(\d{4})$/);

  if (
    !academicYearMatch ||
    Number(academicYearMatch?.[2]) !==
      Number(academicYearMatch?.[1]) + 1
  ) {
    errors.push(
      "Tahun Akademik harus menggunakan format berurutan, misalnya 2026/2027.",
    );
  }

  const judul = getExcelText(row, [
    "Judul Kegiatan",
    "Judul",
    "judul",
  ]);

  if (!judul) {
    errors.push("Judul Kegiatan wajib diisi.");
  }

  const ketuaKegiatan = getExcelText(row, [
    "Ketua Kegiatan",
    "ketua_kegiatan",
  ]);

  if (!ketuaKegiatan) {
    errors.push("Ketua Kegiatan wajib diisi.");
  }

  const ketuaIdentityText = getExcelText(row, [
    "Identitas Ketua",
    "NIDN/NUPTK/NIP Ketua",
    "ketua_identitas",
  ]);

  const ketuaIdentitas = onlyDigits(
    ketuaIdentityText,
  );

  if (!ketuaIdentitas) {
    errors.push(
      "Identitas Ketua wajib diisi dengan angka.",
    );
  }

  const anggotaResult = parseImportedPeople(
    findExcelValue(row, [
      "Anggota Dosen",
      "anggota_dosen",
    ]),
    "identitas",
  );

  errors.push(
    ...anggotaResult.errors.map(
      (error) => `Anggota Dosen: ${error}`,
    ),
  );

  const mahasiswaResult = parseImportedPeople(
    findExcelValue(row, [
      "Mahasiswa Terlibat",
      "Mahasiswa",
      "mahasiswa_terlibat",
    ]),
    "nim",
  );

  errors.push(
    ...mahasiswaResult.errors.map(
      (error) => `Mahasiswa: ${error}`,
    ),
  );

  const sumberDana = getExcelText(row, [
    "Sumber Dana",
    "sumber_dana",
  ]);

  const amountValue = findExcelValue(row, [
    "Jumlah Dana",
    "jumlah_dana",
  ]);

  const jumlahDanaText = onlyDigits(amountValue);
  const jumlahDana = jumlahDanaText
    ? Number(jumlahDanaText)
    : 0;

  if (!Number.isFinite(jumlahDana)) {
    errors.push("Jumlah Dana tidak valid.");
  }

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
      tahun,
      semester,
      tahun_akademik: tahunAkademik,
      judul,
      ketua_kegiatan: ketuaKegiatan,
      ketua_identitas: ketuaIdentitas,
      anggota_dosen_data: anggotaResult.rows,
      mahasiswa_data: mahasiswaResult.rows,
      sumber_dana: sumberDana,
      jumlah_dana: jumlahDana,
      jenis_indikator: jenisIndikator,
      kode_indikator: kodeIndikator,
      link_bukti: linkBukti,
    },
  };
}

function createActivityDuplicateKey(activity) {
  return [
    String(activity?.jenis_kegiatan ?? "")
      .trim()
      .toLowerCase(),
    String(activity?.tahun ?? "").trim(),
    String(activity?.judul ?? "")
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
    const url = new URL(value.trim());

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeNim(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatNominalInput(value) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(
    Number(digits),
  );
}

function getDefaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return month >= 7
    ? `${year}/${year + 1}`
    : `${year - 1}/${year}`;
}

function createAcademicYearOptions() {
  const currentYear =
    new Date().getFullYear();

  return Array.from(
    {
      length: 14,
    },
    (_, index) => {
      const startYear =
        currentYear + 3 - index;

      return `${startYear}/${startYear + 1}`;
    },
  );
}

function preparePeopleRows(rows, idField) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      nama:
        String(row?.nama ?? "").trim(),

      [idField]:
        idField === "nim"
          ? normalizeNim(row?.[idField])
          : onlyDigits(row?.[idField]),
    }))
    .filter(
      (row) =>
        row.nama ||
        row[idField],
    );
}

function normalizePeopleRows(
  jsonRows,
  legacyText,
  idField,
) {
  if (
    Array.isArray(jsonRows) &&
    jsonRows.length > 0
  ) {
    const normalizedRows = jsonRows
      .map((row) => ({
        nama:
          String(row?.nama ?? "").trim(),

        [idField]:
        idField === "nim"
            ? normalizeNim(row?.[idField])
            : onlyDigits(row?.[idField]),
        }))
      .filter(
        (row) =>
          row.nama ||
          row[idField],
      );

    if (normalizedRows.length > 0) {
      return normalizedRows;
    }
  }

  const legacyNames =
    String(legacyText ?? "")
      .split(/\r?\n|,/)
      .map((name) => name.trim())
      .filter(Boolean);

  if (legacyNames.length > 0) {
    return legacyNames.map((name) => ({
      nama: name,
      [idField]: "",
    }));
  }

  return [
    {
      nama: "",
      [idField]: "",
    },
  ];
}

export default DosenDashboard;