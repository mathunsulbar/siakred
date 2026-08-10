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
            onClick={() =>
              setActiveTab("kegiatan")
            }
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "kegiatan"
                ? "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] text-white shadow-sm"
                : "text-slate-600 hover:bg-[#FFF1F2] hover:text-[#881337]"
            }`}
          >
            Kegiatan Penelitian dan PkM
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("luaran")
            }
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "luaran"
                ? "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] text-white shadow-sm"
                : "text-slate-600 hover:bg-[#FFF1F2] hover:text-[#881337]"
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
