# Potential sources of truth
I've found this possabilities regarding where to find the active pokemon, enemy pokemon list and the moves of the active pokemon.
- My first approach, much like what [RogueDex extension](https://github.com/roguedex-dev/roguedex) does, was to try to intercept the sessionData fetch calls and retrieve both party and enemy pokemon information. This approach has 2 major issues:
  - The game internaly stores the sessionData and doesn't refetch it unless it really needs to. Sometimes, if you just refresh the page, the fetch doesn't happen at all, making it impossible to track changes.
  - This data doesn't include which is the active pokemon in battle, making it impossible to determine which moves to show effectiveness for.
- The approach I left bellow does seem to work, but it's a bit hacky and relies on the internal structure of the Phaser game engine, which may change in future updates. I really don't like the magic numbers either so I deemed this approach unreliable for now.
- The final and most reliable approach was to intercept the CanvasRenderingContext2D.fillText method and monitor for changes in the pokemon names being drawn on screen. This way, we can be sure we're always getting the correct active pokemon and enemy pokemon names as they appear in battle. This is the approach currently implemented in the extension.


## Current battle pokemon list>
window.window.Phaser.Display.Canvas.CanvasPool.pool[1].parent._events.destroy.context._events.destroy.context.displayList.list[2].list.filter(i=>i.type==="Container").map(i=>i.name).slice(4)
This array is of length 2 during a single battle, containing the [ememy1, player1] pokemon names. During double battles, it contains 4 pokemon names [enemy1, enemy2, player1, player2].

## Active pokemon available moves
### When the ui-mode is FIGHT, the active pokemon's moves are listed in:
window.document.defaultView.Phaser.Display.Canvas.CanvasPool.pool.slice(1668, 1672).map(i=>i.parent.name)