export const removeSensitiveTimelineEntries = (timeline) => {
  if (!Array.isArray(timeline)) return [];
  return timeline.filter((entry) =>
    entry !== null &&
    typeof entry === "object" &&
    typeof entry.status === "string" &&
    !Object.prototype.hasOwnProperty.call(entry, "password")
  );
};
