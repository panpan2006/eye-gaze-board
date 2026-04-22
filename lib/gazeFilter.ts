export class GazeFilter {
  private smoothX: number | null = null;
  private smoothY: number | null = null;
  private alpha: number; // 0 = max smoothing, 1 = no smoothing

  constructor(alpha = 0.25) {
    this.alpha = alpha;
  }

  filter(x: number, y: number): { x: number; y: number } {
    if (this.smoothX === null || this.smoothY === null) {
      this.smoothX = x;
      this.smoothY = y;
    } else {
      this.smoothX = this.alpha * x + (1 - this.alpha) * this.smoothX;
      this.smoothY = this.alpha * y + (1 - this.alpha) * this.smoothY;
    }

    return {
      x: Math.round(this.smoothX),
      y: Math.round(this.smoothY),
    };
  }

  reset() {
    this.smoothX = null;
    this.smoothY = null;
  }
}