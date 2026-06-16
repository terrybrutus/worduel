interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

export function LoadingSpinner({
  size = "md",
  label,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className ?? ""}`}
      aria-label={label ?? "Loading"}
      aria-busy="true"
    >
      <span
        className={`rounded-full border-primary border-t-transparent animate-spin ${sizeMap[size]}`}
      />
      {label && (
        <span className="text-sm text-muted-foreground font-body animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}
