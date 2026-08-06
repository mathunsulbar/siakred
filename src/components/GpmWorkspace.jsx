import { useState } from "react";
import GpmDashboard from "./GpmDashboard";
import PpeppDashboard from "./PpeppDashboard";
import VerificationHistory from "./VerificationHistory";

function GpmWorkspace({ userId }) {
  const [activeTab, setActiveTab] =
    useState("verifikasi");

  return (
    <section className="mt-6">
      <div className="mb-6 rounded-2xl bg-white p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setActiveTab("verifikasi")
            }
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "verifikasi"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Verifikasi Dokumen
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("ppepp")
            }
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "ppepp"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Siklus PPEPP
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "riwayat"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Riwayat Verifikasi
          </button>

        </div>
      </div>

      {activeTab === "verifikasi" && (
        <GpmDashboard />
      )}

      {activeTab === "ppepp" && (
        <PpeppDashboard userId={userId} />
      )}

      {activeTab === "riwayat" && (
        <VerificationHistory />
      )}
    </section>
  );
}

export default GpmWorkspace;