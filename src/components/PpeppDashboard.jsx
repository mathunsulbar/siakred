import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

function createInitialForm() {
  return {
    tahun: new Date().getFullYear(),
    ranah: "penelitian",
    jenis_indikator: "IKU",
    kode_indikator: "",
    nama_indikator: "",
    satuan: "persen",
    target_nilai: "",
    realisasi_nilai: "",
    uraian_penetapan: "",
    uraian_pelaksanaan: "",
    hasil_evaluasi_ami: "",
    tindakan_pengendalian: "",
    rencana_peningkatan: "",
    status_siklus: "draft",
  };
}

function PpeppDashboard({ userId }) {
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState(null);

  const [indicators, setIndicators] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const loadIndicators = useCallback(async () => {
    try {
      setLoadingData(true);
      setMessage("");

      const { data, error } = await supabase
        .from("siklus_ppepp")
        .select("*")
        .order("tahun", { ascending: false })
        .order("ranah", { ascending: true })
        .order("jenis_indikator", { ascending: true })
        .order("kode_indikator", { ascending: true });

      if (error) {
        throw error;
      }

      setIndicators(data ?? []);
    } catch (error) {
      console.error("Gagal membaca data PPEPP:", error);

      setMessageType("error");
      setMessage(
        error.message ||
          "Data siklus PPEPP belum dapat dimuat.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(createInitialForm());
    setEditingId(null);
  }

  function handleEdit(indicator) {
    setEditingId(indicator.id);

    setForm({
      tahun:
        indicator.tahun ?? new Date().getFullYear(),

      ranah:
        indicator.ranah ?? "penelitian",

      jenis_indikator:
        indicator.jenis_indikator ?? "IKU",

      kode_indikator:
        indicator.kode_indikator ?? "",

      nama_indikator:
        indicator.nama_indikator ?? "",

      satuan:
        indicator.satuan ?? "persen",

      target_nilai:
        indicator.target_nilai ?? "",

      realisasi_nilai:
        indicator.realisasi_nilai ?? "",

      uraian_penetapan:
        indicator.uraian_penetapan ?? "",

      uraian_pelaksanaan:
        indicator.uraian_pelaksanaan ?? "",

      hasil_evaluasi_ami:
        indicator.hasil_evaluasi_ami ?? "",

      tindakan_pengendalian:
        indicator.tindakan_pengendalian ?? "",

      rencana_peningkatan:
        indicator.rencana_peningkatan ?? "",

      status_siklus:
        indicator.status_siklus ?? "draft",
    });

    setMessage("");
    setMessageType("");

    setTimeout(() => {
      document
        .getElementById("form-ppepp")
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

    if (!form.kode_indikator.trim()) {
      setMessageType("error");
      setMessage("Kode indikator wajib diisi.");
      return;
    }

    if (!form.nama_indikator.trim()) {
      setMessageType("error");
      setMessage("Nama indikator wajib diisi.");
      return;
    }

    const targetValue = Number(form.target_nilai);
    const realizationValue = Number(form.realisasi_nilai || 0);

    if (
      Number.isNaN(targetValue) ||
      targetValue < 0
    ) {
      setMessageType("error");
      setMessage("Nilai target tidak valid.");
      return;
    }

    if (
      Number.isNaN(realizationValue) ||
      realizationValue < 0
    ) {
      setMessageType("error");
      setMessage("Nilai realisasi tidak valid.");
      return;
    }

    const payload = {
      tahun: Number(form.tahun),
      ranah: form.ranah,
      jenis_indikator: form.jenis_indikator,

      kode_indikator:
        form.kode_indikator.trim().toUpperCase(),

      nama_indikator:
        form.nama_indikator.trim(),

      satuan:
        form.satuan.trim() || "persen",

      target_nilai: targetValue,
      realisasi_nilai: realizationValue,

      uraian_penetapan:
        form.uraian_penetapan.trim() || null,

      uraian_pelaksanaan:
        form.uraian_pelaksanaan.trim() || null,

      hasil_evaluasi_ami:
        form.hasil_evaluasi_ami.trim() || null,

      tindakan_pengendalian:
        form.tindakan_pengendalian.trim() || null,

      rencana_peningkatan:
        form.rencana_peningkatan.trim() || null,

      status_siklus: form.status_siklus,
      updated_by: userId,
    };

    try {
      setSaving(true);
      setMessage("");
      setMessageType("");

      if (editingId) {
        const { error } = await supabase
          .from("siklus_ppepp")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        setMessage(
          "Data siklus PPEPP berhasil diperbarui.",
        );
      } else {
        const { error } = await supabase
          .from("siklus_ppepp")
          .insert({
            ...payload,
            created_by: userId,
          });

        if (error) {
          throw error;
        }

        setMessage(
          "Indikator PPEPP berhasil ditambahkan.",
        );
      }

      setMessageType("success");
      resetForm();

      await loadIndicators();
    } catch (error) {
      console.error("Gagal menyimpan PPEPP:", error);

      setMessageType("error");

      if (error.code === "23505") {
        setMessage(
          "Kode indikator tersebut sudah digunakan pada tahun, ranah, dan jenis indikator yang sama.",
        );
      } else if (
        error.message?.includes("row-level security")
      ) {
        setMessage(
          "Data ditolak sistem keamanan. Pastikan akun memiliki role Reviewer GPM.",
        );
      } else {
        setMessage(
          error.message ||
            "Data PPEPP gagal disimpan.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const ikuRows = indicators.filter(
      (item) => item.jenis_indikator === "IKU",
    );

    const iktRows = indicators.filter(
      (item) => item.jenis_indikator === "IKT",
    );

    return {
      total: indicators.length,
      iku: ikuRows.length,
      ikt: iktRows.length,

      achieved: indicators.filter(
        (item) =>
          calculateAchievement(item) >= 100,
      ).length,
    };
  }, [indicators]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Siklus PPEPP
        </h2>

        <p className="mt-1 text-slate-600">
          Kelola penetapan, pelaksanaan, evaluasi,
          pengendalian, dan peningkatan indikator
          Penelitian serta PkM.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total indikator"
          value={summary.total}
          description="IKU dan IKT"
        />

        <SummaryCard
          title="Indikator IKU"
          value={summary.iku}
          description="Indikator utama"
        />

        <SummaryCard
          title="Indikator IKT"
          value={summary.ikt}
          description="Indikator tambahan"
        />

        <SummaryCard
          title="Target tercapai"
          value={summary.achieved}
          description="Capaian minimal 100%"
        />
      </div>

      <div
        id="form-ppepp"
        className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {editingId
                ? "Perbarui Siklus PPEPP"
                : "Tambah Indikator PPEPP"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Satu baris mewakili satu indikator dalam satu
              tahun pelaksanaan.
            </p>
          </div>

          {editingId && (
            <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Mode perubahan
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
            label="Tahun"
            htmlFor="ppepp_tahun"
            required
          >
            <input
              id="ppepp_tahun"
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
            label="Ranah"
            htmlFor="ppepp_ranah"
            required
          >
            <select
              id="ppepp_ranah"
              name="ranah"
              value={form.ranah}
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
            label="Jenis indikator"
            htmlFor="ppepp_jenis_indikator"
            required
          >
            <select
              id="ppepp_jenis_indikator"
              name="jenis_indikator"
              value={form.jenis_indikator}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="IKU">IKU</option>
              <option value="IKT">IKT</option>
            </select>
          </FormField>

          <FormField
            label="Kode indikator"
            htmlFor="ppepp_kode_indikator"
            required
          >
            <input
              id="ppepp_kode_indikator"
              name="kode_indikator"
              type="text"
              value={form.kode_indikator}
              onChange={handleChange}
              placeholder="Contoh: IKU-PEN-01"
              className={inputClassName}
              required
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Nama indikator"
              htmlFor="ppepp_nama_indikator"
              required
            >
              <textarea
                id="ppepp_nama_indikator"
                name="nama_indikator"
                rows="2"
                value={form.nama_indikator}
                onChange={handleChange}
                placeholder="Contoh: Persentase DTPS yang menjadi ketua penelitian"
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Satuan"
            htmlFor="ppepp_satuan"
            required
          >
            <select
              id="ppepp_satuan"
              name="satuan"
              value={form.satuan}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="persen">Persen</option>
              <option value="kegiatan">Kegiatan</option>
              <option value="publikasi">Publikasi</option>
              <option value="orang">Orang</option>
              <option value="dokumen">Dokumen</option>
              <option value="rupiah">Rupiah</option>
              <option value="produk">Produk</option>
            </select>
          </FormField>

          <FormField
            label="Status siklus"
            htmlFor="ppepp_status_siklus"
            required
          >
            <select
              id="ppepp_status_siklus"
              name="status_siklus"
              value={form.status_siklus}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="draft">Draft</option>
              <option value="berjalan">Berjalan</option>
              <option value="dievaluasi">Dievaluasi</option>
              <option value="selesai">Selesai</option>
            </select>
          </FormField>

          <FormField
            label="Target"
            htmlFor="ppepp_target"
            required
          >
            <input
              id="ppepp_target"
              name="target_nilai"
              type="number"
              min="0"
              step="0.01"
              value={form.target_nilai}
              onChange={handleChange}
              placeholder="Contoh: 60"
              className={inputClassName}
              required
            />
          </FormField>

          <FormField
            label="Realisasi"
            htmlFor="ppepp_realisasi"
          >
            <input
              id="ppepp_realisasi"
              name="realisasi_nilai"
              type="number"
              min="0"
              step="0.01"
              value={form.realisasi_nilai}
              onChange={handleChange}
              placeholder="Contoh: 45"
              className={inputClassName}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Penetapan"
              htmlFor="ppepp_penetapan"
            >
              <textarea
                id="ppepp_penetapan"
                name="uraian_penetapan"
                rows="3"
                value={form.uraian_penetapan}
                onChange={handleChange}
                placeholder="Uraikan dasar penetapan target indikator."
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Pelaksanaan"
              htmlFor="ppepp_pelaksanaan"
            >
              <textarea
                id="ppepp_pelaksanaan"
                name="uraian_pelaksanaan"
                rows="3"
                value={form.uraian_pelaksanaan}
                onChange={handleChange}
                placeholder="Uraikan pelaksanaan kegiatan untuk mencapai target."
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Evaluasi AMI"
              htmlFor="ppepp_evaluasi"
            >
              <textarea
                id="ppepp_evaluasi"
                name="hasil_evaluasi_ami"
                rows="3"
                value={form.hasil_evaluasi_ami}
                onChange={handleChange}
                placeholder="Tuliskan hasil evaluasi atau temuan AMI."
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Pengendalian"
              htmlFor="ppepp_pengendalian"
            >
              <textarea
                id="ppepp_pengendalian"
                name="tindakan_pengendalian"
                rows="3"
                value={form.tindakan_pengendalian}
                onChange={handleChange}
                placeholder="Tuliskan tindakan koreksi atau pengendalian."
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Peningkatan"
              htmlFor="ppepp_peningkatan"
            >
              <textarea
                id="ppepp_peningkatan"
                name="rencana_peningkatan"
                rows="3"
                value={form.rencana_peningkatan}
                onChange={handleChange}
                placeholder="Tuliskan rencana peningkatan standar atau target berikutnya."
                className={inputClassName}
              />
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
                Batal Mengubah
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#000080] px-6 py-3 font-semibold text-white hover:bg-[#000066] disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Tambah Indikator"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Daftar Indikator PPEPP
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Capaian dihitung dari realisasi dibagi target.
            </p>
          </div>

          <button
            type="button"
            onClick={loadIndicators}
            disabled={loadingData}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {loadingData ? "Memuat..." : "Perbarui"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <TableHeading>Tahun</TableHeading>
                <TableHeading>Ranah</TableHeading>
                <TableHeading>Indikator</TableHeading>
                <TableHeading>Nama indikator</TableHeading>
                <TableHeading>Target</TableHeading>
                <TableHeading>Realisasi</TableHeading>
                <TableHeading>Capaian</TableHeading>
                <TableHeading>Status</TableHeading>
                <TableHeading align="right">
                  Aksi
                </TableHeading>
              </tr>
            </thead>

            <tbody>
              {indicators.map((indicator) => {
                const achievement =
                  calculateAchievement(indicator);

                return (
                  <tr
                    key={indicator.id}
                    className="border-b border-slate-100 align-top"
                  >
                    <td className="px-3 py-4 text-sm text-slate-700">
                      {indicator.tahun}
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-700">
                      {indicator.ranah === "pkm"
                        ? "PkM"
                        : "Penelitian"}
                    </td>

                    <td className="px-3 py-4">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                        {indicator.jenis_indikator}
                      </span>

                      <p className="mt-2 text-xs text-slate-500">
                        {indicator.kode_indikator}
                      </p>
                    </td>

                    <td className="max-w-sm px-3 py-4">
                      <p className="font-medium text-slate-900">
                        {indicator.nama_indikator}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Satuan: {indicator.satuan}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-700">
                      {formatNumber(indicator.target_nilai)}
                    </td>

                    <td className="px-3 py-4 text-sm text-slate-700">
                      {formatNumber(indicator.realisasi_nilai)}
                    </td>

                    <td className="px-3 py-4">
                      <AchievementBadge
                        achievement={achievement}
                      />
                    </td>

                    <td className="px-3 py-4">
                      <CycleStatusBadge
                        status={indicator.status_siklus}
                      />
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(indicator)
                          }
                          className="rounded-lg border border-[#000080]/20 bg-[#000080]/5 px-4 py-2 text-sm font-semibold text-[#000080] hover:bg-blue-100"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loadingData && indicators.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    className="px-3 py-12 text-center text-slate-500"
                  >
                    Belum ada indikator PPEPP.
                  </td>
                </tr>
              )}

              {loadingData && (
                <tr>
                  <td
                    colSpan="9"
                    className="px-3 py-12 text-center text-slate-500"
                  >
                    Memuat data PPEPP...
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

function calculateAchievement(indicator) {
  const target = Number(indicator.target_nilai);
  const realization = Number(indicator.realisasi_nilai);

  if (!target || target <= 0) {
    return 0;
  }

  return Math.round((realization / target) * 100);
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function AchievementBadge({ achievement }) {
  let style =
    "border-red-200 bg-red-50 text-red-700";

  if (achievement >= 100) {
    style =
      "border-green-200 bg-green-50 text-green-700";
  } else if (achievement >= 75) {
    style =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {achievement}%
    </span>
  );
}

function CycleStatusBadge({ status }) {
  const labels = {
    draft: "Draft",
    berjalan: "Berjalan",
    dievaluasi: "Dievaluasi",
    selesai: "Selesai",
  };

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
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

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export default PpeppDashboard;