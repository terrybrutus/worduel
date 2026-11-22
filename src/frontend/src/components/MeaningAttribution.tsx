interface Props {
  source?: string;
  sourceUrl?: string;
  aiEnhanced?: boolean;
  originalDefinition?: string;
}

export function MeaningAttribution({
  source,
  sourceUrl,
  aiEnhanced,
  originalDefinition,
}: Props) {
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      {aiEnhanced && <p>AI-simplified · Example generated</p>}
      {source && (
        <p>
          {sourceUrl?.startsWith("https://") ? (
            <a
              className="underline"
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      )}
      {aiEnhanced && originalDefinition && (
        <details className="mt-1">
          <summary className="cursor-pointer py-2">
            Original dictionary meaning
          </summary>
          <p className="pb-2">{originalDefinition}</p>
        </details>
      )}
    </div>
  );
}
