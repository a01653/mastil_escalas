/**
 * Explicaciones de las opciones deshabilitadas de un control de acorde (Calidad /
 * Sus, Quinta / Novena, Extensiones), una por línea con su término en negrita,
 * como la ayuda de Forma. Se abre desde el botón de información, así que también
 * se puede consultar en móvil sin depender del title.
 */
export default function ChordHintList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <p key={item.term}><strong>{item.term}:</strong> {item.text}</p>
      ))}
    </div>
  );
}
