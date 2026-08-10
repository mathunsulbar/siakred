import { useState } from "react";
import DosenDashboard from "./DosenDashboard";
import LuaranDashboard from "./LuaranDashboard";

const TABS = [
  {
    id: "kegiatan",
    label: "Penelitian & PkM",
    description:
      "Kelola kegiatan tridarma",
    icon: "research",
  },
  {
    id: "luaran",
    label: "Publikasi & Luaran",
    description:
      "Kelola luaran dan publikasi",
    icon: "publication",
  },
];

function DosenWorkspace({ userId }) {
  const [activeTab, setActiveTab] =
    useState("kegiatan");

  return (
    <section className="mt-6">
      <nav className="mb-6 rounded-2xl border border-[#8F1024]/15 bg-gradient-to-r from-[#FFF1F2] via-white to-[#FFF7F7] p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {TABS.map((tab) => {
            const active =
              activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <WorkspaceIcon
                    type={tab.icon}
                  />
                </span>

                <span className="min-w-0">
                  <span
                    className={`block text-sm font-bold ${
                      active
                        ? "text-white"
                        : "text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </span>

                  <span className={`mt-0.5 block text-xs ${active ? "text-white/80" : "text-slate-500"}`}>
                    {tab.description}
                  </span>
                </span>

                {active && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-white/75" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab === "kegiatan" && (
        <DosenDashboard userId={userId} />
      )}

      {activeTab === "luaran" && (
        <LuaranDashboard userId={userId} />
      )}
    </section>
  );
}

function WorkspaceIcon({ type }) {
  const className = "h-5 w-5";

  if (type === "publication") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14h6" />
      <path d="M9 18h4" />
    </svg>
  );
}

export default DosenWorkspace;
