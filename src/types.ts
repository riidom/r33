export type Edge = {
  index: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  owner: string,
  contributedToLoss: boolean,
}

export type EdgeListObj = Record<string, Edge>

export type EdgeListArr = Edge[]
