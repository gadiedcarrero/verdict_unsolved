import type { Deduction } from '../game-engine/scene-engine/schemas';
import { translate } from '../i18n/translate';

/**
 * La pregunta de SOLUCIONAR: juntar las pruebas es una cosa, entender qué
 * demuestran es otra. Fallar no descuenta nada — la pregunta queda abierta y
 * se puede reintentar; lo único que no pasa es avanzar.
 *
 * No se marca cuál respuesta ya se probó a propósito: tacharlas convertiría
 * la deducción en descarte por eliminación, que es justo lo que la mecánica
 * intenta evitar.
 */
export function DeductionPanel({
  deduction,
  strings,
  onAnswer,
  onClose,
}: {
  deduction: Deduction;
  strings: Record<string, string>;
  onAnswer: (answerId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-graphite-950/80 p-6" style={{ zIndex: 500 }}>
      <div className="flex w-full max-w-xl flex-col gap-4 rounded border border-graphite-700 bg-graphite-900 p-6">
        <p className="text-sm font-semibold text-graphite-50">{translate(strings, deduction.question)}</p>

        <div className="flex flex-col gap-2">
          {deduction.answers.map((answer) => (
            <button
              key={answer.id}
              type="button"
              onClick={() => onAnswer(answer.id)}
              className="rounded border border-graphite-700 px-4 py-2 text-left text-sm text-graphite-100 hover:border-graphite-400 hover:bg-graphite-800"
            >
              {translate(strings, answer.text)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="self-end text-xs tracking-widest text-graphite-400 uppercase hover:text-graphite-200"
        >
          {translate(strings, 'deduction.back')}
        </button>
      </div>
    </div>
  );
}
