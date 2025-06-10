export type PathPoint = { x: number; y: number };
export type PathGenerator = (width: number, height: number, numPoints: number) => PathPoint[];

export const createHouseShapePath: PathGenerator = (pWidth, pHeight, pathResolution) => {
  const newPath: PathPoint[] = [];
  const housePoints = [
    { x: 0.35, y: 0.55 }, { x: 0.35, y: 0.35 }, { x: 0.5, y: 0.15 },
    { x: 0.65, y: 0.35 }, { x: 0.65, y: 0.55 }, { x: 0.35, y: 0.55 }
  ];
  
  for (let i = 0; i < pathResolution; i++) {
    const t = i / (pathResolution - 1);
    const numSegments = housePoints.length - 1;
    const segmentIndex = Math.min(Math.floor(t * numSegments), numSegments - 1);
    const segmentT = (t * numSegments) % 1;
    
    const p1 = housePoints[segmentIndex];
    const p2 = housePoints[segmentIndex + 1] || housePoints[segmentIndex];
    
    const x = pWidth * (p1.x + (p2.x - p1.x) * segmentT);
    const y = pHeight * (p1.y + (p2.y - p1.y) * segmentT);
    newPath.push({ x, y });
  }
  return newPath;
};

export const createSineWavePath: PathGenerator = (pWidth, pHeight, pathResolution) => {
  const newPath: PathPoint[] = [];
  for (let i = 0; i < pathResolution; i++) {
    const t = i / (pathResolution - 1);
    const x = pWidth * 0.15 + pWidth * 0.7 * t;
    const y = pHeight * 0.5 - Math.sin(t * Math.PI) * pHeight * 0.15;
    newPath.push({ x, y });
  }
  return newPath;
};

export const createDoubleSineWavePath: PathGenerator = (pWidth, pHeight, pathResolution) => {
  const newPath: PathPoint[] = [];
  for (let i = 0; i < pathResolution; i++) {
    const t = i / (pathResolution - 1);
    const x = pWidth * 0.15 + pWidth * 0.7 * t;
    const y = pHeight * 0.5 - Math.sin(t * Math.PI * 2) * pHeight * 0.12;
    newPath.push({ x, y });
  }
  return newPath;
};

export const createSpiralPath: PathGenerator = (pWidth, pHeight, pathResolution) => {
  const newPath: PathPoint[] = [];
  for (let i = 0; i < pathResolution; i++) {
    const t = i / (pathResolution - 1);
    const angle = t * Math.PI * 4;
    const radius = pWidth * 0.25 * (1 - t * 0.5);
    const x = pWidth / 2 + Math.cos(angle) * radius;
    const y = pHeight / 2 + Math.sin(angle) * radius;
    newPath.push({ x, y });
  }
  return newPath;
};

export const createFigure8Path: PathGenerator = (pWidth, pHeight, pathResolution) => {
  const newPath: PathPoint[] = [];
  for (let i = 0; i < pathResolution; i++) {
    const t = i / (pathResolution - 1);
    const f8angle = t * Math.PI * 2;
    const x = pWidth / 2 + Math.cos(f8angle) * pWidth * 0.2;
    const y = pHeight / 2 + Math.sin(f8angle * 2) * pHeight * 0.12;
    newPath.push({ x, y });
  }
  return newPath;
};

export const pathGenerators = [
    createHouseShapePath,
    createSineWavePath,
    createDoubleSineWavePath,
    createSpiralPath,
    createFigure8Path
  
]; 