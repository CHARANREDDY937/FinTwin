import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

const storageStore = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key) => (key in storageStore ? storageStore[key] : null)),
    setItem: vi.fn((key, val) => {
      storageStore[key] = String(val);
    }),
    removeItem: vi.fn((key) => {
      delete storageStore[key];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(storageStore)) delete storageStore[k];
    }),
  },
  writable: true,
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));