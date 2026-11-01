import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useFileSystemActions } from "contexts/fileSystem";
import { DESKTOP_PATH } from "utils/constants";
import { blobToBuffer } from "utils/functions";

const WIDTH = 960;
const HEIGHT = 640;
const MAX_UNDO = 12;

const StyledFallback = styled.div`
  background: #c0c0c0;
  box-sizing: border-box;
  color: #151515;
  display: flex;
  flex-direction: column;
  font-family: Arial, sans-serif;
  font-size: 13px;
  height: 100%;
  overflow: hidden;
  width: 100%;

  .tools {
    align-items: center;
    background: #dadada;
    border-bottom: 1px solid #8d8d8d;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 9px;
  }

  button {
    background: #f4f4f4;
    border: 1px solid #777;
    border-radius: 3px;
    color: #111;
    cursor: pointer;
    font: inherit;
    padding: 7px 10px;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &[aria-pressed="true"] {
      background: #cae2fa;
      border-color: #2769a1;
    }
  }

  .color {
    height: 32px;
    width: 38px;
  }

  .size {
    width: 90px;
  }

  .stage {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 16px;
  }

  canvas {
    background: #fff;
    border: 1px solid #777;
    box-shadow: 2px 2px 3px #999;
    cursor: crosshair;
    display: block;
    height: auto;
    max-width: 100%;
    touch-action: none;
  }

  .footer {
    background: #ededed;
    border-top: 1px solid #999;
    min-height: 25px;
    padding: 6px 10px;
  }
`;

type Point = { x: number; y: number };

const FallbackPaint: FC = () => {
  const { createPath, updateFolder } = useFileSystemActions();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef(false);
  const previousPoint = useRef<Point>({ x: 0, y: 0 });
  const undoStack = useRef<ImageData[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [color, setColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [fileName, setFileName] = useState("My Drawing");
  const [status, setStatus] = useState(
    "Basic Paint mode: draw, erase, open images and save PNG files."
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }, []);

  const snapshot = (): void => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    undoStack.current.push(ctx.getImageData(0, 0, WIDTH, HEIGHT));
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
  };

  const pointFromEvent = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): Point => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const onPointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): void => {
    if (event.button !== 0) return;

    const canvas = event.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    event.preventDefault();
    snapshot();
    canvas.setPointerCapture(event.pointerId);
    activeStroke.current = true;
    previousPoint.current = pointFromEvent(event);
    const { x, y } = previousPoint.current;

    ctx.fillStyle = eraser ? "#ffffff" : color;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onPointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): void => {
    if (!activeStroke.current) return;

    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;

    const next = pointFromEvent(event);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(previousPoint.current.x, previousPoint.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    previousPoint.current = next;
  };

  const stopStroke = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): void => {
    activeStroke.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const undo = (): void => {
    const ctx = canvasRef.current?.getContext("2d");
    const image = undoStack.current.pop();

    if (ctx && image) ctx.putImageData(image, 0, 0);
    setUndoCount(undoStack.current.length);
  };

  const clear = (): void => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    snapshot();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    setStatus("Canvas cleared. Use Undo to restore it.");
  };

  const openImage = (file?: File): void => {
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        snapshot();
        const scale = Math.min(WIDTH / image.width, HEIGHT / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(
          image,
          (WIDTH - width) / 2,
          (HEIGHT - height) / 2,
          width,
          height
        );
        setFileName(file.name.replace(/\.[^/.]+$/, ""));
        setStatus("Opened " + file.name);
      }
      URL.revokeObjectURL(imageUrl);
    };
    image.onerror = () => {
      setStatus("Could not open that image.");
      URL.revokeObjectURL(imageUrl);
    };
    image.src = imageUrl;
  };

  const renderPng = (callback: (blob: Blob) => void): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) callback(blob);
        else setStatus("Could not export this canvas.");
      },
      "image/png"
    );
  };

  const savePng = (): void => {
    renderPng(async (blob) => {
      const safeName =
        fileName.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\.png$/i, "") ||
        "My Drawing";

      try {
        const storedName = await createPath(
          safeName + ".png",
          DESKTOP_PATH,
          await blobToBuffer(blob)
        );
        if (!storedName) throw new Error("No file created");

        await updateFolder(DESKTOP_PATH, storedName);
        setStatus("Saved " + storedName + " to Desktop.");
      } catch {
        setStatus("Desktop save failed. Try Download PNG instead.");
      }
    });
  };

  const downloadPng = (): void => {
    renderPng((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download =
        (fileName.trim().replace(/[\\/:*?"<>|]/g, "_") || "My Drawing")
          .replace(/\.png$/i, "") + ".png";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setStatus("PNG downloaded.");
    });
  };

  return (
    <StyledFallback>
      <div className="tools">
        <strong>Paint</strong>
        <button
          aria-pressed={!eraser}
          onClick={() => setEraser(false)}
          type="button"
        >
          Pencil
        </button>
        <button
          aria-pressed={eraser}
          onClick={() => setEraser(true)}
          type="button"
        >
          Eraser
        </button>
        <label>
          Color{" "}
          <input
            aria-label="Brush color"
            className="color"
            onChange={(event) => setColor(event.target.value)}
            type="color"
            value={color}
          />
        </label>
        <label>
          Size{" "}
          <input
            aria-label="Brush size"
            className="size"
            max={36}
            min={1}
            onChange={(event) => setBrushSize(Number(event.target.value))}
            type="range"
            value={brushSize}
          />
        </label>
        <button disabled={!undoCount} onClick={undo} type="button">
          Undo
        </button>
        <button onClick={clear} type="button">
          Clear
        </button>
        <label>
          Open image{" "}
          <input
            accept="image/*"
            aria-label="Open image file"
            onChange={(event) => {
              openImage(event.target.files?.[0]);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        <input
          aria-label="Image filename"
          onChange={(event) => setFileName(event.target.value)}
          size={13}
          value={fileName}
        />
        <button onClick={savePng} type="button">
          Save PNG
        </button>
        <button onClick={downloadPng} type="button">
          Download PNG
        </button>
      </div>
      <div className="stage">
        <canvas
          aria-label="Paint drawing canvas"
          height={HEIGHT}
          onPointerCancel={stopStroke}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopStroke}
          ref={canvasRef}
          width={WIDTH}
        />
      </div>
      <div aria-live="polite" className="footer" role="status">
        {status}
      </div>
    </StyledFallback>
  );
};

export default FallbackPaint;
