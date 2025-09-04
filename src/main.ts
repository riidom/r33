import {
  k, lineCol, pointCol, helpText,
  getRandomNeutralEdge, resetEdges,
  points, edges, checkForCompletedTriangle,
} from "./exports"

k.scene("game", () => {
  let currentTurn = "human"
  let looser = undefined

  k.loadRoot("./")
  k.setBackground(30,30,30)

  const turnIndicator = k.add([
    k.text("turn: " + currentTurn, {
      size: 24
    }),
    k.pos(points[4].x - 16, points[4].y / 2 - 36),
    "turnIndicator",
  ])

  k.add([
    k.text(helpText.content, {
      size: 16,
      lineSpacing: 2,
      styles: helpText.styles,
    }),
    k.pos(0, 380),
  ])

  k.onDraw(() => {
    Object.keys(edges).forEach(edgeKey => {
      const e = edges[edgeKey]
      const edgeWidth = e.contributedToLoss ? 10 : 4

      k.drawLine({
        p1: k.vec2(e.x1, e.y1),
        p2: k.vec2(e.x2, e.y2),
        width: edgeWidth,
        color: lineCol[e.owner]
      })
    })

    points.forEach(p => {
      k.drawCircle({
        pos: k.vec2(p.x, p.y),
        radius: 16,
        color: pointCol,
      })

      k.drawText({
        text: `[b]${p.index}[/b]`,
        font: "sans-serif",
        size: 24,
        width: 24,
        pos: k.vec2(p.x - 9, p.y - 11),
        color: k.BLACK,
      })
    })
  })

  k.on("computerTurn", "turnIndicator", () => {
    k.wait(1, () => {
      const e1 = getRandomNeutralEdge()
      e1.owner = "computer"
      const t1 = checkForCompletedTriangle(e1, "computer")
      // if realizing a fail, pick another edge, once
      if (t1) {
        e1.owner = "neutral"
        const e2 = getRandomNeutralEdge()
        e2.owner = "computer"
        const t2 = checkForCompletedTriangle(e2, "computer")
        // const t2 = t1 // computer fails faster
        if (t2) {
          for (const e of t2) e.contributedToLoss = true
          looser = "computer"
          turnIndicator.text = looser + "\nhas lost!"
          k.wait(3, () => {
            resetEdges()
            k.go("game")
          })
        }
      }
      if (!looser) k.wait(0.5, () => {
          // pass back to human
          currentTurn = "human"
          turnIndicator.text = "turn: " + currentTurn
        })
    })
  })

  k.onMouseRelease(button => {
    if (button !== "left" || currentTurn !== "human" || looser) return

    // invisible circle at mouse pos for collision test
    const m = new k.Circle(k.mousePos(), 12)

    for (const edgeKey of Object.keys(edges)) {
      const e = edges[edgeKey]

      // invisible line at each real line for collision test
      const l = new k.Line(
        k.vec2(e.x1, e.y1),
        k.vec2(e.x2, e.y2)
      )

      if (k.testLineCircle(l, m)) {
        if (edges[edgeKey].owner === "neutral") {
          edges[edgeKey].owner = "human"
          const t = checkForCompletedTriangle(edges[edgeKey], "human")
          if (t) {
            for (const e of t) e.contributedToLoss = true
            looser = "human"
            turnIndicator.text = looser + "\nhas lost!"
            k.wait(3, () => {
              resetEdges()
              k.go("game")
            })
          } else {
            // pass back to computer
            currentTurn = "computer"
            turnIndicator.text = "turn: " + currentTurn
            k.trigger("computerTurn", "turnIndicator")
          }
        }
        break // clicking a "crossing" should still select only one edge
      }
    }
  })
})

k.go("game")

// TODO: set up kaplay scenes (intro/menu - game - endscreen)
