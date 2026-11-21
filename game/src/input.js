// Keyboard and mouse, read fresh every frame. WASD or arrows move and drive, E interacts and
// enters or leaves a vehicle, Space or a mouse click shoots toward the cursor, P pauses,
// M mutes, C continues a saved run from the title screen.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_SHOOT = 8;
export const ACTION_CONTINUE = 16;
export const ACTION_MUTE = 32;

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code]) {
      held.add(MOVE_KEYS[event.code]);
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      actions |= ACTION_SHOOT;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyE') {
      actions |= ACTION_INTERACT;
    } else if (event.code === 'KeyC') {
      actions |= ACTION_CONTINUE;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    if (MOVE_KEYS[event.code]) held.delete(MOVE_KEYS[event.code]);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    mouseX = (event.clientX - rect.left) * scaleX;
    mouseY = (event.clientY - rect.top) * scaleY;
  }

  function onMouseDown(event) {
    onMouseMove(event);
    mouseDown = true;
    actions |= ACTION_SHOOT;
  }

  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** The held movement direction as {x, y} in -1..1, and whether the player is shooting. */
    direction() {
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      return { x, y, shooting: mouseDown };
    },
    /** The mouse position in canvas pixels, for aiming. */
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    /** The actions pressed since the last call; each is reported once. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
