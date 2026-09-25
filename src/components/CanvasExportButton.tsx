"use client";

import { useTransition } from "react";
import { exportCanvasAction } from "@/actions/canvas";

export function CanvasExportButton({ workspaceId, referenceId }: { workspaceId: string; referenceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="btn-secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const formData = new FormData();
          formData.set("workspaceId", workspaceId);
          formData.set("referenceId", referenceId);
          const exported = await exportCanvasAction(formData);
          const blob = new Blob([exported], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `canvas-${workspaceId}.liquidtext.json`;
          a.click();
          URL.revokeObjectURL(url);
        })
      }
    >
      {isPending ? "Exporting..." : "Export to LiquidText format"}
    </button>
  );
}
