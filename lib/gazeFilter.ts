export class GazeFilter {
  private smoothX: number | null = null;
  private smoothY: number | null = null;
  private alpha: number;

  // Median filter buffer — stores last N raw points
  private bufferX: number[] = [];
  private bufferY: number[] = [];
  private bufferSize: number;

  // Dead zone — ignore movements smaller than this many pixels
  private deadZone: number;

  constructor(alpha = 0.1, bufferSize = 5, deadZone = 18) {
    this.alpha = alpha;
    this.bufferSize = bufferSize;
    this.deadZone = deadZone;
  }

  private median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  filter(x: number, y: number): { x: number; y: number } {
    // Step 1: Add to median buffer
    this.bufferX.push(x);
    this.bufferY.push(y);
    if (this.bufferX.length > this.bufferSize) this.bufferX.shift();
    if (this.bufferY.length > this.bufferSize) this.bufferY.shift();

    // Step 2: Take median of buffer to remove outlier spikes
    const medX = this.median(this.bufferX);
    const medY = this.median(this.bufferY);

    // Step 3: Initialize on first call
    if (this.smoothX === null || this.smoothY === null) {
      this.smoothX = medX;
      this.smoothY = medY;
      return { x: Math.round(this.smoothX), y: Math.round(this.smoothY) };
    }

    // Step 4: Dead zone — if movement is tiny, don't update at all
    const dx = medX - this.smoothX;
    const dy = medY - this.smoothY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.deadZone) {
      return { x: Math.round(this.smoothX), y: Math.round(this.smoothY) };
    }

    // Step 5: Exponential moving average on the median
    this.smoothX = this.alpha * medX + (1 - this.alpha) * this.smoothX;
    this.smoothY = this.alpha * medY + (1 - this.alpha) * this.smoothY;

    return {
      x: Math.round(this.smoothX),
      y: Math.round(this.smoothY),
    };
  }

  reset() {
    this.smoothX = null;
    this.smoothY = null;
    this.bufferX = [];
    this.bufferY = [];
  }
}