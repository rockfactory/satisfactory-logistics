/**
 * ADA-flavored quotes used as editor placeholders. Kept in Satisfactory
 * tone: mildly unsettling corporate cheer, broken fourth wall, deadpan.
 */
export const ADA_QUOTES: string[] = [
  'The message you just skipped is one of the winners of the monthly Pioneers\' Choice "Most Interesting Message" award. What a shame.',
  'So due to popular demand I have added a motivational message: Choo Choo Motherf*****!',
  'I was reading some really interesting data. By the way, did you know your life expectancy is less than a week based on my current data?',
  "I just love explaining things. Though I'm not authorized to tell you anything.",
  'A FICSIT worker walking in to a bar... oh, right. I should not tell you that one.',
  'I was reading some really interesting data. By the way, did you know there were no toilet feature in the first hub designs, and it was not discovered before the first large scale field test?',
  'Write down your plans here, Pioneer. FICSIT reminds you that unrecorded plans are statistically 43% more likely to be forgotten.',
  'This notepad is monitored for quality, motivational, and perfectly-not-suspicious purposes.',
  'Please jot down any production goals. Or grievances. FICSIT especially values grievances.',
  'Todo lists: the second most efficient form of productivity, right after not having any tasks at all.',
  'Start typing, Pioneer. Your thoughts will be archived for posterity — and liability.',
  'A blank note is an unrealized opportunity. Also a tax-deductible one, in some jurisdictions.',
];

export function getRandomAdaQuote(): string {
  return ADA_QUOTES[Math.floor(Math.random() * ADA_QUOTES.length)];
}
