import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "../lib/supabase";

const PIE_COLORS = ["#16a34a", "#dc2626"];

function PpeppCharts() {
  const currentYear = new Date().getFullYear();

  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadChartData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("siklus_ppepp")
        .select(`
          id,
          tahun,
          ranah,
          jenis_indikator,
          target_nilai,
          realisasi_nilai
        `)
        .eq("tahun", currentYear);

      if (error) {
        throw error;
      }

      setIndicators(data ?? []);
    } catch (error) {
      console.error(
        "Gagal memuat grafik PPEPP:",
        error,
      );

      setErrorMessage(
        error.message ||
          "Data grafik PPEPP belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    loadChartData();

    const channel = supabase
      .channel("siakred-ppepp-chart")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "siklus_ppepp",
        },
        () => {
          loadChartData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadChartData]);

  const validIndicators = useMemo(() => {
    return indicators
      .filter(
        (item) => Number(item.target_nilai) > 0,
      )
      .map((item) => {
        const target = Number(item.target_nilai);
        const realization = Number(
          item.realisasi_nilai ?? 0,
        );

        return {
          ...item,
          achievement:
            (realization / target) * 100,
        };
      });
  }, [indicators]);

  const barData = useMemo(() => {
    const groups = [
      {
        key: "penelitian-IKU",
        label: "Penelitian IKU",
        ranah: "penelitian",
        type: "IKU",
      },
      {
        key: "penelitian-IKT",
        label: "Penelitian IKT",
        ranah: "penelitian",
        type: "IKT",
      },
      {
        key: "pkm-IKU",
        label: "PkM IKU",
        ranah: "pkm",
        type: "IKU",
      },
      {
        key: "pkm-IKT",
        label: "PkM IKT",
        ranah: "pkm",
        type: "IKT",
      },
    ];

    return groups.map((group) => {
      const matchingRows = validIndicators.filter(
        (item) =>
          item.ranah === group.ranah &&
          item.jenis_indikator === group.type,
      );

      const average =
        matchingRows.length > 0
          ? matchingRows.reduce(
              (total, item) =>
                total + item.achievement,
              0,
            ) / matchingRows.length
          : 0;

      return {
        name: group.label,
        capaian: Number(average.toFixed(2)),
        jumlah: matchingRows.length,
      };
    });
  }, [validIndicators]);

  const pieData = useMemo(() => {
    const achieved = validIndicators.filter(
      (item) => item.achievement >= 100,
    ).length;

    const notAchieved = validIndicators.filter(
      (item) => item.achievement < 100,
    ).length;

    return [
      {
        name: "Target tercapai",
        value: achieved,
      },
      {
        name: "Belum tercapai",
        value: notAchieved,
      },
    ];
  }, [validIndicators]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartLoadingCard />
        <ChartLoadingCard />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900">
          Visualisasi Capaian IKU dan IKT
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Perbandingan capaian Penelitian dan PkM
          tahun {currentYear}.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h4 className="font-bold text-slate-900">
              Rata-rata Capaian per Kelompok
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Realisasi dibagi target, kemudian
              dirata-ratakan per kelompok.
            </p>
          </div>

          {validIndicators.length > 0 ? (
            <div className="h-[340px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={barData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 40,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />

                  <YAxis
                    unit="%"
                    domain={[0, "auto"]}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Capaian",
                    ]}
                  />

                  <Legend />

                  <Bar
                    dataKey="capaian"
                    name="Rata-rata capaian"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h4 className="font-bold text-slate-900">
              Status Ketercapaian Indikator
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Indikator tercapai apabila nilainya
              minimal 100%.
            </p>
          </div>

          {validIndicators.length > 0 ? (
            <div className="h-[340px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    outerRadius={105}
                    label={({ name, value }) =>
                      `${name}: ${value}`
                    }
                  >
                    {pieData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={
                          PIE_COLORS[
                            index % PIE_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartMessage />
          )}
        </div>
      </div>
    </section>
  );
}

function ChartLoadingCard() {
  return (
    <div className="h-[430px] animate-pulse rounded-2xl bg-white p-5 shadow-sm">
      <div className="h-5 w-48 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-72 rounded bg-slate-100" />
      <div className="mt-8 h-[300px] rounded-xl bg-slate-100" />
    </div>
  );
}

function EmptyChartMessage() {
  return (
    <div className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
      <div className="text-center">
        <p className="font-semibold text-slate-700">
          Belum ada data grafik
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Tambahkan target dan realisasi PPEPP.
        </p>
      </div>
    </div>
  );
}

export default PpeppCharts;