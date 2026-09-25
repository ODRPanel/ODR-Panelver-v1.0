import { verifyMfaAction } from "@/actions/auth";
import { ErrorAlert } from "@/components/ui/Alert";

export default function MfaPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div>
      <h1 className="section-title mb-2">Enter your authentication code</h1>
      <p className="mb-6 text-sm text-slate-500">
        Open your authenticator app and enter the current 6-digit code.
      </p>
      <ErrorAlert message={searchParams.error} />
      <form action={verifyMfaAction} className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="code">
            6-digit code
          </label>
          <input
            className="input text-center text-lg tracking-[0.5em]"
            id="code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
          />
        </div>
        <button className="btn-primary w-full" type="submit">
          Verify and sign in
        </button>
      </form>
    </div>
  );
}
