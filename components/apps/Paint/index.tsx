import { basename, dirname, join } from "path";
import { useEffect, useRef, useState } from "react";
import StyledPaint from "components/apps/Paint/StyledPaint";
import { type ComponentProcessProps } from "components/system/Apps/RenderComponent";
import StyledLoading from "components/system/Apps/StyledLoading";
import useFileDrop from "components/system/Files/FileManager/useFileDrop";
import useTitle from "components/system/Window/useTitle";
import { useFileSystemActions } from "contexts/fileSystem";
import { useProcess, useProcessesActions } from "contexts/process";
import { useForegroundId, useSessionActions } from "contexts/session";
import { type WallpaperFit } from "contexts/session/types";
import {
  DESKTOP_PATH,
  IFRAME_CONFIG,
  ONE_TIME_PASSIVE_EVENT,
  PICUTRES_PATH,
} from "utils/constants";
import { blobToBuffer } from "utils/functions";

type JsPaint = {
  close: () => void;
  file_new: () => void;
  onunhandledrejection: (
    error: Error & { reason: { message: string } }
  ) => void;
  open_from_file: (file: File, fileHandle: string) => void;
  storage_quota_exceeded: () => void;
  systemHooks: {
    setWallpaperCentered: (canvas: HTMLCanvasElement) => void;
    setWallpaperTiled: (canvas: HTMLCanvasElement) => void;
    showOpenFileDialog: (props: {
      formats: unknown[];
    }) => Promise<{ file: File }>;
    showSaveFileDialog: (props: {
      defaultFileName: string;
      getBlob: (mimeType: string) => Promise<Blob>;
      savedCallbackUnreliable?: (result: {
        newBlob: Blob;
        newFileFormatID: string;
        newFileHandle: string;
        newFileName: string;
      }) => void;
    }) => Promise<void>;
    writeBlobToHandle: (fileHandle: string, blob: Blob) => Promise<void>;
  };
};

const Paint: FC<ComponentProcessProps> = ({ id }) => {
  const { closeWithTransition } = useProcessesActions();
  const {
    libs: [paintSrc = ""] = [],
    title: windowTitle,
    url = "",
  } = useProcess(id);
  const { createPath, exists, readFile, updateFolder, writeFile } =
    useFileSystemActions();
  const { setForegroundId, setWallpaper } = useSessionActions();
  const foregroundId = useForegroundId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [jsPaintInstance, setJsPaintInstance] = useState<JsPaint>();
  const { prependFileToTitle } = useTitle(id);
  const setWallpaperFromCanvas =
    (fit: WallpaperFit) =>
    (canvas: HTMLCanvasElement): void => {
      const wallpaperPath = join(PICUTRES_PATH, "wallpaper.png");

      canvas.toBlob(async (blob) => {
        await writeFile(wallpaperPath, await blobToBuffer(blob), true);
        setWallpaper(wallpaperPath, fit);
      });
    };
  const { onDragOver, onDrop } = useFileDrop({ id });

  useEffect(() => {
    prependFileToTitle("Untitled");
  }, [prependFileToTitle]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (foregroundId !== id) {
      const onClick = (): void => setForegroundId(id);
      const contentWindow = iframeRef.current?.contentWindow;

      contentWindow?.addEventListener("click", onClick, ONE_TIME_PASSIVE_EVENT);

      cleanup = () => contentWindow?.removeEventListener("click", onClick);
    }

    return cleanup;
  }, [foregroundId, id, setForegroundId]);

  useEffect(() => {
    const { contentWindow } = iframeRef.current || {};
    let cleanup: (() => void) | undefined;

    if (loaded && contentWindow && !jsPaintInstance && !loadError) {
      const jsPaint = contentWindow as unknown as JsPaint;

      // An iframe also fires "load" for a 404 or error page. Do not crash
      // the entire Paint window by accessing missing JS Paint globals.
      try {
        if (
          !jsPaint.systemHooks ||
          typeof jsPaint.systemHooks.showOpenFileDialog !== "function" ||
          typeof jsPaint.file_new !== "function"
        ) {
          setLoadError(true);
          return;
        }
      } catch {
        setLoadError(true);
        return;
      }

      const previousOpenFileDialog = jsPaint.systemHooks.showOpenFileDialog;
      const previousFileNew = jsPaint.file_new;

      setJsPaintInstance(jsPaint);

      jsPaint.file_new = () => {
        prependFileToTitle("Untitled");
        previousFileNew();
      };
      jsPaint.systemHooks.setWallpaperTiled = setWallpaperFromCanvas("tile");
      jsPaint.systemHooks.setWallpaperCentered =
        setWallpaperFromCanvas("center");
      jsPaint.systemHooks.showOpenFileDialog = async (props) => {
        const { file } = await previousOpenFileDialog(props);

        if (file) prependFileToTitle(file.name);

        return { file };
      };
      jsPaint.close = () => closeWithTransition(id);
      jsPaint.storage_quota_exceeded = () => {
        // Ignore Storage Warning
      };
      jsPaint.systemHooks.showSaveFileDialog = async ({
        defaultFileName,
        getBlob,
        savedCallbackUnreliable,
      }) => {
        // JS Paint supplies a name that may already include an extension.
        // Always produce a single .png suffix and tell JS Paint where it
        // was saved, so subsequent Save operations can overwrite the file.
        const baseName =
          basename(defaultFileName || "Untitled").replace(/\.[^/.]+$/, "") ||
          "Untitled";
        const pngBlob = await getBlob("image/png");
        const fileName = await createPath(
          `${baseName}.png`,
          DESKTOP_PATH,
          await blobToBuffer(pngBlob)
        );

        if (!fileName) return;

        await updateFolder(DESKTOP_PATH, fileName);
        savedCallbackUnreliable?.({
          newBlob: pngBlob,
          newFileFormatID: "image/png",
          newFileHandle: join(DESKTOP_PATH, fileName),
          newFileName: fileName,
        });
      };
      jsPaint.systemHooks.writeBlobToHandle = async (fileHandle, blob) => {
        if (await exists(fileHandle)) {
          await writeFile(fileHandle, await blobToBuffer(blob), true);
          updateFolder(dirname(fileHandle), basename(fileHandle));
        }
      };

      contentWindow.addEventListener("dragover", onDragOver);
      contentWindow.addEventListener("drop", onDrop);

      cleanup = () => {
        contentWindow.removeEventListener("dragover", onDragOver);
        contentWindow.removeEventListener("drop", onDrop);
      };
    }

    return cleanup;
  }, [
    closeWithTransition,
    createPath,
    exists,
    id,
    jsPaintInstance,
    loadError,
    loaded,
    onDragOver,
    onDrop,
    prependFileToTitle,
    setWallpaperFromCanvas,
    updateFolder,
    writeFile,
  ]);

  useEffect(() => {
    if (jsPaintInstance && url) {
      readFile(url).then((buffer) => {
        // eslint-disable-next-line prefer-destructuring
        const onunhandledrejection = jsPaintInstance.onunhandledrejection;

        jsPaintInstance.onunhandledrejection = (error) => {
          onunhandledrejection?.(error);

          if (
            error?.reason?.message ===
            "either options.data or options.file or options.filePath must be passed"
          ) {
            prependFileToTitle("Untitled");
          }
        };
        jsPaintInstance.open_from_file(
          new File([buffer as BlobPart], url),
          url
        );
        prependFileToTitle(basename(url));
      });
    }
  }, [jsPaintInstance, prependFileToTitle, readFile, url]);

  return (
    <StyledPaint $loaded={Boolean(jsPaintInstance)}>
      {!jsPaintInstance && !loadError && (
        <StyledLoading className="loading" />
      )}
      {loadError && (
        <div className="paint-fallback" role="alert">
          <strong>Paint could not start.</strong>
          <span>Try reopening Paint or use the standalone editor.</span>
          <a
            href="https://jspaint.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open JS Paint in a new tab
          </a>
        </div>
      )}
      {paintSrc && (
        <iframe
          ref={iframeRef}
          // Busy on the content only, never on an ancestor of the
          // role="status" loader or its announcement may be withheld
          aria-busy={!loaded || undefined}
          height="100%"
          id={`jspaint-${id}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoadError(true)}
          src={encodeURI(paintSrc)}
          title={windowTitle}
          width="100%"
          {...IFRAME_CONFIG}
        />
      )}
    </StyledPaint>
  );
};

export default Paint;
