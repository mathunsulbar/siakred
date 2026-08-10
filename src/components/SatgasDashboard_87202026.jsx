import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";

function SatgasDashboard() {
  const currentYear = new Date().getFullYear();

  const [activities, setActivities] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [ppepp, setPpepp] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [yearFilter, setYearFilter] = useState(
    String(currentYear),
  );

  const [domainFilter, setDomainFilter] =
    useState("semua");

  const [statusFilter, setStatusFilter] =
    useState("semua");

  const [searchText, setSearchText] = useState("");

  const [sortConfig, setSortConfig] = useState({
        key: "createdAt",
        direction: "desc",
        });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        activitiesResult,
        outputsResult,
        profilesResult,
        ppeppResult,
      ] = await Promise.all([
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
                status_gpm,
                created_at
            `)
            .order("created_at", {
                ascending: false,
            })
        .order("tahun", { ascending: false }),

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
                sumber_dana,
                jumlah_dana,
                jenis_indikator,
                kode_indikator,
                link_bukti,
                status_gpm,
                created_at
            `)
            .order("created_at", {
                ascending: false,
            }),
            
        supabase
          .from("user_profiles")
          .select(`
            user_id,
            nama_lengkap,
            nidn_nip,
            program_studi,
            app_role
          `),

        supabase
          .from("siklus_ppepp")
          .select(`
            id,
            tahun,
            ranah,
            jenis_indikator,
            kode_indikator,
            nama_indikator,
            satuan,
            target_nilai,
            realisasi_nilai,
            status_siklus
          `)
          .order("tahun", { ascending: false }),
      ]);

      const results = [
        activitiesResult,
        outputsResult,
        profilesResult,
        ppeppResult,
      ];

      const failedResult = results.find(
        (result) => result.error,
      );

      if (failedResult?.error) {
        throw failedResult.error;
      }

      setActivities(activitiesResult.data ?? []);
      setOutputs(outputsResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
      setPpepp(ppeppResult.data ?? []);
    } catch (error) {
      console.error(
        "Gagal memuat Dashboard Viewer:",
        error,
      );

      setErrorMessage(
        error.message ||
          "Data Dashboard Viewer belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const profilesById = useMemo(() => {
    const result = {};

    for (const profile of profiles) {
      result[profile.user_id] = profile;
    }

    return result;
  }, [profiles]);

        const combinedData = useMemo(() => {
        const activityRows = activities.map((item) => {
            const profile =
            profilesById[item.dosen_id];

            return {
            id: item.id,
                source: "Kegiatan",

            domain:
                item.jenis_kegiatan,

            createdAt:
                item.created_at,

            year:
                item.tahun,

            semester:
                item.semester ?? "",

            tahunAkademik:
                item.tahun_akademik ?? "",

            category:
                item.jenis_kegiatan === "pkm"
                ? "Pengabdian kepada Masyarakat"
                : "Penelitian",

            namaDosen:
                profile?.nama_lengkap ||
                "Nama dosen belum tersedia",

            nidnNip:
                profile?.nidn_nip || "",

            title:
                item.judul,

            ketuaKegiatan:
                item.ketua_kegiatan ?? "",

            ketuaIdentitas:
                item.ketua_identitas ?? "",

            anggotaDosen:
                formatPeopleData(
                item.anggota_dosen_data,
                item.anggota_dosen,
                "identitas",
                ),

            mahasiswa:
                formatPeopleData(
                item.mahasiswa_data,
                item.mahasiswa_terlibat,
                "nim",
                ),

            indicatorType:
                item.jenis_indikator ?? "",

            indicatorCode:
                item.kode_indikator ?? "",

            status:
                item.status_gpm,

            linkBukti:
                item.link_bukti ?? "",

            fundingSource:
                item.sumber_dana ?? "",

            fundingAmount:
                Number(item.jumlah_dana ?? 0),
            };
        });

        const outputRows = outputs.map((item) => {
            const profile =
            profilesById[item.dosen_id];

            return {
            id: item.id,
            source: "Luaran",

            domain:
                item.jenis_kegiatan ?? "",

            createdAt:
                item.created_at,

            year:
                item.tahun,

            semester:
                item.semester ?? "",

            tahunAkademik:
                item.tahun_akademik ?? "",

            category:
                item.jenis_luaran
                ? `Publikasi/Luaran — ${item.jenis_luaran}`
                : "Publikasi dan Luaran",

            namaDosen:
                profile?.nama_lengkap ||
                "Nama dosen belum tersedia",

            nidnNip:
                profile?.nidn_nip || "",

            title:
                item.judul_luaran,

            ketuaKegiatan:
                item.ketua_kegiatan ?? "",

            ketuaIdentitas:
                item.ketua_identitas ?? "",

            anggotaDosen:
                formatPeopleData(
                item.anggota_dosen_data,
                item.anggota_dosen,
                "identitas",
                ),

            mahasiswa:
                formatPeopleData(
                item.mahasiswa_data,
                item.mahasiswa_terlibat,
                "nim",
                ),

            indicatorType:
                item.jenis_indikator ?? "",

            indicatorCode:
                item.kode_indikator ?? "",

            status:
                item.status_gpm,

            linkBukti:
                item.link_bukti ?? "",

            fundingSource:
                item.sumber_dana ?? "",

            fundingAmount:
                Number(item.jumlah_dana ?? 0),
            };
        });

        return [
            ...activityRows,
            ...outputRows,
        ];
        }, [
        activities,
        outputs,
        profilesById,
        ]);

  const availableYears = useMemo(() => {
    const years = new Set([
      currentYear,
      ...combinedData.map((item) => item.year),
      ...ppepp.map((item) => item.tahun),
    ]);

    return [...years].sort((a, b) => b - a);
  }, [combinedData, ppepp, currentYear]);

  const filteredData = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    return combinedData.filter((item) => {
      const matchesYear =
        yearFilter === "semua" ||
        String(item.year) === yearFilter;

      const matchesDomain =
        domainFilter === "semua" ||
        item.domain === domainFilter;

      const matchesStatus =
        statusFilter === "semua" ||
        item.status === statusFilter;

      const searchableText = [
            item.year,
            item.semester,
            item.tahunAkademik,
            item.category,
            item.namaDosen,
            item.nidnNip,
            item.title,
            item.ketuaKegiatan,
            item.ketuaIdentitas,
            item.anggotaDosen,
            item.mahasiswa,
            item.indicatorType,
            item.indicatorCode,
            item.status,
            item.linkBukti,
            item.fundingSource,
            item.fundingAmount,
            ]
            .filter(
                (value) =>
                value !== null &&
                value !== undefined,
            )
            .join(" ")
            .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return (
        matchesYear &&
        matchesDomain &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    combinedData,
    yearFilter,
    domainFilter,
    statusFilter,
    searchText,
  ]);

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
        direction: "asc",
        };
    });
    }

    const sortedData = useMemo(() => {
    function getSortValue(item, key) {
        switch (key) {
            case "createdAt":
            return item.createdAt
                ? new Date(item.createdAt).getTime()
                : 0;

            case "year":
            return Number(item.year ?? 0);

            case "semester":
            return item.semester ?? "";

            case "tahunAkademik":
            return item.tahunAkademik ?? "";

            case "category":
            return item.category ?? "";

            case "namaDosen":
            return item.namaDosen ?? "";

            case "title":
            return item.title ?? "";

            case "ketuaKegiatan":
            return item.ketuaKegiatan ?? "";

            case "anggotaDosen":
            return item.anggotaDosen ?? "";

            case "mahasiswa":
            return item.mahasiswa ?? "";

            case "indicator":
            return [
                item.indicatorType,
                item.indicatorCode,
            ]
                .filter(Boolean)
                .join(" ");

            case "status":
            return item.status ?? "";

            case "linkBukti":
            return item.linkBukti ?? "";

            case "fundingSource":
            return item.fundingSource ?? "";

            case "fundingAmount":
            return Number(item.fundingAmount ?? 0);

            default:
            return "";
        }
        }

    return [...filteredData].sort((first, second) => {
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
        comparison = firstValue - secondValue;
        } else {
        comparison = String(firstValue).localeCompare(
            String(secondValue),
            "id-ID",
            {
            sensitivity: "base",
            numeric: true,
            },
        );
        }

        return sortConfig.direction === "asc"
        ? comparison
        : comparison * -1;
    });
    }, [filteredData, sortConfig]);

  const filteredPpepp = useMemo(() => {
    return ppepp.filter((item) => {
      const matchesYear =
        yearFilter === "semua" ||
        String(item.tahun) === yearFilter;

      const matchesDomain =
        domainFilter === "semua" ||
        item.ranah === domainFilter;

      return matchesYear && matchesDomain;
    });
  }, [ppepp, yearFilter, domainFilter]);

  const summary = useMemo(() => {
    const activityRows = filteredData.filter(
      (item) => item.source === "Kegiatan",
    );

    const outputRows = filteredData.filter(
      (item) => item.source === "Luaran",
    );

    const approvedRows = filteredData.filter(
      (item) => item.status === "approved",
    );

    const totalFunding = filteredData.reduce(
      (total, item) =>
        total + Number(item.fundingAmount ?? 0),
      0,
    );

    const validPpepp = filteredPpepp.filter(
      (item) => Number(item.target_nilai) > 0,
    );

    const averageAchievement =
      validPpepp.length > 0
        ? validPpepp.reduce((total, item) => {
            const target = Number(item.target_nilai);
            const realization = Number(
              item.realisasi_nilai ?? 0,
            );

            return (
              total + (realization / target) * 100
            );
          }, 0) / validPpepp.length
        : 0;

    return {
      activities: activityRows.length,
      outputs: outputRows.length,
      approved: approvedRows.length,
      totalFunding,
      ppeppAchievement: Math.round(
        averageAchievement,
      ),
    };
  }, [filteredData, filteredPpepp]);

  function exportCsv() {
        if (sortedData.length === 0) {
            window.alert(
            "Tidak ada data yang dapat diekspor.",
            );
            return;
        }

        const headers = [
            "Tahun",
            "Semester",
            "Tahun Akademik",
            "Jenis Kegiatan",
            "Dosen",
            "NIDN/NIP Dosen",
            "Judul",
            "Ketua Kegiatan",
            "NIDN/NUPTK/NIP Ketua",
            "Anggota Dosen",
            "Mahasiswa Terlibat",
            "Jenis Indikator",
            "Kode Indikator",
            "Status GPM",
            "Link Bukti",
            "Sumber Dana",
            "Pendanaan",
        ];

        const rows = sortedData.map((item) => [
            item.year || "",
            formatSemester(item.semester),
            item.tahunAkademik || "",
            item.category || "",
            item.namaDosen || "",
            item.nidnNip || "",
            item.title || "",
            item.ketuaKegiatan || "",
            item.ketuaIdentitas || "",
            item.anggotaDosen || "",
            item.mahasiswa || "",
            item.indicatorType || "",
            item.indicatorCode || "",
            getStatusLabel(item.status),
            item.linkBukti || "",

            item.fundingSource || "",

            Number(item.fundingAmount ?? 0) > 0
            ? Number(item.fundingAmount ?? 0)
            : "",
        ]);

        const csvContent = [
            headers,
            ...rows,
        ]
            .map((row) =>
            row
                .map((value) =>
                escapeCsvValue(value),
                )
                .join(","),
            )
            .join("\r\n");

        const csvWithBom =
            `\uFEFF${csvContent}`;

        const blob = new Blob(
            [csvWithBom],
            {
            type: "text/csv;charset=utf-8;",
            },
        );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        const safeYear =
            yearFilter === "semua"
            ? "semua-tahun"
            : yearFilter;

        const safeDomain =
            domainFilter === "semua"
            ? "semua-bidang"
            : domainFilter;

        link.href = url;

        link.download =
            `rekap-penelitian-publikasi-pengabdian-${safeYear}-${safeDomain}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        }


    function exportPdf() {
        if (sortedData.length === 0) {
            window.alert(
            "Tidak ada data yang dapat diekspor ke PDF.",
            );
            return;
        }

        /*
        * Menggunakan A3 landscape karena jumlah kolom
        * cukup banyak.
        */
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a3",
        });

        const generatedAt =
            new Intl.DateTimeFormat(
            "id-ID",
            {
                dateStyle: "long",
                timeStyle: "short",
            },
            ).format(new Date());

        const domainLabel =
            domainFilter === "penelitian"
            ? "Penelitian"
            : domainFilter === "pkm"
                ? "Pengabdian kepada Masyarakat"
                : "Penelitian, Publikasi, dan Pengabdian";

            /*
            * Ukuran halaman PDF
            */
            const pageWidth =
            doc.internal.pageSize.getWidth();

            /*
            * =====================================================
            * JUDUL LAPORAN
            * =====================================================
            */
            doc.setTextColor(15, 23, 42);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);

            doc.text(
            "REKAP PENELITIAN, PUBLIKASI, DAN PENGABDIAN",
            pageWidth / 2,
            15,
            {
                align: "center",
            },
            );

            doc.setFontSize(12);

            doc.text(
            "SISTEM INFORMASI MONITORING EVALUASI TATA KELOLA DAN REPOSITORI INTERNAL",
            pageWidth / 2,
            23,
            {
                align: "center",
            },
            );

            doc.setFontSize(11);

            doc.text(
            "PROGRAM STUDI MATEMATIKA",
            pageWidth / 2,
            30,
            {
                align: "center",
            },
            );

            /*
            * Garis pemisah judul
            */
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.4);

            doc.line(
            10,
            35,
            pageWidth - 10,
            35,
            );

            /*
            * =====================================================
            * INFORMASI FILTER
            * =====================================================
            */
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
                doc.setTextColor(51, 65, 85);

                doc.text(
                `Ruang lingkup: ${domainLabel}`,
                10,
                42,
                );

                doc.text(
                `Dicetak: ${generatedAt}`,
                pageWidth - 10,
                42,
                {
                    align: "right",
                },
                );
            /*
            * =====================================================
            * RINGKASAN
            * =====================================================
            */
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);

            doc.text(
            "Ringkasan",
            10,
            50,
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);

            doc.text(
            `Kegiatan: ${summary.activities}`,
            10,
            57,
            );

            doc.text(
            `Publikasi/Luaran: ${summary.outputs}`,
            pageWidth * 0.23,
            57,
            );

            doc.text(
            `Disetujui GPM: ${summary.approved}`,
            pageWidth * 0.43,
            57,
            );

            doc.text(
            `Total Pendanaan: ${formatRupiah(
                summary.totalFunding,
            )}`,
            pageWidth * 0.62,
            57,
            );

            doc.text(
            `Capaian PPEPP: ${summary.ppeppAchievement}%`,
            pageWidth - 10,
            57,
            {
                align: "right",
            },
            );

        /*
        * Isi tabel PDF mengikuti tabel rekap.
        */
        const tableRows = sortedData.map((item) => [
            item.year || "-",

            formatSemester(item.semester),

            item.tahunAkademik || "-",

            item.category || "-",

            item.title || "-",

            [
                item.ketuaKegiatan || "-",

                item.ketuaIdentitas
                ? `NIDN/NUPTK/NIP: ${item.ketuaIdentitas}`
                : "",
            ]
                .filter(Boolean)
                .join("\n"),

            item.anggotaDosen || "-",

            item.mahasiswa || "-",

            getStatusLabel(item.status),

            item.linkBukti
                ? "Buka Bukti"
                : "-",

            item.fundingSource || "-",

            Number(item.fundingAmount ?? 0) > 0
                ? formatRupiah(item.fundingAmount)
                : "-",
            ]);

        autoTable(doc, {
            startY: 64,

            head: [[
            "Tahun",
            "Semester",
            "Tahun Akademik",
            "Jenis Kegiatan",
            "Judul",
            "Ketua Kegiatan",
            "Anggota Dosen",
            "Mahasiswa",
            "Status",
            "Link Bukti",
            "Sumber Dana",
            "Pendanaan",
            ]],

            body: tableRows,

            theme: "grid",

            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 2,
                overflow: "linebreak",
                valign: "top",
                textColor: [30, 41, 59],
                lineColor: [203, 213, 225],
                lineWidth: 0.1,
                },

            bodyStyles: {
                fontSize: 8,
                },

                headStyles: {
                fillColor: [136, 19, 55],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8.5,
                halign: "left",
                valign: "middle",
                },

            alternateRowStyles: {
            fillColor: [
                248,
                250,
                252,
            ],
            },

           columnStyles: {
                // Tahun
                0: {
                    cellWidth: 18,
                    halign: "center",
                },

                // Semester
                1: {
                    cellWidth: 22,
                    halign: "center",
                },

                // Tahun Akademik
                2: {
                    cellWidth: 26,
                    halign: "center",
                },

                // Jenis Kegiatan
                3: {
                    cellWidth: 34,
                },

                // Judul
                4: {
                    cellWidth: 70,
                },

                // Ketua Kegiatan
                5: {
                    cellWidth: 42,
                },

                // Anggota Dosen
                6: {
                    cellWidth: 45,
                },

                // Mahasiswa
                7: {
                    cellWidth: 45,
                },

                // Status
                8: {
                    cellWidth: 20,
                    halign: "center",
                },

                // Link Bukti
                9: {
                    cellWidth: 22,
                    halign: "center",
                    textColor: [136, 19, 55],
                    fontStyle: "bold",
                },

                // Sumber Dana
                10: {
                    cellWidth: 24,
                },

                // Pendanaan
                11: {
                    cellWidth: 28,
                    halign: "right",
                },
                },
            /*
            * Membuat tulisan Buka Bukti
            * menjadi tautan yang dapat diklik.
            *
            * Link Bukti sekarang berada pada kolom
            * indeks 11.
            */
            didDrawCell: (data) => {
            if (
                data.section === "body" &&
                data.column.index === 9
            ) {
                const linkBukti =
                sortedData[data.row.index]
                    ?.linkBukti;

                if (linkBukti) {
                doc.link(
                    data.cell.x,
                    data.cell.y,
                    data.cell.width,
                    data.cell.height,
                    {
                    url: linkBukti,
                    },
                );
                }
            }
            },

            didDrawPage: () => {
            const pageHeight =
                doc.internal.pageSize.getHeight();

            doc.setFont(
                "helvetica",
                "normal",
            );

            doc.setFontSize(7);
            doc.setTextColor(100);

            doc.text(
                "SIMETRI Program Studi Matematika",
                10,
                pageHeight - 7,
            );
            },
        });

        /*
        * Nomor halaman
        */
        const totalPages =
            doc.getNumberOfPages();

        const pageHeight =
            doc.internal.pageSize.getHeight();

        for (
            let pageNumber = 1;
            pageNumber <= totalPages;
            pageNumber += 1
        ) {
            doc.setPage(pageNumber);

            doc.setFont(
            "helvetica",
            "normal",
            );

            doc.setFontSize(7);
            doc.setTextColor(100);

            doc.text(
            `Halaman ${pageNumber} dari ${totalPages}`,
            pageWidth - 10,
            pageHeight - 7,
            {
                align: "right",
            },
            );
        }

        const safeYear =
            yearFilter === "semua"
                ? "semua-tahun"
                : yearFilter;

        const safeDomain =
            domainFilter === "semua"
            ? "semua-bidang"
            : domainFilter;

        doc.save(
            `rekap-penelitian-publikasi-pengabdian-${safeYear}-${safeDomain}.pdf`,
        );
        }

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Dashboard Viewer
          </h2>

          <p className="mt-1 text-slate-600">
            Rekap kegiatan penelitian, publikasi dan luaran,
            serta pengabdian kepada masyarakat.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
         className="rounded-lg border border-[#881337] bg-white px-4 py-2 text-sm font-semibold text-[#881337] transition hover:bg-[#881337]/5 disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Perbarui data"}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Kegiatan"
          value={summary.activities}
          description="Penelitian dan PkM"
        />

        <SummaryCard
          title="Publikasi/Luaran"
          value={summary.outputs}
          description="Seluruh jenis luaran"
        />

        <SummaryCard
          title="Disetujui GPM"
          value={summary.approved}
          description="Data tervalidasi"
        />

        <SummaryCard
          title="Total Pendanaan"
          value={formatRupiah(summary.totalFunding)}
          description="Pendanaan kegiatan"
          compact
        />

        <SummaryCard
          title="Capaian PPEPP"
          value={`${summary.ppeppAchievement}%`}
          description="Rata-rata capaian"
        />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label
              htmlFor="satgas-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Pencarian
            </label>

            <input
              id="satgas-search"
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Cari judul, dosen, NIDN, atau indikator..."
              className={inputClassName}
            />
          </div>

          <FilterField
            label="Tahun"
            id="satgas-year"
            value={yearFilter}
            onChange={setYearFilter}
          >
            <option value="semua">
              Semua tahun
            </option>

            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </FilterField>

          <FilterField
            label="Bidang"
            id="satgas-domain"
            value={domainFilter}
            onChange={setDomainFilter}
            >
            <option value="semua">
                Semua bidang
            </option>

            <option value="penelitian">
                Penelitian
            </option>

            <option value="pkm">
                Pengabdian kepada Masyarakat
            </option>
            </FilterField>

          <FilterField
            label="Status GPM"
            id="satgas-status"
            value={statusFilter}
            onChange={setStatusFilter}
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
              Perlu revisi
            </option>
          </FilterField>
        </div>

       <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
            Menampilkan {filteredData.length} data.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            Ekspor CSV
          </button>

          <button
            type="button"
            onClick={exportPdf}
            className="rounded-lg border border-[#881337] bg-white px-4 py-2 text-sm font-semibold text-[#881337] transition hover:bg-[#881337]/5"
          >
            Ekspor PDF
          </button>
        </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900">
            Rekap Penelitian, Publikasi, dan Pengabdian
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Data kegiatan dan luaran yang tercatat dalam sistem.
          </p>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full min-w-[2400px] border-collapse text-sm">
                <thead>
                <tr className="border-b border-slate-200">
                    <TableHeading
                    sortKey="year"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Tahun
                    </TableHeading>

                    <TableHeading
                    sortKey="semester"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Semester
                    </TableHeading>

                    <TableHeading
                    sortKey="tahunAkademik"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Tahun Akademik
                    </TableHeading>

                    <TableHeading
                    sortKey="category"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Jenis Kegiatan
                    </TableHeading>

                    <TableHeading
                    sortKey="namaDosen"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Dosen
                    </TableHeading>

                    <TableHeading
                    sortKey="title"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Judul
                    </TableHeading>

                    <TableHeading
                    sortKey="ketuaKegiatan"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Ketua Kegiatan
                    </TableHeading>

                    <TableHeading
                    sortKey="anggotaDosen"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Anggota Dosen
                    </TableHeading>

                    <TableHeading
                    sortKey="mahasiswa"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Mahasiswa
                    </TableHeading>

                    <TableHeading
                    sortKey="indicator"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Indikator
                    </TableHeading>

                    <TableHeading
                    sortKey="status"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Status
                    </TableHeading>

                    <TableHeading
                    sortKey="linkBukti"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Link Bukti
                    </TableHeading>

                    <TableHeading
                    sortKey="fundingSource"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    >
                    Sumber Dana
                    </TableHeading>

                    <TableHeading
                    sortKey="fundingAmount"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                    >
                    Pendanaan
                    </TableHeading>
                </tr>
                </thead>

                <tbody>
                {sortedData.map((item) => (
                    <tr
                    key={`${item.source}-${item.id}`}
                    className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                    {/* Tahun */}
                    <td className="whitespace-nowrap px-3 py-4 text-slate-700">
                        {item.year || "-"}
                    </td>

                    {/* Semester */}
                    <td className="whitespace-nowrap px-3 py-4">
                        <span className="font-medium text-slate-800">
                        {formatSemester(
                            item.semester,
                        )}
                        </span>
                    </td>

                    {/* Tahun akademik */}
                    <td className="whitespace-nowrap px-3 py-4 text-slate-700">
                        {item.tahunAkademik || "-"}
                    </td>

                    {/* Jenis kegiatan */}
                    <td className="min-w-[190px] px-3 py-4">
                        <span className="inline-flex rounded-full border border-[#881337]/20 bg-[#881337]/5 px-3 py-1 text-xs font-semibold text-[#881337]">
                        {item.category || "-"}
                        </span>
                    </td>

                    {/* Dosen penginput */}
                    <td className="min-w-[170px] px-3 py-4">
                        <p className="font-semibold text-slate-900">
                        {item.namaDosen}
                        </p>

                        {item.nidnNip && (
                        <p className="mt-1 text-xs text-slate-500">
                            {item.nidnNip}
                        </p>
                        )}
                    </td>

                    {/* Judul */}
                    <td className="min-w-[300px] px-3 py-4">
                        <p className="font-medium leading-6 text-slate-900">
                        {item.title || "-"}
                        </p>
                    </td>

                    {/* Ketua kegiatan */}
                    <td className="min-w-[220px] px-3 py-4">
                        <p className="font-semibold text-slate-900">
                        {item.ketuaKegiatan || "-"}
                        </p>

                        {item.ketuaIdentitas && (
                        <p className="mt-1 text-xs text-slate-500">
                            NIDN/NUPTK/NIP:{" "}
                            {item.ketuaIdentitas}
                        </p>
                        )}
                    </td>

                    {/* Anggota dosen */}
                    <td className="min-w-[250px] px-3 py-4">
                        <p className="whitespace-pre-line leading-6 text-slate-700">
                        {item.anggotaDosen || "-"}
                        </p>
                    </td>

                    {/* Mahasiswa */}
                    <td className="min-w-[250px] px-3 py-4">
                        <p className="whitespace-pre-line leading-6 text-slate-700">
                        {item.mahasiswa || "-"}
                        </p>
                    </td>

                    {/* Indikator */}
                    <td className="min-w-[140px] px-3 py-4">
                        <p className="text-slate-700">
                        {item.indicatorType || "-"}
                        </p>

                        {item.indicatorCode && (
                        <p className="mt-1 text-xs text-slate-500">
                            {item.indicatorCode}
                        </p>
                        )}
                    </td>

                    {/* Status */}
                    <td className="min-w-[130px] px-3 py-4">
                        <StatusBadge
                        status={item.status}
                        />
                    </td>

                    {/* Link bukti */}
                    <td className="min-w-[140px] px-3 py-4">
                        {item.linkBukti ? (
                        <a
                            href={item.linkBukti}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex whitespace-nowrap rounded-lg border border-[#881337]/20 bg-[#881337]/5 px-3 py-2 font-semibold text-[#881337] transition hover:bg-[#881337]/10"
                        >
                            Buka Bukti
                        </a>
                        ) : (
                        <span className="text-slate-400">
                            Belum tersedia
                        </span>
                        )}
                    </td>

                    {/* Sumber dana */}
                    <td className="min-w-[170px] px-3 py-4 text-slate-700">
                        {item.fundingSource || "-"}
                    </td>

                    {/* Pendanaan */}
                    <td className="min-w-[170px] whitespace-nowrap px-3 py-4 text-right">
                        {Number(item.fundingAmount ?? 0) > 0 ? (
                        <span className="font-semibold text-slate-900">
                            {formatRupiah(
                            item.fundingAmount,
                            )}
                        </span>
                        ) : (
                        <span className="text-slate-400">
                            -
                        </span>
                        )}
                    </td>
                    </tr>
                ))}

                {!loading &&
                    sortedData.length === 0 && (
                    <tr>
                        <td
                        colSpan="14"
                        className="px-3 py-12 text-center text-slate-500"
                        >
                        Tidak ada data yang sesuai filter.
                        </td>
                    </tr>
                    )}

                {loading && (
                    <tr>
                    <td
                        colSpan="14"
                        className="px-3 py-12 text-center text-slate-500"
                    >
                        Memuat rekap data...
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

function FilterField({
  label,
  id,
  value,
  onChange,
  children,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={inputClassName}
      >
        {children}
      </select>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  compact = false,
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A]" />

      <p className="text-sm font-semibold text-[#A30E2D]">
        {title}
      </p>

      <p
        className={`mt-3 font-bold text-slate-900 ${
          compact ? "text-xl" : "text-3xl"
        }`}
      >
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
  sortKey,
  sortConfig,
  onSort,
  align = "left",
}) {
  const isActive =
    sortConfig?.key === sortKey;

  const sortSymbol = isActive
    ? sortConfig.direction === "asc"
      ? "▲"
      : "▼"
    : "↕";

  return (
    <th
      className={`bg-[#881337] px-3 py-3 text-xs font-semibold text-white first:rounded-l-lg last:rounded-r-lg ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex w-full items-center gap-1 text-white transition hover:text-white ${
          align === "right"
            ? "justify-end text-right"
            : "justify-start text-left"
        }`}
        title={`Urutkan kolom ${children}`}
      >
        <span>{children}</span>

        <span
          className={
            isActive
              ? "text-white"
              : "text-white/60"
          }
        >
          {sortSymbol}
        </span>
      </button>
    </th>
  );
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
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] ??
        "border-slate-200 bg-slate-50 text-slate-600"
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

  return labels[status] ?? status;
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  return `"${stringValue.replace(/"/g, '""')}"`;
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/10";


function formatPeopleData(
  structuredData,
  legacyText,
  idField,
) {
  if (
    Array.isArray(structuredData) &&
    structuredData.length > 0
  ) {
    const formattedRows =
      structuredData
        .map((person) => {
          const nama =
            String(person?.nama ?? "").trim();

          const identitas =
            String(
              person?.[idField] ?? "",
            ).trim();

          if (!nama && !identitas) {
            return "";
          }

          if (nama && identitas) {
            return `${nama} (${identitas})`;
          }

          return nama || identitas;
        })
        .filter(Boolean);

    if (formattedRows.length > 0) {
      return formattedRows.join("\n");
    }
  }

  return String(legacyText ?? "").trim();
}
export default SatgasDashboard;