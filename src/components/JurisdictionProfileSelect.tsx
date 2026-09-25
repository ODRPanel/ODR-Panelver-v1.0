"use client";

import { useState } from "react";

type Profile = {
  id: string;
  profileCode: string;
  displayName: string;
  governingArbitrationLaw: string;
  confidentialityDefault: string;
  defaultCurrency: string;
  dataResidencyRegion: string;
  rtlSupport: boolean;
};

/** Jurisdiction-aware onboarding (Annexure B, Section 1.1): selecting a
 * profile immediately shows what it fixes for this Reference, rather than
 * showing every jurisdiction's fields at once. */
export function JurisdictionProfileSelect({ profiles }: { profiles: Profile[] }) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? "");
  const selected = profiles.find((p) => p.id === selectedId);

  return (
    <div>
      <label className="label" htmlFor="jurisdictionProfileId">
        Jurisdiction Rule Profile
      </label>
      <select
        className="input"
        id="jurisdictionProfileId"
        name="jurisdictionProfileId"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        required
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
      {selected && (
        <div className="mt-2 rounded-md border border-brand-100 bg-brand-50 p-3 text-xs text-brand-900">
          <p><strong>Governing law:</strong> {selected.governingArbitrationLaw}</p>
          <p><strong>Confidentiality default:</strong> {selected.confidentialityDefault.replace(/_/g, " ")}</p>
          <p><strong>Default currency:</strong> {selected.defaultCurrency}</p>
          <p><strong>Data residency:</strong> {selected.dataResidencyRegion}</p>
          {selected.rtlSupport && <p>Arabic (right-to-left) rendering will be available for this Reference.</p>}
        </div>
      )}
    </div>
  );
}
