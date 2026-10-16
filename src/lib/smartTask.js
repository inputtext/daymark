import { dateISO } from './tasks.js'

// Smart Task Entry runs entirely on-device. It does not call an AI API or
// change task data unless the user explicitly accepts its suggestions.
const datePatterns = [
  { regex: /(^|\s)in\s+(\d{1,3})\s+days?(?=\s|$|[,.!?])/i, days: match => Number(match[2]) },
  { regex: /(^|\s)next\s+week(?=\s|$|[,.!?])/i, days: () => 7 },
  { regex: /(^|\s)tomorrow(?=\s|$|[,.!?])/i, days: () => 1 },
  { regex: /(^|\s)today(?=\s|$|[,.!?])/i, days: () => 0 },
]

function removeMatchedPhrase(text, match) {
  return text.slice(0, match.index) + (match[1] || '') + text.slice(match.index + match[0].length)
}

function tidy(text) {
  return text.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/^[\s,.!?]+|[\s,.!?]+$/g, '').trim()
}

/**
 * Parse a deliberately small, predictable set of natural-language markers.
 * Supports: today, tomorrow, next week, in 2 days, !high/!medium/!low.
 * Only extracts calendar dates; time-of-day and tags are left untouched.
 * @param {string} input - Raw title entered by the user.
 * @param {{now?: Date}} options - Injectable local clock for deterministic tests.
 */
export function parseSmartTask(input, { now = new Date() } = {}) {
  let title = String(input ?? '')
  let priority = null
  let due_date = null

  const priorityMatch = /(^|\s)!(high|medium|low)(?=\s|$|[,.!?])/i.exec(title)
  if (priorityMatch) {
    priority = priorityMatch[2].toLowerCase()
    title = removeMatchedPhrase(title, priorityMatch)
  }

  for (const rule of datePatterns) {
    const match = rule.regex.exec(title)
    if (!match) continue
    const days = rule.days(match)
    if (!Number.isInteger(days) || days < 0 || days > 365) continue
    const day = new Date(now)
    day.setDate(day.getDate() + days)
    due_date = dateISO(day)
    title = removeMatchedPhrase(title, match)
    break
  }

  title = tidy(title)
  return {
    title,
    due_date,
    priority,
    hasSuggestions: Boolean(title && (priority || due_date)),
  }
}
