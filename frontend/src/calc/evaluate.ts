type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "%" | "//" | "^" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "ident"; value: "sqrt" | "abs" }
  | { type: "eof" };

function tokenize(input: string): Token[] {
  const s = input.trim();
  const tokens: Token[] = [];
  let i = 0;

  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isAlpha = (c: string) =>
    (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";

  while (i < s.length) {
    const c = s[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }

    // Numbers: 12, 12.34, .5
    if (isDigit(c) || c === ".") {
      let j = i;
      let seenDot = false;
      while (j < s.length) {
        const cj = s[j];
        if (cj === ".") {
          if (seenDot) break;
          seenDot = true;
          j++;
          continue;
        }
        if (!isDigit(cj)) break;
        j++;
      }
      const raw = s.slice(i, j);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`Número inválido: ${raw}`);
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }

    // Identifiers (sqrt, abs)
    if (isAlpha(c)) {
      let j = i + 1;
      while (j < s.length) {
        const cj = s[j];
        if (!isAlpha(cj) && !isDigit(cj)) break;
        j++;
      }
      const identRaw = s.slice(i, j);
      const ident = identRaw.toLowerCase();
      if (ident === "sqrt" || ident === "abs") {
        tokens.push({ type: "ident", value: ident });
        i = j;
        continue;
      }
      throw new Error(`Função não suportada: ${identRaw}`);
    }

    // Operators with multi-char tokens
    if (c === "*" && s[i + 1] === "*") {
      tokens.push({ type: "op", value: "^" });
      i += 2;
      continue;
    }

    if (c === "/" && s[i + 1] === "/") {
      tokens.push({ type: "op", value: "//" });
      i += 2;
      continue;
    }

    if (c === "^") {
      tokens.push({ type: "op", value: "^" });
      i++;
      continue;
    }

    // Single-char operators and parens
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%" || c === "^") {
      tokens.push({ type: "op", value: c === "^" ? "^" : (c as "+" | "-" | "*" | "/" | "%") });
      i++;
      continue;
    }

    if (c === "(" || c === ")") {
      tokens.push({ type: "paren", value: c });
      i++;
      continue;
    }

    throw new Error(`Caractere inesperado: ${c}`);
  }

  tokens.push({ type: "eof" });
  return tokens;
}

class Parser {
  private pos = 0;

  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public getPos(): number {
    return this.pos;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private expect(type: Token["type"], value?: string): Token {
    const t = this.peek();
    if (t.type !== type) throw new Error(`Token inesperado: esperado ${type}`);
    if (value !== undefined) {
      if ((t as any).value !== value)
        throw new Error(`Token inesperado: esperado ${value}`);
    }
    return this.consume();
  }

  // expression := term (('+'|'-') term)*
  parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.type === "op" && (t.value === "+" || t.value === "-")) {
        this.consume();
        const right = this.parseTerm();
        value = t.value === "+" ? value + right : value - right;
        continue;
      }
      break;
    }
    return value;
  }

  // term := power (('*'|'/'|'%'|'//') power)*
  parseTerm(): number {
    let value = this.parsePower();
    while (true) {
      const t = this.peek();
      if (t.type === "op" && (t.value === "*" || t.value === "/" || t.value === "%" || t.value === "//")) {
        this.consume();
        const right = this.parsePower();

        if (t.value === "*") {
          value = value * right;
        } else if (t.value === "/") {
          if (right === 0) throw new Error("Divisão por zero.");
          value = value / right;
        } else if (t.value === "//") {
          if (right === 0) throw new Error("Divisão inteira por zero.");
          value = Math.floor(value / right);
        } else if (t.value === "%") {
          if (right === 0) throw new Error("Módulo por zero.");
          // Python-like modulo: result has the sign of the divisor.
          let r = value % right;
          if (r !== 0 && (r < 0) !== (right < 0)) r += right;
          value = r;
        }

        continue;
      }
      break;
    }
    return value;
  }

  // power := unary ('^' power)?
  // Right associative: 2^3^2 => 2^(3^2)
  parsePower(): number {
    const left = this.parseUnary();
    const t = this.peek();
    if (t.type === "op" && t.value === "^") {
      this.consume();
      const right = this.parsePower();
      return Math.pow(left, right);
    }
    return left;
  }

  // unary := ('+'|'-') unary | primary
  parseUnary(): number {
    const t = this.peek();
    if (t.type === "op" && (t.value === "+" || t.value === "-")) {
      this.consume();
      const v = this.parseUnary();
      return t.value === "-" ? -v : v;
    }
    return this.parsePrimary();
  }

  // primary := number | '(' expression ')' | ident '(' expression ')'
  parsePrimary(): number {
    const t = this.peek();
    if (t.type === "number") {
      this.consume();
      return t.value;
    }

    if (t.type === "paren" && t.value === "(") {
      this.consume();
      const value = this.parseExpression();
      this.expect("paren", ")");
      return value;
    }

    if (t.type === "ident") {
      const ident = t.value;
      this.consume();
      this.expect("paren", "(");
      const arg = this.parseExpression();
      this.expect("paren", ")");

      if (ident === "sqrt") {
        if (arg < 0) throw new Error("sqrt exige argumento não-negativo.");
        return Math.sqrt(arg);
      }
      if (ident === "abs") return Math.abs(arg);
    }

    throw new Error("Expressão inválida.");
  }
}

export function evaluateExpression(expr: string): number {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  const value = parser.parseExpression();
  const last = tokens[parser.getPos()];
  if (last.type !== "eof") throw new Error("Expressão inválida (sobra de tokens).");
  if (!Number.isFinite(value)) throw new Error("Resultado não-finito.");
  return value;
}

