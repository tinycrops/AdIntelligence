type ProcessingOverlayProps = {
  status: string;
  progress: number;
};

export default function ProcessingOverlay({ status, progress }: ProcessingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-10">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-secondary-500 mb-4"></div>
      <p className="text-white text-lg mb-2">AI Processing...</p>
      <p className="text-gray-300 text-sm">{status}</p>
      <div className="w-64 h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
        <div 
          className="h-full bg-secondary-500 transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
