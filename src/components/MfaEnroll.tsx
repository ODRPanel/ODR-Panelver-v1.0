"use client";

import { useState, useTransition } from "react";
import { startMfaEnrollmentAction, confirmMfaEnrollmentAction } from "@/actions/auth";

export function MfaEnroll() {
  const [data, setData] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {!data ? (
        <button
          className="btn-primary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await startMfaEnrollmentAction();
              setData(result);
            })
          }
        >
          {isPending ? "Generating..." : "Start MFA enrolment"}
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Scan this QR code with an authenticator app (Google Authenticator, Microsoft
            Authenticator, Authy, 1Password, etc.), then enter the 6-digit code it shows.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qrCodeDataUrl} alt="MFA QR code" className="h-48 w-48 border border-slate-200" />
          <p className="text-xs text-slate-400">
            Can&apos;t scan? Enter this key manually: <code className="font-mono">{data.secret}</code>
          </p>
          <form action={confirmMfaEnrollmentAction} className="space-y-3">
            <div>
              <label className="label" htmlFor="code">
                6-digit code
              </label>
              <input
                className="input max-w-[200px] text-center tracking-[0.4em]"
                id="code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>
            <button className="btn-primary" type="submit">
              Confirm and enable MFA
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
