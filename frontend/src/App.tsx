import { useState } from "react";
import { evaluateExpression } from "./calc/evaluate";
import "./App.css";

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  // Evita strings absurdamente longas (ex: 0.30000000000004)
  const rounded = Math.round(value * 1e12) / 1e12;
  return String(rounded);
}

export default function App() {
  const [expr, setExpr] = useState<string>("2*(3+4)");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  const handleCalculate = () => {
    setError("");
    setResult(null);
    try {
      const v = evaluateExpression(expr);
      setResult(v);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Expressão inválida.";
      setError(msg);
    }
  };

  const handleClear = () => {
    setExpr("");
    setResult(null);
    setError("");
  };

  return (
    <div className="calc-page">
      <div className="calc-card">
        <h1 className="calc-title">Calculadora</h1>
        <p className="calc-subtitle">
          Suporta `+ - * / %`, parênteses, `sqrt(x)`, `abs(x)`, potência com `**` (ou `^`) e
          divisão inteira com `//`.
        </p>

        <form
          className="calc-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleCalculate();
          }}
        >
          <label className="calc-label" htmlFor="expr">
            Expressão
          </label>
          <input
            id="expr"
            className="calc-input"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="Ex: sqrt(16) + 5"
            aria-label="Expressão matemática"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="calc-actions">
            <button className="calc-btn calc-btnPrimary" type="submit">
              Calcular
            </button>
            <button
              className="calc-btn"
              type="button"
              onClick={handleClear}
              disabled={expr.trim().length === 0 && !error && result === null}
            >
              Limpar
            </button>
          </div>
        </form>

        {error && (
          <div className="calc-error" role="alert">
            {error}
          </div>
        )}

        {result !== null && (
          <div className="calc-result" aria-live="polite">
            Resultado: {formatNumber(result)}
          </div>
        )}
      </div>
    </div>
  );
}
