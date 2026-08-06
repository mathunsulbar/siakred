import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const BUCKET_NAME = "bukti-akreditasi";
const MAX_FILE_SIZE = 6 * 1024 * 1024;

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
    ketua_kegiatan: "",
    anggota_dosen: "",
    mahasiswa_terlibat: "",
    sumber_dana: "",
    jumlah_dana: "",
    jenis_indikator: "",
    kode_indikator: "",
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

  const loadActivities = useCallback(async () => {
    try {
      setLoadingData(true);

      const { data, error } = await supabase
        .from("kegiatan_tridarma")
        .select(`
          id,
          jenis_kegiatan,
          judul,
          tahun,
          ketua_kegiatan,
          anggota_dosen,
          mahasiswa_terlibat,
          sumber_dana,
          jumlah_dana,
          jenis_indikator,
          kode_indikator,
          dokumen_bukti_path,
          status_gpm,
          catatan_revisi_gpm,
          created_at,
          updated_at
        `)
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
  }, []);

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

      judul: activity.judul ?? "",

      tahun:
        activity.tahun ?? new Date().getFullYear(),

      ketua_kegiatan:
        activity.ketua_kegiatan ?? "",

      anggota_dosen:
        activity.anggota_dosen ?? "",

      mahasiswa_terlibat:
        activity.mahasiswa_terlibat ?? "",

      sumber_dana:
        activity.sumber_dana ?? "",

      jumlah_dana:
        activity.jumlah_dana ?? "",

      jenis_indikator:
        activity.jenis_indikator ?? "",

      kode_indikator:
        activity.kode_indikator ?? "",
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

  async function uploadEvidence(file, activityType) {
    const safeFileName = createSafeFileName(file.name);

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const filePath =
      `${userId}/${activityType}/${uniqueName}`;

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

    if (!form.judul.trim()) {
      setMessageType("error");
      setMessage("Judul kegiatan wajib diisi.");
      return;
    }

    if (!form.ketua_kegiatan.trim()) {
      setMessageType("error");
      setMessage("Nama ketua kegiatan wajib diisi.");
      return;
    }

    if (
      !editingId &&
      !evidenceFile
    ) {
      setMessageType("error");
      setMessage(
        "Dokumen bukti wajib dipilih sebelum data dikirim.",
      );
      return;
    }

    if (
      editingId &&
      !evidenceFile &&
      !existingEvidencePath
    ) {
      setMessageType("error");
      setMessage(
        "Dokumen bukti wajib tersedia sebelum data dikirim ulang.",
      );
      return;
    }

    const jumlahDana =
      form.jumlah_dana === ""
        ? 0
        : Number(form.jumlah_dana);

    if (
      Number.isNaN(jumlahDana) ||
      jumlahDana < 0
    ) {
      setMessageType("error");
      setMessage("Jumlah dana tidak valid.");
      return;
    }

    let newUploadedPath = null;

    try {
      setSaving(true);
      setMessage("");
      setMessageType("");

      if (evidenceFile) {
        newUploadedPath = await uploadEvidence(
          evidenceFile,
          form.jenis_kegiatan,
        );
      }

      const finalEvidencePath =
        newUploadedPath ||
        existingEvidencePath;

      const activityData = {
        jenis_kegiatan: form.jenis_kegiatan,
        judul: form.judul.trim(),
        tahun: Number(form.tahun),

        ketua_kegiatan:
          form.ketua_kegiatan.trim(),

        anggota_dosen:
          form.anggota_dosen.trim() || null,

        mahasiswa_terlibat:
          form.mahasiswa_terlibat.trim() || null,

        sumber_dana:
          form.sumber_dana.trim() || null,

        jumlah_dana: jumlahDana,

        jenis_indikator:
          form.jenis_indikator || null,

        kode_indikator:
          form.kode_indikator.trim() || null,

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
          "Perbaikan dan dokumen bukti berhasil dikirim ulang ke GPM.",
        );
      } else {
        const { error } = await supabase
          .from("kegiatan_tridarma")
          .insert({
            ...activityData,
            dosen_id: userId,
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
            label="Anggota dosen"
            htmlFor="anggota_dosen"
          >
            <input
              id="anggota_dosen"
              name="anggota_dosen"
              type="text"
              value={form.anggota_dosen}
              onChange={handleChange}
              placeholder="Pisahkan dengan tanda koma"
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Mahasiswa terlibat"
            htmlFor="mahasiswa_terlibat"
          >
            <input
              id="mahasiswa_terlibat"
              name="mahasiswa_terlibat"
              type="text"
              value={form.mahasiswa_terlibat}
              onChange={handleChange}
              placeholder="Nama atau jumlah mahasiswa"
              className={inputClassName}
            />
          </FormField>

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
            label="Jumlah dana"
            htmlFor="jumlah_dana"
          >
            <input
              id="jumlah_dana"
              name="jumlah_dana"
              type="number"
              min="0"
              step="1000"
              value={form.jumlah_dana}
              onChange={handleChange}
              placeholder="Contoh: 15000000"
              className={inputClassName}
            />
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
              label="Dokumen bukti"
              htmlFor="dokumen_bukti"
              required={!editingId}
            >
              <input
                key={fileInputKey}
                id="dokumen_bukti"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Format: PDF, JPG, PNG, Word, atau Excel.
                Maksimal 6 MB.
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
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
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
                    {activity.dokumen_bukti_path ? (
                      <button
                        type="button"
                        onClick={() =>
                          openEvidence(
                            activity.dokumen_bukti_path,
                          )
                        }
                        disabled={
                          openingFile ===
                          activity.dokumen_bukti_path
                        }
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        {openingFile ===
                        activity.dokumen_bukti_path
                          ? "Membuka..."
                          : "Lihat Bukti"}
                      </button>
                    ) : (
                      <span className="text-sm text-red-600">
                        Belum ada
                      </span>
                    )}
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
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export default DosenDashboard;