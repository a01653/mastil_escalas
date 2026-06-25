export default function ManualOverlay({ open, onClose, UI_BTN_SM }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-900/45 p-4">
      <div className="mt-8 max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Manual de uso</div>
            <div className="text-sm text-slate-600">Qué hace la página y cómo empezar sin conocerla.</div>
          </div>
          <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Qué hace</div>
            <div className="mt-2 text-xs leading-5 text-slate-600">
              Esta página muestra escalas, comparación de escalas, rutas sobre el mástil y acordes con digitaciones reales.
              Sirve para estudiar dónde están las notas, qué intervalos forman una escala, cómo se comparan dos escalas y qué acordes puedes tocar o investigar.
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Flujo rápido</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>1. Elige <b>Nota raíz</b> y <b>Escala</b>.</div>
              <div>2. Decide si quieres ver <b>Notas</b>, <b>Intervalos</b> o ambos.</div>
              <div>3. Activa los mástiles que necesites: <b>Escala</b>, <b>Comparar</b>, <b>Ruta</b> y <b>Acordes</b>.</div>
              <div>4. Ajusta <b>Trastes</b> para ampliar o reducir el rango visible.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Mástil de escala</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Resalta raíz, 3ª, 5ª y resto de notas de la escala.</div>
              <div>Puedes activar <b>Notas extra</b> para añadir tensiones o notas ajenas.</div>
              <div><b>Ver todo</b> muestra también notas fuera de la escala.</div>
              <div>Al pasar el ratón por una celda vacía aparece la nota del traste.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Comparador de escalas</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Muestra hasta 2 escalas simultáneamente sobre el mástil.</div>
              <div>Activa cada fila con <b>Ver</b>. Solo 2 pueden estar visibles a la vez (FIFO).</div>
              <div>Las notas únicas de cada escala aparecen en círculos de su color.</div>
              <div>Si dos escalas comparten una nota, se ven dos círculos juntos en el mismo traste.</div>
              <div>Con dos escalas activas, <b>Puntos de resolución</b> muestra dónde convergen o divergen las tensiones de ambas.</div>
              <div>Útil para comparar modos, escalas paralelas o sustituciones.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Ruta musical</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Calcula un recorrido entre una nota inicial y una final siguiendo la escala.</div>
              <div>Puedes escribir posiciones como <b>61</b> o elegirlas con clic en el mástil.</div>
              <div>La ruta busca llegar del inicio al fin de la forma más tocable posible.</div>
              <div>El límite de notas por cuerda es orientativo: intenta respetarlo, pero puede hacer slides o pequeños desplazamientos si eso mejora la digitación.</div>
              <div>Prioriza avanzar con lógica de guitarrista, evitando retrocesos absurdos de cuerda y favoreciendo trayectorias diagonales naturales.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Acorde principal</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Construye acordes a partir de tono, calidad, estructura, forma, inversión y extensiones.</div>
              <div>La app busca voicings reales y los puedes recorrer con las flechas o el desplegable.</div>
              <div><b>Estudiar</b> abre un análisis del acorde, el voicing y sus tensiones.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Modo Manual</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Al activar el modo <b>Manual</b>, el cuadro de acorde queda bloqueado y seleccionas notas directamente en el mástil.</div>
              <div>Solo puede haber una nota por cuerda. Si pulsas otra en la misma cuerda, sustituye a la anterior.</div>
              <div>La app propone lecturas posibles del acorde y puedes copiar una a la sección de arriba.</div>
              <div>Arriba a la derecha tienes los iconos de altavoz, <b>Play</b> y limpiar; el altavoz tachado indica que el sonido al pulsar está apagado y <b>Play</b> recorre la selección cuerda a cuerda, de 6ª a 1ª, mientras va resaltando cada nota.</div>
              <div><b>Mantener lectura anterior</b> intenta conservar la lectura funcional previa cuando el cambio de notas es pequeño; si está apagado, siempre se elige el primer candidato del motor.</div>
              <div><b>Priorizar acorde de referencia</b> reordena los candidatos favoreciendo la raíz y calidad indicadas, sin eliminar ninguna lectura.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Acordes cercanos</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Permite comparar hasta 4 acordes en una misma zona del mástil.</div>
              <div>Busca digitaciones dentro de un rango de trastes y ordena por cercanía al acorde de referencia.</div>
              <div>Con <b>Auto</b> activado, los acordes se generan según la raíz, escala y armonización activas; <b>Estilo</b> y <b>Progresión</b> controlan el tipo de armonía.</div>
              <div>Con <b>Auto</b> desactivado, cada acorde queda bajo edición manual.</div>
              <div>Sirve para estudiar progresiones, voice leading y tonalidades posibles.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Presets y configuración</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div><b>Presets rápidos</b> guardan y recuperan configuraciones habituales.</div>
              <div><b>Exportar config</b> guarda toda la configuración en un JSON.</div>
              <div><b>Importar config</b> recupera una configuración anterior.</div>
              <div><b>Restablecer</b> vuelve a los valores por defecto.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">Consejos</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>Empieza con una escala simple, por ejemplo mayor o pentatónica menor.</div>
              <div>Usa primero <b>Notas</b>; cuando ubiques bien el mástil, añade <b>Intervalos</b>.</div>
              <div>Para estudiar armonía, combina <b>Acorde principal</b>, <b>Estudiar</b> y <b>Acordes cercanos</b>.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
