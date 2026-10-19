import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import ManualOverlay from './ManualOverlay.jsx';

const html = renderToStaticMarkup(<ManualOverlay open onClose={() => {}} UI_BTN_SM="" />);

it('no se renderiza cerrado', () => {
  expect(renderToStaticMarkup(<ManualOverlay open={false} onClose={() => {}} UI_BTN_SM="" />)).toBe('');
});

it('menciona todas las secciones de la barra de navegación', () => {
  for (const seccion of ['Escala', 'Ruta', 'Acordes', 'Acordes cercanos', 'Comparador de escalas', 'Standards', 'configuración']) {
    expect(html).toContain(seccion);
  }
});

it('documenta las funciones añadidas desde la 6.0.96', () => {
  for (const texto of ['Aumentada', 'sus2', 'Todo el mástil', 'Disponible sin conexión', 'Actualizar ahora']) {
    expect(html).toContain(texto);
  }
});

it('no menciona secciones eliminadas', () => {
  expect(html).not.toContain('Patrones');
});
