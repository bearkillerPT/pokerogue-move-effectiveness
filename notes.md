# Potential sources of truth
## Current battle pokemon list>
window.window.Phaser.Display.Canvas.CanvasPool.pool[1].parent._events.destroy.context._events.destroy.context.displayList.list[2].list.filter(i=>i.type==="Container").map(i=>i.name).slice(4)
This array is of length 2 during a single battle, containing the [ememy1, player1] pokemon names. During double battles, it contains 4 pokemon names [enemy1, enemy2, player1, player2].

## Active pokemon available moves
### When the ui-mode is FIGHT, the active pokemon's moves are listed in:
window.document.defaultView.Phaser.Display.Canvas.CanvasPool.pool.slice(1668, 1672).map(i=>i.parent.name)