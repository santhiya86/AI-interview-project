import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../utils/api";

const QUESTION_TIME = 3 * 60;

export default function InterviewScreen({ config, interviewId, onComplete, onExit }) {
  const { type, subject, difficulty, inputMode, questions } = config;
  const [qIdx,        setQIdx]        = useState(0);
  const [textAnswer,  setTextAnswer]  = useState("");
  const [recording,   setRecording]   = useState(false);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(QUESTION_TIME);
  const [currentMode, setCurrentMode] = useState(inputMode === "hybrid" ? "text" : inputMode);
  const [submitting,  setSubmitting]  = useState(false);
  const [voiceNote,   setVoiceNote]   = useState("");
  const [liveText,    setLiveText]    = useState(""); // live transcript display
  const [completing,  setCompleting]  = useState(false);
  const [chatOpen,    setChatOpen]    = useState(true);
  const [chatMsgs,    setChatMsgs]    = useState([
    { role: "bot", content: "Hi! I am your AI interview coach. Ask me anything about your answer." }
  ]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);
  const startTimeRef   = useRef(Date.now());
  const finalTranscriptRef = useRef(""); // accumulates full transcript across recognition restarts

  const question = questions[qIdx];
  const isLast   = qIdx === questions.length - 1;
  const progress  = Math.round((qIdx / questions.length) * 100);

  // ── Speech Recognition setup ────────────────────────────────────────────
  const SpeechRecognition = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  const speechSupported = !!SpeechRecognition;

  // ── Complete interview ──────────────────────────────────────────────────
  const completeInterview = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const data = await api(`/interview/${interviewId}/complete`, { method: "POST" });
      onComplete({ report: data.report, answers: data.answers, config });
    } catch (err) {
      console.error("Complete failed:", err.message);
      onExit();
    }
  }, [completing, interviewId, onComplete, config, onExit]);

  // ── Move to next question ───────────────────────────────────────────────
  const goNext = useCallback(() => {
    setTextAnswer("");
    setVoiceNote("");
    setLiveText("");
    finalTranscriptRef.current = "";
    if (qIdx < questions.length - 1) {
      setQIdx(q => q + 1);
    } else {
      completeInterview();
    }
  }, [qIdx, questions.length, completeInterview]);

  // ── Timer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeLeft(QUESTION_TIME);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (currentMode === "text") {
            const ans = textAnswer || "";
            api(`/interview/${interviewId}/answer/text`, {
              method: "POST",
              body: JSON.stringify({ questionIndex: qIdx, answer: ans || "(time expired)", timeTakenSec: QUESTION_TIME })
            }).then(goNext).catch(goNext);
          } else {
            goNext();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx]);

  const stopTimer = () => clearInterval(timerRef.current);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const timerClass = timeLeft > 60 ? "" : timeLeft > 30 ? " warning" : " danger";

  // ── Submit text answer ──────────────────────────────────────────────────
  const submitText = async () => {
    if (submitting) return;
    stopTimer();
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await api(`/interview/${interviewId}/answer/text`, {
        method: "POST",
        body: JSON.stringify({
          questionIndex: qIdx,
          answer: textAnswer.trim() || "(no answer)",
          timeTakenSec: timeTaken
        })
      });
    } catch (err) {
      console.error("Save text answer failed:", err.message);
    } finally {
      setSubmitting(false);
      goNext();
    }
  };

  // ── Voice: use Web Speech API (browser-native, works on HTTPS, no server needed) ──
  const startRecording = () => {
    setVoiceNote("");
    setLiveText("");
    finalTranscriptRef.current = "";

    if (!speechSupported) {
      setVoiceNote("Speech recognition is not supported in your browser. Please use Chrome or Edge, or switch to Text mode.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalPart = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalPart += t + " ";
        } else {
          interim += t;
        }
      }

      if (finalPart) {
        finalTranscriptRef.current += finalPart;
      }
      // Show live text to user
      setLiveText((finalTranscriptRef.current + interim).trim());
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      if (event.error === "not-allowed") {
        setVoiceNote("Microphone access denied. Please click the microphone icon in your browser address bar and allow access, then try again.");
      } else if (event.error === "network") {
        setVoiceNote("Network error with speech recognition. Please check your internet connection.");
      } else if (event.error !== "aborted") {
        setVoiceNote("Speech recognition error: " + event.error + ". Try Text mode instead.");
      }
      setRecording(false);
    };

    recognition.onend = () => {
      // Only update recording state — don't auto-submit here
      // User clicks Stop to submit
      if (recognitionRef.current === recognition) {
        setRecording(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      setVoiceNote("Could not start speech recognition: " + err.message);
    }
  };

  const stopRecording = async () => {
    // Stop the recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
    setAnalyzing(true);
    stopTimer();

    const transcript = finalTranscriptRef.current.trim() || liveText.trim();

    if (!transcript) {
      setVoiceNote("No speech detected. Please try again or switch to Text mode.");
      setAnalyzing(false);
      return;
    }

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      await api(`/interview/${interviewId}/answer/voice`, {
        method: "POST",
        body: JSON.stringify({
          questionIndex: qIdx,
          transcript,
          timeTakenSec: timeTaken,
          speechMetricsData: null
        })
      });
    } catch (err) {
      console.error("Save voice answer failed:", err.message);
      setVoiceNote("Answer saved without AI scoring. Continuing...");
    } finally {
      setAnalyzing(false);
      setTimeout(goNext, voiceNote ? 1500 : 300);
    }
  };

  // ── Chatbot ─────────────────────────────────────────────────────────────
  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatMsgs(m => [...m, { role: "user", content: msg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const data = await api(`/interview/${interviewId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          question,
          answer: currentMode === "text" ? textAnswer : liveText,
          userMessage: msg,
          history: chatMsgs.slice(-6)
        })
      });
      setChatMsgs(m => [...m, {
        role: "bot",
        content: data.reply + (data.tip ? "\n\n💡 " + data.tip : "")
      }]);
      if (data.improvedAnswer && currentMode === "text") setTextAnswer(data.improvedAnswer);
    } catch {
      setChatMsgs(m => [...m, { role: "bot", content: "AI coach unavailable right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (completing) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
          <div style={{ fontSize:18, fontWeight:600, color:"var(--text)" }}>Generating your performance report...</div>
          <div style={{ fontSize:14, color:"var(--muted)", marginTop:8 }}>AI is analyzing all your answers</div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-layout">
      <div className="interview-main">

        {/* Header */}
        <div className="interview-header">
          <div>
            <div className="title">
              {type}{subject ? ` — ${subject}` : ""}{difficulty ? ` (${difficulty})` : ""}
            </div>
            <div className="meta">Q{qIdx + 1} of {questions.length} · {inputMode} mode</div>
          </div>
          <div className="flex gap-2">
            {inputMode === "hybrid" && (
              <select
                value={currentMode}
                onChange={e => setCurrentMode(e.target.value)}
                style={{ background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", padding:"6px 10px", borderRadius:8, fontSize:13 }}
              >
                <option value="text">⌨ Text</option>
                <option value="voice">🎙 Voice</option>
              </select>
            )}
            <span className={"timer-badge" + timerClass}>{fmt(timeLeft)}</span>
            <button
              className="btn btn-outline"
              style={{ padding:"6px 14px", fontSize:13 }}
              onClick={() => { stopTimer(); onExit(); }}
            >
              Exit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-fill" style={{ width: progress + "%" }} />
        </div>

        {/* Question area */}
        <div className="question-area">
          <div className="q-counter">Question {qIdx + 1} of {questions.length}</div>
          <div className="q-text">{question}</div>

          {voiceNote && (
            <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, padding:"8px 12px", fontSize:13, color:"var(--yellow)", marginBottom:16 }}>
              {voiceNote}
            </div>
          )}

          {/* TEXT mode */}
          {currentMode === "text" && (
            <div className="answer-text">
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={7}
              />
            </div>
          )}

          {/* VOICE mode — uses browser Web Speech API */}
          {currentMode === "voice" && (
            <div className="voice-recorder">
              {!speechSupported && (
                <div style={{ color:"var(--yellow)", fontSize:13, marginBottom:16 }}>
                  ⚠ Your browser does not support speech recognition. Please use Chrome or Edge, or switch to Text mode.
                </div>
              )}

              <button
                className={"record-btn" + (recording ? " recording" : analyzing ? " analyzing" : "")}
                onClick={recording ? stopRecording : analyzing ? undefined : startRecording}
                disabled={analyzing || !speechSupported}
              >
                {analyzing ? "⏳" : recording ? "⏹" : "🎙"}
              </button>

              <div className="voice-status">
                {analyzing ? "Saving your answer..." :
                 recording ? "Listening... Click ⏹ to stop and submit" :
                 "Click 🎙 to start speaking your answer"}
              </div>

              {/* Live transcript display */}
              {(recording || liveText) && (
                <div style={{
                  marginTop: 16, background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:10, padding:"12px 14px", fontSize:14, color:"var(--text)",
                  minHeight:60, textAlign:"left", lineHeight:1.6
                }}>
                  {liveText || <span style={{ color:"var(--muted)" }}>Listening...</span>}
                </div>
              )}

              {recording && (
                <div style={{ marginTop:12, color:"var(--red)", fontSize:13, fontWeight:600 }}>
                  ● Recording in progress
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="interview-footer">
          <button
            className="btn-skip"
            disabled={submitting || analyzing || recording}
            onClick={() => { stopTimer(); goNext(); }}
          >
            Skip
          </button>
          {currentMode === "text" && (
            <button
              className="btn-next"
              onClick={submitText}
              disabled={!textAnswer.trim() || submitting}
            >
              {submitting ? "Saving..." : isLast ? "Finish ✓" : "Next →"}
            </button>
          )}
        </div>
      </div>

      {/* AI Chatbot panel */}
      {chatOpen && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            🤖 AI Coach
            <button
              onClick={() => setChatOpen(false)}
              style={{ float:"right", background:"none", color:"var(--muted)", fontSize:18, border:"none", cursor:"pointer" }}
            >
              ✕
            </button>
          </div>
          <div className="chatbot-messages">
            {chatMsgs.map((m, i) => (
              <div key={i} className={"chat-msg " + m.role} style={{ whiteSpace:"pre-wrap" }}>
                {m.content}
              </div>
            ))}
            {chatLoading && <div className="chat-msg bot">Thinking...</div>}
          </div>
          <div className="chatbot-input">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask for help..."
              onKeyDown={e => e.key === "Enter" && sendChat()}
            />
            <button onClick={sendChat} disabled={chatLoading}>→</button>
          </div>
        </div>
      )}

      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position:"fixed", bottom:24, right:24, width:52, height:52,
            borderRadius:"50%", background:"var(--accent)", color:"white",
            fontSize:24, border:"none", cursor:"pointer",
            boxShadow:"0 4px 20px rgba(99,102,241,0.5)", zIndex:100
          }}
        >
          🤖
        </button>
      )}
    </div>
  );
}
