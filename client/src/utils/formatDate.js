export function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}