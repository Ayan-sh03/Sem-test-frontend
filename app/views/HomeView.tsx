"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export default function MicrophoneComponent() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [transcript, setTranscript] = useState("");

  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const accumulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (imageUrls.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [imageUrls]);

  const emitTranscript = useCallback(() => {
    if (socketRef.current && accumulatedTranscriptRef.current.trim()) {
      // console.log('Emitting transcript:', accumulatedTranscriptRef.current);
      socketRef.current.emit("transcript", accumulatedTranscriptRef.current);
      accumulatedTranscriptRef.current = "";
    }
  }, []);

  useEffect(() => {
    socketRef.current = io("http://localhost:3002");
    console.log("Socket connected");

    socketRef.current.emit("hello", "this is test");

    // listen on image event
    socketRef.current.on("image", (data: string[]) => {
      console.log("====================================");
      console.log("Printing image data");
      console.log(data);

      console.log("====================================");
      setImageUrls((prev) => [...prev, ...Array.from(new Set(data))]);
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: any) => {
      const { transcript } = event.results[event.results.length - 1][0];
      setTranscript(transcript);
      accumulatedTranscriptRef.current += " " + transcript;
      console.log("Accumulated Transcript:", accumulatedTranscriptRef.current);
    };

    recognitionRef.current.start();

    if (accumulationTimerRef.current) {
      clearInterval(accumulationTimerRef.current);
    }

    accumulationTimerRef.current = setInterval(() => {
      console.log("Interval triggered");
      emitTranscript();
    }, 10000);
  }, [emitTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecordingComplete(true);
    }
    if (accumulationTimerRef.current) {
      clearInterval(accumulationTimerRef.current);
    }
    emitTranscript();
  }, [emitTranscript]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (accumulationTimerRef.current) {
        clearInterval(accumulationTimerRef.current);
      }
    };
  }, []);

  const handleToggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex items-center justify-center h-screen w-full">
      <div className="w-full">
        {(isRecording || transcript) && (
          <div className="w-1/4 m-auto rounded-md border p-4 bg-white">
            <div className="flex-1 flex w-full justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {recordingComplete ? "Recorded" : "Recording"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {recordingComplete
                    ? "Thanks for talking."
                    : "Start speaking..."}
                </p>
              </div>
              {isRecording && (
                <div className="rounded-full w-4 h-4 bg-red-400 animate-pulse" />
              )}
            </div>

            {transcript && (
              <div className="border rounded-md p-2 h-fullm mt-4">
                <p className="mb-0">{transcript}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center w-full">
          <button
            onClick={handleToggleRecording}
            className={`mt-10 m-auto flex items-center justify-center ${
              isRecording
                ? "bg-red-400 hover:bg-red-500"
                : "bg-blue-400 hover:bg-blue-500"
            } rounded-full w-20 h-20 focus:outline-none`}
          >
            {isRecording ? (
              <svg
                className="h-12 w-12"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="white" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-white"
              >
                <path
                  fill="currentColor"
                  d="M128 176a48.05 48.05 0 0 0 48-48V64a48 48 0 0 0-96 0v64a48.05 48.05 0 0 0 48 48ZM96 64a32 32 0 0 1 64 0v64a32 32 0 0 1-64 0Zm40 143.6V232a8 8 0 0 1-16 0v-24.4A80.11 80.11 0 0 1 48 128a8 8 0 0 1 16 0a64 64 0 0 0 128 0a8 8 0 0 1 16 0a80.11 80.11 0 0 1-72 79.6Z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-8 w-full max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Generated Images</h2>
          {imageUrls.length > 0 ? (
            <div className="relative aspect-square w-full max-w-md mx-auto">
              <img
                src={imageUrls[currentImageIndex]}
                alt={`Generated image ${currentImageIndex + 1}`}
                // layout="fill"

                // objectFit="cover"
                className="rounded-lg"
              />
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                No images generated yet. Start recording to see results!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
