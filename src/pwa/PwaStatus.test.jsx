import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import PwaStatus from './PwaStatus.jsx';

const render = state => renderToStaticMarkup(<PwaStatus store={{ getSnapshot: () => state, getServerSnapshot: () => state, subscribe: () => () => {}, apply: () => {} }} />);

it('distingue una preparación incompleta de una instalación disponible sin conexión', () => {
  expect(render({ status: 'preparing' })).toContain('Preparando el uso sin conexión');
  expect(render({ status: 'preparing' })).not.toContain('Disponible sin conexión.');
  expect(render({ status: 'ready' })).toContain('Disponible sin conexión.');
  expect(render({ status: 'error', error: 'Descarga incompleta' })).toContain('role="alert"');
});

it('avisa del restablecimiento de configuración y permite conservar presets antes del clic', () => {
  const html = render({ status: 'ready', updateReady: true });
  expect(html).toContain('la configuración actual se restablece');
  expect(html).toContain('los presets se conservan');
  expect(html).toContain('Actualizar ahora');
  expect(render({ status: 'ready', updateReady: true, applying: true })).toContain('disabled=""');
});
