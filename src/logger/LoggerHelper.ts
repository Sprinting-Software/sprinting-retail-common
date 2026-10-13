const MAX_NUMBER_OF_FIELDS_IN_CONTEXT = 30
const MAX_VALUE_LENGTH_IN_EVENT_MESSAGE = 60
const MAX_EVENT_MESSAGE_LENGTH = 500

/**
 * Concatenates arguments using this logic:
 * - Filter out any falsy values (null, undefined, empty strings)
 * - Join the remaining values with " | "
 * - If one of the arguments passed is an object, use this logic:
 *    - The first level of fields will be iterated and written out as "key: value" with comma-separation.
 *    - For nested objects, skip them
 *    - For Date objects, skip them
 *    - If more than MAX_NUMBER_OF_FIELDS_IN_CONTEXT fields are found, write out "...all fields beyond the first MAX_NUMBER_OF_FIELDS_IN_CONTEXT are omitted, please make a more narrow context for the event..."
 *    - Any empty strings, nulls, or undefined values will be skipped
 * @param args Any arguments to concatenate
 * @returns
 */
export const LoggerHelper = {
  myconcatEssentialData(...args: any[]): string {
    const filteredArgs = args.filter((arg) => arg !== null && arg !== undefined && arg !== "")

    const resultParts: string[] = []

    for (const arg of filteredArgs) {
      if (typeof arg === "object" && arg !== null && !Array.isArray(arg)) {
        const keys = Object.keys(arg)
        const shownKeys = keys.slice(0, MAX_NUMBER_OF_FIELDS_IN_CONTEXT)
        const objectParts = shownKeys
          .map((key) => {
            const value = arg[key]
            if (value === null || value === undefined) {
              return undefined
            } else if (value instanceof Date) {
              return undefined
            } else if (typeof value === "object" && value !== null) {
              return undefined
            } else {
              return `${key}: ${value}`
            }
          })
          .filter((part) => part) //Remove any undefined parts
        if (keys.length > MAX_NUMBER_OF_FIELDS_IN_CONTEXT) {
          objectParts.push(
            `...all fields beyond the first ${MAX_NUMBER_OF_FIELDS_IN_CONTEXT} are omitted, please make a more narrow context for the event...`
          )
        }

        resultParts.push(objectParts.join(" | "))
      } else {
        resultParts.push(String(arg))
      }
    }

    return resultParts.join(" | ")
  },

  /**
   * A readable one-line message for an event from the named fields, e.g.
   * `EVENT: OrderConfirmed - orderNumber: BI0001258, status: confirmed`. Each field is looked up in the
   * sources in order, the first one that has it wins. Only scalar values are shown: nested objects,
   * arrays, dates, empty values and strings over 60 characters are left out. The message is at most
   * 500 characters: fields that do not fit are replaced by "…". Meant for people reading Kibana's
   * Discover pane, not for parsing.
   */
  buildEventMessage(eventName: string, fields: string[], ...sources: unknown[]): string {
    const objects = sources.map(asPlainObject)
    const parts: string[] = []
    for (const key of fields) {
      const value = objects.find((source) => source[key] !== undefined)?.[key]
      const isShown =
        (typeof value === "string" && value !== "" && value.length <= MAX_VALUE_LENGTH_IN_EVENT_MESSAGE) ||
        (typeof value === "number" && Number.isFinite(value)) ||
        typeof value === "boolean" ||
        typeof value === "bigint"
      if (isShown) parts.push(`${key}: ${value}`)
    }
    let message = `EVENT: ${eventName}`.slice(0, MAX_EVENT_MESSAGE_LENGTH)
    for (const [index, part] of parts.entries()) {
      const next = `${message}${index ? ", " : " - "}${part}`
      if (next.length > MAX_EVENT_MESSAGE_LENGTH - 3) {
        message += index ? ", …" : " - …"
        break
      }
      message = next
    }
    return message
  },
}

/** The `message` of `event()`: the message itself, or the fields to compose it from. */
export type EventMessage = string | EventMessageFields

/** Composes the event's message from these fields of its data, context and custom data, in that order. */
export type EventMessageFields = { concatFields: string[] }

/**
 * The message of an event: the caller's string; composed from `concatFields` (see
 * LoggerHelper.buildEventMessage), looked up in the event data, then its context, then its custom data;
 * otherwise `EVENT: <name> <category> <domain>`.
 */
export function eventMessage(
  event: { name: string; category: string; domain: string; data?: unknown; context?: unknown; custom?: unknown },
  message: EventMessage | undefined
): string {
  if (typeof message === "string" && message) return message
  if (Array.isArray((message as EventMessageFields | undefined)?.concatFields)) {
    const { concatFields } = message as EventMessageFields
    return LoggerHelper.buildEventMessage(event.name, concatFields, event.data, event.context, event.custom)
  }
  return `EVENT: ${event.name} ${event.category} ${event.domain}`
}

function asPlainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
