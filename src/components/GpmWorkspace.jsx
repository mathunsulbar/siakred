import { useState } from "react";
import GpmDashboard from "./GpmDashboard";
import PpeppDashboard from "./PpeppDashboard";
import VerificationHistory from "./VerificationHistory";
import AccountApprovalDashboard from "./AccountApprovalDashboard";
import UserManagementDashboard from "./UserManagementDashboard";

function GpmWorkspace({
  userId,
  appRole,
}) {
  const [activeTab, setActiveTab] =
    useState("verifikasi");

  const isAdmin =
    appRole === "gpm_admin";

  const tabs = isAdmin
    ? [
        {
          id: "verifikasi",
          label: "Verifikasi",
          description: "Periksa dokumen",
          icon: "verification",
        },
        {
          id: "persetujuan-akun",
          label: "Persetujuan Akun",
          description: "Aktivasi dosen",
          icon: "approval",
        },
        {
          id: "pengguna",
          label: "Pengguna",
          description: "Role & status",
          icon: "users",
        },
        {
          id: "ppepp",
          label: "Siklus PPEPP",
          description: "Pantau capaian",
          icon: "cycle",
        },
        {
          id: "riwayat",
          label: "Riwayat",
          description: "Audit verifikasi",
          icon: "history",
        },
      ]
    : [
        {
          id: "verifikasi",
          label: "Verifikasi",
          description: "Periksa dokumen",
          icon: "verification",
        },
        {
          id: "ppepp",
          label: "Siklus PPEPP",
          description: "Pantau capaian",
          icon: "cycle",
        },
        {
          id: "riwayat",
          label: "Riwayat",
          description: "Audit verifikasi",
          icon: "history",
        },
      ];

  return (
    <section className="mt-6">
      <nav className="mb-6 rounded-2xl border border-[#8F1024]/15 bg-gradient-to-r from-[#FFF1F2] via-white to-[#FFF7F7] p-2 shadow-sm">
        <div
          className={`grid gap-2 ${
            isAdmin
              ? "sm:grid-cols-2 lg:grid-cols-5"
              : "sm:grid-cols-3"
          }`}
        >
          {tabs.map((tab) => {
            const active =
              activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`relative flex min-w-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition ${
                  active
                    ? "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] shadow-sm"
                    : "hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <GpmNavIcon
                    type={tab.icon}
                  />
                </span>

                <span className="min-w-0">
                  <span
                    className={`block truncate text-sm font-bold ${
                      active
                        ? "text-white"
                        : "text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </span>

                  <span className={`mt-0.5 block truncate text-[11px] ${active ? "text-white/80" : "text-slate-500"}`}>
                    {tab.description}
                  </span>
                </span>

                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-white/75" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab === "verifikasi" && (
        <GpmDashboard
          canDeleteAll={isAdmin}
        />
      )}

      {isAdmin &&
        activeTab ===
          "persetujuan-akun" && (
          <AccountApprovalDashboard
            adminUserId={userId}
          />
        )}

      {isAdmin &&
        activeTab === "pengguna" && (
          <UserManagementDashboard
            adminUserId={userId}
          />
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

function GpmNavIcon({ type }) {
  const className = "h-4.5 w-4.5";

  if (type === "approval") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="m16 11 2 2 4-4" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }

  if (type === "cycle") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M20 7h-5V2" />
        <path d="M20 7a9 9 0 1 0 2 9" />
        <path d="M4 17h5v5" />
      </svg>
    );
  }

  if (type === "history") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default GpmWorkspace;
