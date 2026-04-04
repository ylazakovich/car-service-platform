import { useEffect, useRef, useState } from "react";

interface PdfPreviewModalProps {
  blob: Blob;
  filename: string;
  onClose: () => void;
  /** Creates a new stored PDF version (POST export). */
  onExportNewVersion?: () => void | Promise<void>;
  exportNewVersionBusy?: boolean;
}

export function PdfPreviewModal({
  blob,
  filename,
  onClose,
  onExportNewVersion,
  exportNewVersionBusy,
}: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  function handleDownload() {
    if (!blobUrl || !downloadRef.current) return;
    downloadRef.current.href = blobUrl;
    downloadRef.current.download = filename;
    downloadRef.current.click();
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Certificate of Completion"
        style={{ width: "80vw", height: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <h3>Certificate of Completion</h3>
          <div className="inline-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {blobUrl ? (
          <iframe
            src={blobUrl}
            title="PDF Preview"
            style={{ flex: 1, border: "none", width: "100%" }}
          />
        ) : null}

        <div className="form-actions" style={{ padding: "12px 16px", gap: "8px", display: "flex", flexWrap: "wrap" }}>
          <button type="button" className="button button-primary" onClick={handleDownload}>
            Download
          </button>
          {onExportNewVersion ? (
            <button
              type="button"
              className="button button-secondary"
              disabled={exportNewVersionBusy}
              onClick={() => void onExportNewVersion()}
            >
              {exportNewVersionBusy ? "Exporting…" : "Export new version"}
            </button>
          ) : null}
          <a ref={downloadRef} style={{ display: "none" }} aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
