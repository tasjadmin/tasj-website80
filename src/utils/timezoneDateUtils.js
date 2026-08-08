/**
 * Utility functions for timezone safe date/time handling.
 * Ensures the admin input (assumed America/New_York) is correctly converted to UTC
 * and UTC dates return correct local browser representations.
 */

/**
 * Returns UTC date and time strings from Admin's New York timezone selections.
 * @param {string} dateStr - The 'YYYY-MM-DD' input from Admin
 * @param {string} timeStr - The 'HH:MM' input from Admin
 * @returns {{utcDate: string, utcTime: string, iso: string}}
 */
export const parseAdminDateToUTCStr = (dateStr, timeStr) => {
    if (!dateStr) return { utcDate: null, utcTime: null, iso: null };
    const time = (timeStr && timeStr.length === 5) ? timeStr + ':00' : (timeStr || "00:00:00");
    
    // Create base date assuming no offset (effectively treating NY time as UTC just to start)
    let baseDate = new Date(`${dateStr}T${time}Z`);
    
    // Add offset for NY time (EDT = UTC-4, EST = UTC-5)
    let guessEst = new Date(baseDate.getTime() + 5 * 3600 * 1000); // Add 5 hrs
    let guessEdt = new Date(baseDate.getTime() + 4 * 3600 * 1000); // Add 4 hrs
    
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

/**
 * Parses UTC strings from the database and constructs a completely robust native Date object
 * in the user's local timezone.
 * @param {string} utcDateStr - Database 'YYYY-MM-DD' (in UTC)
 * @param {string} utcTimeStr - Database 'HH:MM:SS' or 'HH:MM' (in UTC)
 * @returns {Date | null} The correctly offset javascript Date object
 */
export const formatUtcToLocalDateObj = (utcDateStr, utcTimeStr) => {
    if (!utcDateStr) return null;
    const time = (utcTimeStr && utcTimeStr.length === 5) ? utcTimeStr + ':00' : (utcTimeStr || "00:00:00");
    return new Date(`${utcDateStr}T${time}Z`);
};

/**
 * Parses UTC strings and returns a naive datetime string formatted in New York Time.
 * Ideal for populating `<input type="datetime-local">` in Admin.
 */
export const formatUtcToNYDatetimeString = (utcDateStr, utcTimeStr) => {
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

/**
 * Validates and falls back browser timezone to America/New_York if unavailable
 */
const getBrowserTimezone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return tz || 'America/New_York';
    } catch (e) {
        return 'America/New_York';
    }
};

/**
 * Takes UTC date and time strings and returns standardized frontend representations
 * scaled to the user's correct local timezone.
 * Returns { dateLabel, timeLabel, fullString }
 */
export const formatEventDateTime = (utcDateStr, utcTimeStr) => {
    if (!utcDateStr) return { dateLabel: '', timeLabel: '', fullString: '' };
    
    // Build the fully hydrated Date object (represents exactly the correct universal time)
    const d = formatUtcToLocalDateObj(utcDateStr, utcTimeStr);
    if (!d) return { dateLabel: '', timeLabel: '', fullString: '' };

    const timeZone = getBrowserTimezone();

    // Format Date: "Saturday, April 18, 2026"
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric'
    });

    // Format Time: "11:00 AM"
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const monthFormatter = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' });
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' });

    const dateLabel = dateFormatter.format(d);
    const shortDateLabel = shortDateFormatter.format(d);
    const timeLabel = timeFormatter.format(d);
    const monthLabel = monthFormatter.format(d);
    const dayLabel = dayFormatter.format(d);

    return {
        dateLabel,
        shortDateLabel,
        monthLabel,
        dayLabel,
        timeLabel,
        fullString: `${dateLabel} | ${timeLabel}`,
        dateObj: d  // keeping the object just in case sorting needs it
    };
};

