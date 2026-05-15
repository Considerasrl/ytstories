"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/|live\/)?([\w-]{11})(\S+)?$/;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const THUMB_WIDTH = 960;
const THUMB_HEIGHT = 540;
const TITLE_MAX_LEN = 70;

type AlertKind = "info" | "warning" | "error";
type AlertState = {
  kind: AlertKind;
  title: string;
  body: React.ReactNode;
} | null;

function valueToHex(c: number): string {
  return c.toString(16);
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + valueToHex(r) + valueToHex(g) + valueToHex(b);
}

// Sample the image to compute an average colour (used for the blurred backdrop tint).
// Returns null if reading pixel data fails (e.g. tainted canvas).
function getAverageRGB(
  imgEl: HTMLImageElement,
): { fill: string; hex: string } | null {
  const blockSize = 5;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  const width = (canvas.width =
    imgEl.naturalWidth || imgEl.width);
  const height = (canvas.height =
    imgEl.naturalHeight || imgEl.height);
  context.drawImage(imgEl, 0, 0);

  let data: ImageData;
  try {
    data = context.getImageData(0, 0, width, height);
  } catch {
    return null;
  }

  let i = -4;
  let count = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  const length = data.data.length;
  while ((i += blockSize * 4) < length) {
    count++;
    r += data.data[i];
    g += data.data[i + 1];
    b += data.data[i + 2];
  }
  r = ~~(r / count - 16);
  g = ~~(g / count - 16);
  b = ~~(b / count - 16);
  return { fill: `rgb(${r}, ${g}, ${b})`, hex: rgbToHex(r, g, b) };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): [string, number, number][] {
  const words = text.split(" ");
  let line = "";
  let testLine = "";
  const lines: [string, number, number][] = [];
  for (let n = 0; n < words.length; n++) {
    testLine += `${words[n]} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push([line, x, y]);
      y += lineHeight;
      line = `${words[n]} `;
      testLine = `${words[n]} `;
    } else {
      line += `${words[n]} `;
    }
    if (n === words.length - 1) {
      lines.push([line, x, y]);
    }
  }
  return lines;
}

function extractVideoId(link: string): string | null {
  const m = link.match(YT_REGEX);
  return m ? m[5] : null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function fetchTitle(url: string): Promise<string> {
  const res = await fetch(`/api/title?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Could not fetch video title");
  const data = (await res.json()) as { title?: string };
  let title = data.title ?? "";
  if (title.length > TITLE_MAX_LEN) {
    title = title.substring(0, TITLE_MAX_LEN) + "...";
  }
  return title;
}

function drawStory(opts: {
  canvas: HTMLCanvasElement;
  thumb: HTMLImageElement;
  play: HTMLImageElement;
  title: string;
  darkMode: boolean;
}): boolean {
  const { canvas, thumb, play, title, darkMode } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const thumbLeft = canvas.width / 2 - THUMB_WIDTH / 2;
  const thumbTop = canvas.height / 2 - THUMB_HEIGHT * 0.75;

  ctx.font = "60px YouTube Sans";

  const avg = getAverageRGB(thumb);
  if (!avg) return false;
  ctx.fillStyle = avg.fill;

  // Blurred backdrop: stretch the thumbnail to fill the vertical canvas, blurred and darkened.
  ctx.filter = "blur(16px)";
  ctx.drawImage(thumb, -(3413 / 2 - 540), 0, 3413, 1920);
  ctx.filter = "blur(0px)";
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  // Card behind the thumbnail + title.
  ctx.fillStyle = darkMode ? "#242424" : "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(thumbLeft - 12, thumbTop - 12, THUMB_WIDTH + 24, THUMB_HEIGHT + 246, 24);
  ctx.fill();

  // Thumbnail.
  ctx.drawImage(thumb, thumbLeft, thumbTop, THUMB_WIDTH, THUMB_HEIGHT);

  // Play icon centred over the thumbnail.
  const playDim = 0.08;
  ctx.drawImage(
    play,
    thumbLeft + THUMB_WIDTH / 2 - (play.width * playDim) / 2,
    thumbTop + THUMB_HEIGHT / 2 - (play.height * playDim) / 2,
    play.width * playDim,
    play.height * playDim,
  );

  // Title text under the thumbnail.
  ctx.fillStyle = darkMode ? "#FFFFFF" : "#242424";
  const lines = wrapText(
    ctx,
    title,
    thumbLeft + 12,
    thumbTop + THUMB_HEIGHT + 68,
    THUMB_WIDTH - 12,
    70,
  );
  for (const [text, x, y] of lines) {
    ctx.fillText(text, x, y);
  }

  return true;
}

export default function Page() {
  const [link, setLink] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>(null);
  const [year, setYear] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const showAlert = useCallback(
    (kind: AlertKind, title: string, body: React.ReactNode) =>
      setAlert({ kind, title, body }),
    [],
  );

  const handleGenerate = useCallback(async () => {
    const trimmed = link.trim();
    if (!trimmed) {
      showAlert(
        "warning",
        "Uh-oh!",
        "Before generating an image, you should enter a YouTube video link first.",
      );
      return;
    }
    const videoId = extractVideoId(trimmed);
    if (!videoId) {
      showAlert(
        "warning",
        "Hmm…",
        "That doesn't look like a valid YouTube link. Please double-check and try again.",
      );
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setGenerating(true);
    try {
      const [title, thumb, play] = await Promise.all([
        fetchTitle(trimmed),
        loadImage(`/api/img?v=${videoId}`),
        loadImage("/play.png"),
      ]);

      const ok = drawStory({ canvas, thumb, play, title, darkMode });
      if (!ok) {
        showAlert(
          "error",
          "Ouch!",
          "Something wrong happened while reading the thumbnail. Try again later.",
        );
        return;
      }
      setOutputUrl(canvas.toDataURL("image/jpeg", 1.0));
    } catch (err) {
      showAlert(
        "error",
        "Ouch!",
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  }, [link, darkMode, showAlert]);

  const handleReset = useCallback(() => {
    setOutputUrl(null);
    setLink("");
  }, []);

  const handleInfo = useCallback(() => {
    showAlert(
      "info",
      "How to use",
      <>
        Using our image generating tool is <b>very simple</b>.
        <br />
        <br />
        All you need to do is paste the link of the YouTube video that you want
        to share on Instagram.
        <br />
        <br />
        Example of valid URLs:
        <br />
        <br />
        <pre>
          https://www.youtube.com/watch?v=dQw4w9WgXcQ
          {"\n"}https://youtu.be/dQw4w9WgXcQ
        </pre>
      </>,
    );
  }, [showAlert]);

  return (
    <>
      <main>
        <div className="input-section">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo-YTStories-Bianco.svg"
            id="logo-svg"
            alt="YTStories logo"
          />

          {outputUrl ? (
            <div id="image-result">
              <p>Your image is ready: download or share it on Instagram.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                id="image-preview"
                width="80%"
                style={{ border: "2px solid black" }}
                src={outputUrl}
                alt="Generated Instagram story"
              />
              <div className="btn-row">
                <a
                  className="btn btn-primary mt-2"
                  style={{ marginRight: 12 }}
                  href={outputUrl}
                  download="ytshare.jpg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    fill="currentColor"
                    className="bi bi-download"
                    viewBox="0 0 16 16"
                  >
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                  </svg>{" "}
                  Download
                </a>
                <button
                  type="button"
                  className="btn btn-primary mt-2"
                  onClick={handleReset}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    fill="currentColor"
                    className="bi bi-arrow-clockwise"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
                    />
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
                  </svg>{" "}
                  Generate a new image
                </button>
              </div>
            </div>
          ) : (
            <div id="user-input">
              <label htmlFor="yt-link">Share YouTube Videos on Instagram</label>
              <input
                className="form-control"
                type="text"
                id="yt-link"
                placeholder="Paste the YouTube link here"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={generating}
              />
              <div className="mt-2 form-check form-switch">
                <label htmlFor="dark-switch">Dark mode? </label>
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="dark-switch"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  disabled={generating}
                />
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  style={{ marginRight: 12 }}
                  id="generate-btn"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? "Generating…" : "Generate IG story image"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-light mt-3"
                  id="info-button"
                  onClick={handleInfo}
                  disabled={generating}
                >
                  Need help?
                </button>
              </div>
            </div>
          )}
        </div>

        <footer>
          Copyright © {year ?? ""} -{" "}
          <a href="https://www.considera.it">Considera srl</a>
        </footer>
      </main>

      <canvas
        ref={canvasRef}
        width={STORY_WIDTH}
        height={STORY_HEIGHT}
        style={{ display: "none" }}
      />

      {alert && (
        <div
          className="alert-overlay"
          role="dialog"
          onClick={() => setAlert(null)}
        >
          <div className="alert-box" onClick={(e) => e.stopPropagation()}>
            <h3>{alert.title}</h3>
            <div>{alert.body}</div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAlert(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
