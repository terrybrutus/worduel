import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/40 text-destructive text-sm font-body ${className ?? ""}`}
      data-ocid="error_message"
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
