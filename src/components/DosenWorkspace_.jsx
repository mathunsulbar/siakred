import { useState } from "react";
import DosenDashboard from "./DosenDashboard";
import LuaranDashboard from "./LuaranDashboard";

function DosenWorkspace({ userId }) {
  const [activeTab, setActiveTab] =
    useState("kegiatan");

  return (
    <section className="mt-6">
      <div className="mb-6 rounded-2xl bg-white p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("kegiatan")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "kegiatan"
                ? "bg-[#000080] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Kegiatan Penelitian dan PkM
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("luaran")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "luaran"
                ? "bg-[#000080] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Publikasi dan Luaran
          </button>
        </div>
      </div>

      {activeTab === "kegiatan" && (
        <DosenDashboard userId={userId} />
      )}

      {activeTab === "luaran" && (
        <LuaranDashboard userId={userId} />
      )}
    </section>
  );
}

export default DosenWorkspace;