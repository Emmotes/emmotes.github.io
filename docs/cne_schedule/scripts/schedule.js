const v = 1.002; // prettier-ignore
const monthMap = {
	January: 0, February: 1, March: 2, April: 3,
	May: 4, June: 5, July: 6, August: 7,
	September: 8, October: 9, November: 10, December: 11,
}; // prettier-ignore
const timeRangeRegex =
	/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/gi;

function timestamp() {
	const txt = document.getElementById("source");
	const converted = convertScheduleToDiscordTimestamps(txt.value);
	document.getElementById("result").value = converted;
}

function copyResult() {
	const resultBox = document.getElementById("result");
	resultBox.select();
	resultBox.setSelectionRange(0, 99999);
	document.execCommand("copy");
}

function convertScheduleToDiscordTimestamps(scheduleText) {
	// Clean up the input
	let cleaned = scheduleText
		.split("\n")
		.map((line) => line.trim())
		.join("\n");

	const lines = cleaned.split("\n");
	const result = [];
	let currentDate = null;
	let currentYear = new Date().getFullYear();
	let previousMonthNum = null;

	for (let line of lines) {
		// Check if line is a date header (e.g., "Tuesday, June 9th").
		const dateMatch = line.match(
			/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\w+)\s*(\d{1,2})\s*(st|nd|rd|th)?/i,
		);

		if (dateMatch) {
			currentDate = {
				day: dateMatch[1],
				month: dateMatch[2],
				date: dateMatch[3],
				suffix: dateMatch[4] || "",
			};

			// Detect year rollover: December -> January
			const currentMonthNum = monthMap[currentDate.month];
			if (
				previousMonthNum !== null &&
				previousMonthNum === 11 &&
				currentMonthNum === 0
			)
				currentYear++;
			previousMonthNum = currentMonthNum;
			// Rebuild the line to ensure consistent formatting and make it bold.
			line = `**${currentDate.day}, ${currentDate.month} ${currentDate.date}${currentDate.suffix}**`;
			result.push(line);
			continue;
		}

		// Look for time-range patterns anywhere in the line and replace them in-place.
		// Pattern: HH:MM AM/PM - HH:MM AM/PM (case-insensitive)
		if (currentDate && timeRangeRegex.test(line)) {
			timeRangeRegex.lastIndex = 0;

			const replaced = line.replace(
				timeRangeRegex,
				(match, sh, sm, sp, eh, em, ep) => {
					const startHour = parseInt(sh, 10);
					const startMin = parseInt(sm, 10);
					const endHour = parseInt(eh, 10);
					const endMin = parseInt(em, 10);
					const startPeriod = sp.toUpperCase();
					const endPeriod = ep.toUpperCase();

					const startHour24 = convertTo24Hour(startHour, startPeriod);
					const endHour24 = convertTo24Hour(endHour, endPeriod);

					const startTS = timeToUnix(
						currentDate.month,
						parseInt(currentDate.date),
						currentYear,
						startHour24,
						startMin,
					);
					const endTS = timeToUnix(
						currentDate.month,
						parseInt(currentDate.date),
						currentYear,
						endHour24,
						endMin,
					);

					return `<t:${startTS}:t>-<t:${endTS}:t>`;
				},
			);
			result.push(replaced);
		} else result.push(line);
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
	return text.replace(/\bhttps?:\/\/[^\s<>]+/gi, (rawUrl, offset, string) => {
		const before = offset > 0 ? string[offset - 1] : "";
		const after = offset + rawUrl.length < string.length ? string[offset + rawUrl.length] : "";

		// If already wrapped like <https://...>, don't change it.
		if (before === "<" && after === ">") return rawUrl;

		// Strip trailing punctuation from the matched URL (e.g. ')', '.', ',', etc.)
		// and append it after the angle-bracket wrapper. This makes
		// markdown links like (https://...) become (<https://...>).
		let url = rawUrl;
		let trailing = "";
		while (url.length && /[)\]\.,;:!?]/.test(url[url.length - 1])) {
			trailing = url[url.length - 1] + trailing;
			url = url.slice(0, -1);
		}

		return `<${url}>` + trailing;
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
