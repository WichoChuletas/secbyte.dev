import readingTime from 'reading-time';

export function getReadingTime(markdown) {
	return readingTime(markdown).text;
}
