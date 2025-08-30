import kaplay from "kaplay";
import type { Edge, EdgeListArr, EdgeListObj } from "./types"

//
// k
//

export const k = kaplay()

//
// misc constants
//

const radius = 300
const center = k.vec2(radius * 1.5)
export const lineCol = {
  neutral: k.rgb(100, 100, 100),
  human: k.rgb(100, 100, 200),
  computer: k.rgb(200, 100, 100),
}
export const pointCol = k.rgb(200, 200, 200)
const textCol = {
  human: k.rgb(125, 125, 250),
  computer: k.rgb(250, 125, 125),
  bullet: k.rgb(250, 250, 125),
}

export const helpText = `
[bl]1[/bl]. Take turn with the computer to color edges.
[bl]2[/bl]. Your color is [b]blue[/b], computer uses [r]red[/r].
[bl]3[/bl]. Avoid coloring a triangle completely in
   your color, because the first to complete
   a triangle, [bl]LOOSES[/bl] the game!`

export const helpTextStyles = {
  "bl": {color: textCol.bullet},
  "r": { color: textCol.computer},
  "b": { color: textCol.human},
  "n": { color: pointCol},
}

//
// helper functions
//

// turns "A" into 0 and turns 3 into "D", wrap-around supported for number input
const getAF = (i: string|number): number|string => {
  if (typeof i === "string") return i.toUpperCase().charCodeAt(0) - 65
  while (i < 0) i += 6
  while (i > 5) i -= 6
  return "ABCDEF"[i]
}

// turns "AEC" into "ACE"
const sortStr = (str: string): string =>
  str.toUpperCase().split("").sort().join("")

// get random neutral edge
export const getRandomNeutralEdge = (): Edge => {
  const getRandomEdge = (): Edge => {
    const a = getAF(Math.floor(Math.random() * 6))
    let b = getAF(Math.floor(Math.random() * 6))
    while (b === a) b = getAF(Math.floor(Math.random() * 6))

    const ab = sortStr(a as string + b as string)
    return edges[ab]
  }

  let e: Edge = getRandomEdge()
  while (e.owner !== "neutral") e = getRandomEdge()
  return e
}

// reset edge data
export const resetEdges = () => {
  for (const ei in edges) {
    const e = edges[ei]
    e.owner = "neutral"
    e.contributedToLoss = false
  }
}

//
// points
//

export const points = []

for (let i = 0; i < 6; i += 1) {
  const angle = i * Math.PI / 3
  points.push({
    index: getAF(i),
    indexBefore: getAF(i - 1),
    indexAfter: getAF(i + 1),
    angle,
    x: Math.round(center.x + radius * Math.cos(angle)),
    y: Math.round(center.y + radius * Math.sin(angle))
  })
}

//
// edges
//

export const edges: EdgeListObj = {}

for (let i = 0; i < 6; i += 1) {
  for (let j = 0; j < 6; j += 1) {
    if (i < j) {
      const e: Edge = {
        index: `${points[i].index}${points[j].index}`,
        x1: points[i].x,
        y1: points[i].y,
        x2: points[j].x,
        y2: points[j].y,
        owner: "neutral",
        contributedToLoss: false,
      }
      edges[`${points[i].index}${points[j].index}`] = e
    }
  }
}

//
// triangles
//

const triangleCodes = []
const triangles = {}

// find and list all possible triangles as sorted triple of points (e.g. "ABF")
for (let i = 0; i < 6; i += 1) {
  const indexCurrent = points[i].index

  // first we check triangles consisting of:
  // 1. the given point (i), 2. the one before and 3. all other points (j)
  const indexBefore = points[i].indexBefore

  for (let j = 0; j < 6; j += 1) {
    const indexThird = points[j].index
    if (indexThird !== indexCurrent && indexThird !== indexBefore) {
      const triangleCode = sortStr(`${indexCurrent}${indexBefore}${indexThird}`)

      if (triangles[triangleCode] === undefined) {
        triangles[triangleCode] = false
        triangleCodes.push(triangleCode)
      }
    }
  }

  // this is similar, only the 2nd point is not the one before, but after the current
  const indexAfter = points[i].indexAfter

  for (let j = 0; j < 6; j += 1) {
    const indexThird = points[j].index
    if (indexThird !== indexCurrent && indexThird !== indexAfter) {
      const triangleCode = sortStr(`${indexCurrent}${indexAfter}${indexThird}`)

      if (triangles[triangleCode] === undefined) {
        triangles[triangleCode] = false
        triangleCodes.push(triangleCode)
      }
    }
  }

  // grab the final group of triangles, every 2nd point. Basically, ACE and BDF.
  const bigTriangleCode = sortStr(`${getAF(i)}${getAF(i + 2)}${getAF(i + 4)}`)
  if (triangles[bigTriangleCode] === undefined) {
    triangles[bigTriangleCode] = false
    triangleCodes.push(bigTriangleCode)
  }
}

triangleCodes.sort()

//
// triangle specific, more complex helpers
//

// return array of triangleCodes that contain two specific points (or, an edge)
const getTrianglesContainingTwoPoints = (a: string, b: string): string[] => {
  let result = []
  for (const t of triangleCodes) {
    if (t.includes(a) && t.includes(b)) result.push(t)
  }
  return result
}

// return array of edges a specific triangle is composed of
const getEdgesFromTriangle = (t: string): EdgeListArr => {
  // points in an edge key are expected to be sorted
  // e.g. avoid `${t[2]}${t[0]}` - instead do first 0, then 2
  t = sortStr(t)
  const e1 = `${t[0]}${t[1]}`
  const e2 = `${t[0]}${t[2]}`
  const e3 = `${t[1]}${t[2]}`
  return [edges[e1], edges[e2], edges[e3]]
}

// checking if a triangle got created, whose three edges all have the same owner
export const checkForCompletedTriangle = (edge: Edge, owner: string): EdgeListArr => {
  const edgeIndex = edge.index
  const affectedTriangles = getTrianglesContainingTwoPoints(
    edgeIndex[0], edgeIndex[1]
  )

  // check all triangles where the clicked edge is part of
  for (const t of affectedTriangles) {
    const edges: EdgeListArr = getEdgesFromTriangle(t)
    let ownedEdgesCounter = 0

    // count owned edges in each triangle
    for (const e of edges) if (e.owner === owner) ownedEdgesCounter += 1

    // if it's all of them, game is lost
    if (ownedEdgesCounter === 3) return edges

  }

  // indicate that there is no unambiguously owned triangle
  return undefined
}
