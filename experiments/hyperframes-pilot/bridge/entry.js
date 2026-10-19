// Bundle entry: Storygro's real scene module + kit, unmodified (read-only imports from the repo root).
import * as kit from '../../../production/runtime/kit.js';
import hook from '../../../production/scenes/headline.js';
export const mountHook = (root, ctx) => hook.mount(root, { ...ctx, kit });
