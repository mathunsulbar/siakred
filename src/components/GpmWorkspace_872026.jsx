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
          label: "Verifikasi Dokumen",
        },
        {
          id: "persetujuan-akun",
          label: "Persetujuan Akun",
        },
        {
          id: "pengguna",
          label: "Kelola Pengguna",
        },
        {
          id: "ppepp",
          label: "Siklus PPEPP",
        },
        {
          id: "riwayat",
          label: "Riwayat Verifikasi",
        },
      ]
    : [
        {
          id: "verifikasi",
          label: "Verifikasi Dokumen",
        },
        {
          id: "ppepp",
          label: "Siklus PPEPP",
        },
        {
          id: "riwayat",
          label: "Riwayat Verifikasi",
        },
      ];

  return (
    <section className="mt-6">
      <div className="mb-6 rounded-2xl bg-white p-2 shadow-sm">
        <div
          className={`grid gap-2 ${
            isAdmin
              ? "sm:grid-cols-2 lg:grid-cols-5"
              : "sm:grid-cols-3"
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id)
              }
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#C5163A] via-[#8F1024] to-[#5B000A] text-white shadow-sm"
                  : "text-slate-600 hover:bg-[#FFF1F2] hover:text-[#881337]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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

export default GpmWorkspace;
