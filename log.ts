export function log(message: string) {
    var now = new Date()
    console.log(`\u001b[38;5;11m[\u001b[32m${now.toLocaleString("en-AU", {dateStyle: "short", timeStyle: "medium"})}\u001b[38;5;11m]\u001b[0m ${message.substring(0, 512)}${message.length > 512 ? '...' : ''}`)
}

export function censor(str: string, n: number, maskChar = '*') {
    const kept = str.slice(0, n);
    const censored = str.slice(n).replace(/./g, maskChar);
    return kept + censored;
}