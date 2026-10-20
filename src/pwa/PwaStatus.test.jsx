import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import PwaStatus from './PwaStatus.jsx';

const render = state => renderToStaticMarkup(<PwaStatus store={{ getSnapshot: () => state, getServerSnapshot: () => state, subscribe: () => () => {}, apply: () => {} }} />);

it('distingue la preparación y el error sin mostrar una confirmación fija al estar lista', () => {
  expect(render({ status: 'preparing' })).toContain('Preparando el uso sin conexión');
  expect(render({ status: 'preparing' })).not.toContain('Disponible sin conexión.');
  expect(render({ status: 'error', error: 'Descarga incompleta' })).toContain('role="alert"');
  expect(render({ status: 'error' })).toContain('Uso sin conexión no disponible.');
});

it('oculta la confirmación de disponibilidad cuando la caché está lista', () => {
  expect(render({ status: 'ready' })).toBe('');
  expect(render({ status: 'ready', updateReady: true })).not.toContain('Disponible sin conexión.');
});

it('avisa del restablecimiento de configuración y permite conservar presets antes del clic', () => {
  const html = render({ status: 'ready', updateReady: true });
  expect(html).toContain('la configuración actual se restablece');
  expect(html).toContain('los presets se conservan');
  expect(html).toContain('Actualizar ahora');
  expect(render({ status: 'ready', updateReady: true, applying: true })).toContain('disabled=""');
});
