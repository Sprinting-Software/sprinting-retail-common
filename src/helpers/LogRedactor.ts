export class DataRedactor {
  protected keysToMask: string[] = []
  protected originalData: any
  protected maskOnlyProvidedKeys = false
  protected customMaskChar = "*"

  constructor(data: any) {
    if (typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Only objects can be passed")
    }
    this.originalData = data
  }

  exclude(keys: string | string[]) {
    this.keysToMask = Array.isArray(keys) ? keys : [keys]
    this.maskOnlyProvidedKeys = false
    return this
  }

  include(keys: string | string[]) {
    this.exclude(keys)
    this.maskOnlyProvidedKeys = true
    return this
  }

  setMaskChar(char: string) {
    this.customMaskChar = char
    return this
  }

  protected maskString(str: string): string {
    if (!str) return ""

    if (str.length <= 2) return str[0] + this.customMaskChar.repeat(3)
    return str[0] + this.customMaskChar.repeat(Math.max(str.length - 2, 3)) + str[str.length - 1]
  }

  protected maskEmail(email: string): string {
    if (!email) return ""
    const [localPart, domain] = email.split("@")
    return `${this.maskString(localPart)}@${domain}`
  }

  protected isEmail(value: string): boolean {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return emailRegex.test(value)
  }

  protected isExcluded(keyPath: string): boolean {
    return this.keysToMask.some((exclude) => exclude === keyPath)
  }

  protected defaultMaskPattern(value: string): string {
    return this.maskString(value)
  }

  protected maskDataExcept(payload: any, parentKey = ""): any {
    const maskedPayload: any = {}

    for (const key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        const value = payload[key]
        const keyPath = parentKey ? `${parentKey}.${key}` : key

        if (this.isExcluded(keyPath)) {
          maskedPayload[key] = value
        } else if (typeof value === "string") {
          if (this.isEmail(value)) {
            maskedPayload[key] = this.maskEmail(value)
          } else {
            maskedPayload[key] = this.maskString(value)
          }
        } else if (typeof value === "object" && !Array.isArray(value)) {
          maskedPayload[key] = this.maskDataExcept(value, keyPath) // Recursively mask nested objects
        } else if (typeof value === "boolean") {
          maskedPayload[key] = this.maskString(value.toString())
        } else {
          maskedPayload[key] = value
        }
      }
    }
    return maskedPayload
  }

  protected maskOnlyData() {
    const mask = (obj: any, props: string[]): any => {
      if (!props.length) return obj
      const [prop, ...restProps] = props
      const propParts = prop.split(".")

      if (propParts.length > 1) {
        const [firstPart, ...remainingParts] = propParts
        if (obj[firstPart]) {
          obj[firstPart] = mask({ ...obj[firstPart] }, [remainingParts.join(".")])
        }
      } else {
        if (obj[propParts[0]]) {
          obj[propParts[0]] = this.maskString(String(obj[propParts[0]]))
        }
      }
      return mask(obj, restProps)
    }

    return mask({ ...this.originalData }, this.keysToMask)
  }

  mask() {
    return this.maskOnlyProvidedKeys ? this.maskOnlyData() : this.maskDataExcept(this.originalData, "")
  }
}
