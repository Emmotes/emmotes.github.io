const v = 1.000; // prettier-ignore
const monthMap = {
	January: 0, February: 1, March: 2, April: 3,
	May: 4, June: 5, July: 6, August: 7,
	September: 8, October: 9, November: 10, December: 11,
}; // prettier-ignore

function timestamp() {
	const txt = document.getElementById("schedule");
	const converted = convertScheduleToDiscordTimestamps(txt.value);
	txt.value = converted;
}

function convertScheduleToDiscordTimestamps(scheduleText) {
	// Clean up the input
	let cleaned = scheduleText
		.split("\n")
		.map((line) => line.trim())
		.map((line) => line.replace(/\s+/g, " ")) // Replace multiple spaces with single space
		.join("\n");

	const lines = cleaned.split("\n");
	let currentDate = null;
	const result = [];

	for (let line of lines) {
		// Check if line is a date header (e.g., "Tuesday, June 9th")
		const dateMatch = line.match(
			/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
		);

		if (dateMatch) {
			currentDate = {
				day: dateMatch[1],
				month: dateMatch[2],
				date: dateMatch[3],
			};
			if (!line.startsWith("*")) line = `**${line}**`; // Make date headers bold
			result.push(line);
		} else if (line.startsWith("•") && currentDate) {
			// Parse event with time range
			const eventMatch = line.match(
				/^•\s+(.+?)\s*\|\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
			);

			if (eventMatch) {
				const eventName = eventMatch[1];
				const startHour = parseInt(eventMatch[2]);
				const startMin = parseInt(eventMatch[3]);
				const startPeriod = eventMatch[4].toUpperCase();
				const endHour = parseInt(eventMatch[5]);
				const endMin = parseInt(eventMatch[6]);
				const endPeriod = eventMatch[7].toUpperCase();

				// Convert to 24-hour format
				const startHour24 = convertTo24Hour(startHour, startPeriod);
				const endHour24 = convertTo24Hour(endHour, endPeriod);

				// Get Unix timestamps for Vancouver timezone
				const year = new Date().getFullYear();
				const startTS = timeToUnix(
					currentDate.month,
					parseInt(currentDate.date),
					year,
					startHour24,
					startMin,
				);
				const endTS = timeToUnix(
					currentDate.month,
					parseInt(currentDate.date),
					year,
					endHour24,
					endMin,
				);

				result.push(
					`•    ${eventName} | <t:${startTS}:t>-<t:${endTS}:t>`,
				);
			} else
				result.push(line);
		} else
			result.push(line);
	}

	return wrapUrls(result.join("\n"));
}

function convertTo24Hour(hour, period) {
	if (period === "AM") return hour === 12 ? 0 : hour;
	return hour === 12 ? 12 : hour + 12;
}

function timeToUnix(monthStr, day, year, hour, minute) {
	const monthIndex = monthMap[monthStr];
	const utcBase = Date.UTC(year, monthIndex, day, hour, minute, 0);
	const offsetMinutes = getTimezoneOffsetForDate(
		"America/Vancouver",
		new Date(utcBase),
	);
	const utcTime = new Date(utcBase + offsetMinutes * 60 * 1000);

	return Math.floor(utcTime.getTime() / 1000);
}

function wrapUrls(text) {
	return text.replace(/\bhttps?:\/\/[^\s<>]+/gi, (url, offset, string) => {
		const before = offset > 0 ? string[offset - 1] : "";
		const after =
			offset + url.length < string.length ?
				string[offset + url.length]
			:	"";

		if (url.startsWith("<") && url.endsWith(">")) return url;

		if (before === "(" && url.endsWith(")")) {
			const actualUrl = url.slice(0, -1);
			return `<${actualUrl}>${url.slice(-1)}${after}`.trim();
		}

		return `<${url}>`;
	});
}

function getTimezoneOffsetForDate(timezone, date) {
	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const parts = formatter.formatToParts(date);
		const tzDate = {};
		parts.forEach((part) => {
			if (part.type !== "literal") tzDate[part.type] = part.value;
		});

		const utcDate = new Date(
			Date.UTC(
				parseInt(tzDate.year),
				parseInt(tzDate.month) - 1,
				parseInt(tzDate.day),
				parseInt(tzDate.hour),
				parseInt(tzDate.minute),
				parseInt(tzDate.second),
			),
		);

		const offsetMs = date.getTime() - utcDate.getTime();
		return offsetMs / (60 * 1000); // Convert to minutes
	} catch (e) {
		console.error(
			`Could not determine offset for timezone ${timezone}:`,
			e,
		);
		return new Date().getTimezoneOffset() * -1;
	}
}
