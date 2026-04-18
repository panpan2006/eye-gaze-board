interface GazeData {
  x: number;
  y: number;
}

interface WebGazer {
  setGazeListener(
    listener: (data: GazeData | null, timestamp: number) => void
  ): WebGazer;
  clearGazeListener(): WebGazer;
  begin(): Promise<WebGazer>;
  end(): void;
  pause(): WebGazer;
  resume(): WebGazer;
  showVideo(show: boolean): WebGazer;
  showFaceOverlay(show: boolean): WebGazer;
  showFaceFeedbackBox(show: boolean): WebGazer;
  showPredictionPoints(show: boolean): WebGazer;
  setRegression(type: string): WebGazer;
}

interface Window {
  webgazer: WebGazer;
}