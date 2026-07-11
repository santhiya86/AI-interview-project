import os
import tempfile
from flask import Flask, request, jsonify

app = Flask(__name__)

MODEL_SIZE   = os.environ.get("WHISPER_MODEL_SIZE", "base")
DEVICE       = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

print(f"Loading Whisper model '{MODEL_SIZE}' on {DEVICE} ({COMPUTE_TYPE})...")
from faster_whisper import WhisperModel
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Whisper model loaded and ready.")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE, "device": DEVICE})

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file (field name must be 'audio')"}), 400

    audio_file = request.files["audio"]

    # Save to temp file
    suffix = os.path.splitext(audio_file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        segments_iter, info = model.transcribe(
            tmp_path,
            word_timestamps=True,
            vad_filter=True,
            language=None  # auto-detect language
        )

        segments = []
        all_text = []

        for seg in segments_iter:
            words = []
            for w in (seg.words or []):
                words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 2),
                    "end": round(w.end, 2)
                })
            segments.append({
                "start": round(seg.start, 2),
                "end":   round(seg.end, 2),
                "text":  seg.text.strip(),
                "words": words
            })
            all_text.append(seg.text.strip())

        return jsonify({
            "text":      " ".join(all_text).strip(),
            "segments":  segments,
            "duration":  round(info.duration, 2),
            "language":  info.language
        })

    except Exception as e:
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
    finally:
        try: os.unlink(tmp_path)
        except: pass

if __name__ == "__main__":
    port = int(os.environ.get("WHISPER_PORT", 6000))
    app.run(host="0.0.0.0", port=port, debug=False)
