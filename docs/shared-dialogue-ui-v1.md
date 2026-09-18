# TAROT BREAKER Shared Dialogue UI v1.0

## Canonical specification

All map dialogue windows use the Alenon prologue dialogue specification.

- width: max 720px, 92vw
- mobile width: max 460px
- minimum height: 132px desktop / 138px mobile
- dark navy translucent background
- thin gold border
- speaker name in pale gold
- dialogue text 18–21px, line-height 1.6
- multiple lines supported
- ▼ appears only after the line is fully revealed
- first tap while typing reveals the complete line
- next tap advances
- Enter / Space follows the same rule
- the full text is laid out before reveal, so wrapping does not jump mid-line

## Files

Every map that can show dialogue should load:

```html
<link rel="stylesheet" href="./shared-dialogue.css?v=1.0.0" />
<script src="./shared-dialogue.js?v=1.0.0"></script>
```

Paths should be adjusted when the map HTML is in a subdirectory.

## Creating a dialogue UI

```js
const dialogue = TarotDialogueUI.create({
  mount: document.getElementById("game-shell") || document.body,
  onAdvance: () => nextStoryStep(),
});

dialogue.show({
  speaker: "シオン",
  text: "セリフ",
  actor: "shion",
});
```

Runtime controls:

- `show({ speaker, text, actor })`
- `hide()`
- `revealAll()`
- `handleAdvance()`
- `setState("dialogue" | "acting")`
- `setAdvanceHandler(fn)`
- `isTyping()`
- `isComplete()`

## Existing maps

- Alenon prologue: shared runtime + shared styles
- Star Gate Garden: shared runtime + shared styles
- PAD landing: shared files loaded and ready for future dialogue

New maps should not make a new dialogue window implementation. Use the shared component.
