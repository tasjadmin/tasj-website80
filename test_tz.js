const parseAdminDateToUTCStr = (dateStr, timeStr) => {
    if (!dateStr) return { utcDate: null, utcTime: null, iso: null };
    const time = (timeStr && timeStr.length === 5) ? timeStr + ':00' : (timeStr || "00:00:00");
    let baseDate = new Date(`${dateStr}T${time}Z`);
    let guessEst = new Date(baseDate.getTime() + 5 * 3600 * 1000);
    let guessEdt = new Date(baseDate.getTime() + 4 * 3600 * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const formatClean = (d) => {
        let str = formatter.format(d);
        str = str.replace(',', '').replace(/ /g, 'T').replace('T', ' ');
        return str;
    };
    const targetFormatted = `${dateStr} ${time}`;
    let finalDate = guessEst;
    if (formatClean(guessEdt) === targetFormatted) {
        finalDate = guessEdt;
    } else if (formatClean(guessEst) === targetFormatted) {
        finalDate = guessEst;
    }
    const isoDate = finalDate.toISOString();
    return {
        utcDate: isoDate.split('T')[0],
        utcTime: isoDate.split('T')[1].substring(0, 5),
        iso: isoDate
    };
};

const formatUtcToLocalDateObj = (utcDateStr, utcTimeStr) => {
    if (!utcDateStr) return null;
    const time = (utcTimeStr && utcTimeStr.length === 5) ? utcTimeStr + ':00' : (utcTimeStr || "00:00:00");
    return new Date(`${utcDateStr}T${time}Z`);
};

const formatUtcToNYDatetimeString = (utcDateStr, utcTimeStr) => {
    const d = formatUtcToLocalDateObj(utcDateStr, utcTimeStr);
    if (!d) return '';
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    return formatter.format(d).replace(' ', 'T').slice(0, 16);
};

console.log(formatUtcToNYDatetimeString('2026-06-15', '18:00')); // Should be 14:00 (EDT)
console.log(formatUtcToNYDatetimeString('2026-01-15', '19:00')); // Should be 14:00 (EST)
