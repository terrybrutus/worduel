// Guest multiplayer is available only in the dedicated development instance.
export const LOCAL_PREVIEW = import.meta.env.DEV && window.location.port === "43992";
